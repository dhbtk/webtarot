use crate::entity::interpretation::{CreateInterpretationRequest, CreateInterpretationResponse};
use crate::entity::reading::Reading;
use crate::entity::user::User;
use crate::error::ResponseResult;
use crate::middleware::locale::Locale;
use crate::repository::interpretation_repository::InterpretationRepository;
use axum::Json;
use axum::http::StatusCode;

#[tracing::instrument(skip(user), fields(user_id = %user.id().to_string()))]
pub async fn create_interpretation(
    interpretation_repository: InterpretationRepository,
    user: User,
    locale: Locale,
    Json(create_interpretation_request): Json<CreateInterpretationRequest>,
) -> (
    StatusCode,
    ResponseResult<Json<CreateInterpretationResponse>>,
) {
    let reading: Reading = (create_interpretation_request, &user).into();
    interpretation_repository
        .request_interpretation(reading.clone(), locale, user)
        .await;
    (StatusCode::OK, Ok(Json(reading.id.into())))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::app::create_test_app;
    use diesel::ExpressionMethods;

    use crate::model;
    // test helpers
    use crate::test_helpers::{setup_mock_openai, subscribe_to_repo, wait_for_done};
    use axum::body::Body;
    use axum::extract::Request;
    use diesel::pg::Pg;
    use diesel::{OptionalExtension, QueryDsl, SelectableHelper};
    use diesel_async::RunQueryDsl;
    use serial_test::serial;
    use tower::ServiceExt;
    use uuid::Uuid;
    use webtarot_shared::model::MajorArcana::Fool;
    use webtarot_shared::model::{Arcana, Card};

    #[tokio::test]
    #[serial]
    async fn test_create_interpretation_anon_user() {
        let (state, app) = create_test_app().await;
        let mut conn = state.postgresql_pool.get().await.unwrap();

        let request = CreateInterpretationRequest {
            question: "test question".to_string(),
            cards: vec![
                Card {
                    arcana: Arcana::Major { name: Fool },
                    flipped: false,
                },
                Card {
                    arcana: Arcana::Minor {
                        rank: webtarot_shared::model::Rank::Ace,
                        suit: webtarot_shared::model::Suit::Cups,
                    },
                    flipped: false,
                },
            ],
            context: "".to_string(),
        };

        let uuid = Uuid::new_v4();

        let request = Request::builder()
            .method("POST")
            .uri("/api/v1/interpretation".to_string())
            .header("Content-Type", "application/json")
            .header("x-user-uuid", uuid.to_string().as_str())
            .body(Body::from(serde_json::to_string(&request).unwrap()))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();

        assert_eq!(
            response.status(),
            StatusCode::OK,
            "Expected status code 200, got {}",
            response.status()
        );

        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let response: CreateInterpretationResponse = serde_json::from_slice(&body).unwrap();

        println!("uuid: {}", response.interpretation_id);

        let query = crate::schema::readings::dsl::readings
            .filter(crate::schema::readings::dsl::user_id.eq(uuid))
            .select(model::Reading::as_select());

        println!("{}", diesel::debug_query::<Pg, _>(&query));

        let reading = query.first(&mut conn).await.optional().unwrap();
        assert!(reading.is_some());
        let reading = reading.unwrap();
        assert_eq!(reading.id, response.interpretation_id);
        assert_eq!(reading.user_id, uuid);
        assert_eq!(reading.question, "test question".to_string());
    }

    #[tokio::test]
    #[serial]
    async fn test_create_interpretation_broadcast_and_mocked_interpretation() {
        let (state, app) = create_test_app().await;

        // Setup mock OpenAI and subscribe to repository broadcast
        let (_server, mocked_text) = setup_mock_openai("This is a mocked interpretation").await;
        let mut rx = subscribe_to_repo(&state);

        // Build a request with explicit cards
        let request = CreateInterpretationRequest {
            question: "mock broadcast question".to_string(),
            cards: vec![
                Card {
                    arcana: Arcana::Major { name: Fool },
                    flipped: false,
                },
                Card {
                    arcana: Arcana::Minor {
                        rank: webtarot_shared::model::Rank::Two,
                        suit: webtarot_shared::model::Suit::Wands,
                    },
                    flipped: true,
                },
            ],
            context: "".to_string(),
        };

        let uuid = Uuid::new_v4();

        let request = Request::builder()
            .method("POST")
            .uri("/api/v1/interpretation")
            .header("Content-Type", "application/json")
            .header("x-user-uuid", uuid.to_string())
            .body(Body::from(serde_json::to_string(&request).unwrap()))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let response: CreateInterpretationResponse = serde_json::from_slice(&body).unwrap();
        let interpretation_id = response.interpretation_id;

        // Wait for interpretation to complete via broadcast
        let (reading, text) = wait_for_done(&mut rx, interpretation_id, 5)
            .await
            .expect("Should receive Done event for our interpretation");

        assert_eq!(text, mocked_text);
        assert_eq!(reading.id, response.interpretation_id);
        assert_eq!(reading.question, "mock broadcast question");
        assert_eq!(reading.cards.len(), 2);
    }
}
