use crate::entity;
use crate::entity::reading::{CreateReadingRequest, CreateReadingResponse};
use crate::entity::user::User;
use crate::middleware::locale::Locale;
use crate::repository::interpretation_repository::InterpretationRepository;
use axum::Json;
use axum::http::StatusCode;

#[tracing::instrument(skip(user), fields(user_id = %user.id().to_string()))]
pub async fn create_reading(
    interpretation_repository: InterpretationRepository,
    user: User,
    locale: Locale,
    Json(create_reading_request): Json<CreateReadingRequest>,
) -> (StatusCode, Json<CreateReadingResponse>) {
    let reading = entity::reading::perform_reading(&create_reading_request, &user);
    interpretation_repository
        .request_interpretation(reading.clone(), locale, user)
        .await;
    (StatusCode::OK, Json(CreateReadingResponse::from(reading)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::app::create_test_app;
    use crate::entity::interpretation::Interpretation;
    use crate::model;
    use axum::body::Body;
    use axum::extract::Request;
    use diesel::pg::Pg;
    use diesel::{ExpressionMethods, OptionalExtension, QueryDsl, SelectableHelper};
    use diesel_async::RunQueryDsl;
    use mockito::{Matcher, Server};
    use serde_json::json;
    use serial_test::serial;
    use tower::ServiceExt;
    use uuid::Uuid;

    #[tokio::test]
    #[serial]
    async fn test_create_reading_basic() {
        let (state, app) = create_test_app().await;
        let mut conn = state.postgresql_pool.get().await.unwrap();

        let request = CreateReadingRequest {
            question: "test question".to_string(),
            cards: 3,
        };

        let uuid = Uuid::new_v4();

        let request = Request::builder()
            .method("POST")
            .uri("/api/v1/reading")
            .header("Content-Type", "application/json")
            .header("x-user-uuid", uuid.to_string())
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
        let response: CreateReadingResponse = serde_json::from_slice(&body).unwrap();

        // Fetch stored reading for this user
        let query = crate::schema::readings::dsl::readings
            .filter(crate::schema::readings::dsl::user_id.eq(uuid))
            .select(model::Reading::as_select());

        // Helpful when debugging locally
        println!("{}", diesel::debug_query::<Pg, _>(&query));

        let reading = query.first(&mut conn).await.optional().unwrap();
        assert!(reading.is_some(), "Expected a reading to be persisted");
        let reading = reading.unwrap();

        // interpretation_id returned from API is the reading id
        assert_eq!(reading.id.to_string(), response.interpretation_id);
        assert_eq!(reading.question, "test question".to_string());
        assert_eq!(reading.user_id, uuid);

        // Assert we persisted exactly as many cards as requested
        let persisted_cards: Vec<webtarot_shared::model::Card> = reading.cards.into();
        assert_eq!(persisted_cards.len() as u8, 3);

        // Assert we actually shuffled at least once
        assert!(reading.shuffled_times > 0, "shuffled_times should be > 0");
    }

    #[tokio::test]
    #[serial]
    async fn test_create_reading_broadcast_and_mocked_interpretation() {
        let (state, app) = create_test_app().await;

        // Setup a dedicated mock server for the OpenAI API
        let mut server = Server::new_async().await;
        let base_url = server.url();
        unsafe {
            std::env::set_var("OPENAI_BASE_URL", &base_url);
        }

        let mocked_text = "This is a mocked reading interpretation";
        let _m = server
            .mock("POST", "/v1/chat/completions")
            .match_header("authorization", Matcher::Regex("(?i)^Bearer .+".into()))
            .match_body(Matcher::PartialJson(json!({"model": "gpt-5.1"})))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(
                json!({
                    "choices": [
                        {"message": {"content": mocked_text}}
                    ]
                })
                .to_string(),
            )
            .create();

        // Subscribe to broadcast BEFORE triggering the request to avoid races
        let repo = InterpretationRepository::from(state.clone());
        let mut rx = repo.subscribe();

        let request = CreateReadingRequest {
            question: "test broadcast question".to_string(),
            cards: 3,
        };

        let uuid = Uuid::new_v4();

        let request = Request::builder()
            .method("POST")
            .uri("/api/v1/reading")
            .header("Content-Type", "application/json")
            .header("x-user-uuid", uuid.to_string())
            .body(Body::from(serde_json::to_string(&request).unwrap()))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let response: CreateReadingResponse = serde_json::from_slice(&body).unwrap();
        let interpretation_id = Uuid::parse_str(&response.interpretation_id).unwrap();

        // Wait for the async interpretation to complete and be broadcast
        use tokio::time::{Duration, timeout};
        let mut received_done = None;
        let deadline = Duration::from_secs(5);
        for _ in 0..5 {
            if let Ok(Ok(evt)) = timeout(deadline, rx.recv()).await {
                match evt {
                    Interpretation::Done(reading, text) if reading.id == interpretation_id => {
                        received_done = Some((reading, text));
                        break;
                    }
                    Interpretation::Failed(reading, err) if reading.id == interpretation_id => {
                        panic!("Interpretation failed unexpectedly: {}", err);
                    }
                    _ => {
                        // Event for another reading, keep waiting
                    }
                }
            }
        }

        let (reading, text) = received_done.expect("Should receive Done event for our reading");
        assert_eq!(text, mocked_text);

        // Validate response payload echoes reading basics
        assert_eq!(reading.id.to_string(), response.interpretation_id);
        assert_eq!(reading.question, "test broadcast question");
        assert_eq!(reading.cards.len() as u8, 3);
        assert!(reading.shuffled_times > 0, "shuffled_times should be > 0");
    }
}
