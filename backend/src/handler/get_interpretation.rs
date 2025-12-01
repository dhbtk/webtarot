use crate::entity::interpretation::{GetInterpretationResult, Interpretation};
use crate::entity::user::User;
use crate::repository::interpretation_repository::InterpretationRepository;
use axum::Json;
use axum::extract::Path;
use axum::http::StatusCode;

#[tracing::instrument(skip(user), fields(user_id = %user.id().to_string()))]
pub async fn get_interpretation(
    interpretation_repository: InterpretationRepository,
    user: User,
    Path(interpretation_id): Path<String>,
) -> (StatusCode, Json<GetInterpretationResult>) {
    let Ok(uuid) = interpretation_id.parse() else {
        return (
            StatusCode::NOT_FOUND,
            Json(GetInterpretationResult::default()),
        );
    };
    let Some(interpretation) = interpretation_repository.get_interpretation(uuid).await else {
        return (
            StatusCode::NOT_FOUND,
            Json(Option::<Interpretation>::None.into()),
        );
    };
    let Some(_) = interpretation.reading().user_id else {
        return (
            StatusCode::OK,
            Json(
                interpretation_repository
                    .assign_to_user(uuid, user.id())
                    .await
                    .into(),
            ),
        );
    };
    (StatusCode::OK, Json(interpretation.into()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::app::create_test_app;
    use axum::body::Body;
    use axum::extract::Request;
    use diesel::ExpressionMethods;
    use diesel::{QueryDsl, SelectableHelper};
    use diesel_async::RunQueryDsl;
    use serial_test::serial;
    use tower::ServiceExt;
    use uuid::Uuid;
    use webtarot_shared::model::MajorArcana::Fool;
    use webtarot_shared::model::{Arcana, Card};

    // Backend DB models
    use crate::model;

    // Small fixture helpers using Diesel models
    async fn insert_user_with_token(
        state: &crate::state::AppState,
    ) -> (model::User, model::NewAccessToken) {
        use chrono::Utc;
        let mut conn = state.postgresql_pool.get().await.unwrap();
        let user = model::User {
            id: Uuid::new_v4(),
            created_at: Utc::now().naive_utc(),
            updated_at: Utc::now().naive_utc(),
            email: format!("test-{}@example.com", Uuid::new_v4()),
            password_digest: "digest".to_string(),
            name: "Test User".to_string(),
            self_description: "desc".to_string(),
        };
        diesel::insert_into(crate::schema::users::table)
            .values(user.clone())
            .execute(&mut conn)
            .await
            .unwrap();

        let token = model::NewAccessToken {
            user_id: user.id,
            created_at: Utc::now().naive_utc(),
            token: format!("token-{}", Uuid::new_v4()),
            last_user_ip: "127.0.0.1".to_string(),
            last_user_agent: "test-suite".to_string(),
            deleted_at: None,
        };
        diesel::insert_into(crate::schema::access_tokens::table)
            .values(token.clone())
            .execute(&mut conn)
            .await
            .unwrap();
        (user, token)
    }

    async fn insert_reading(
        state: &crate::state::AppState,
        user_id: Option<Uuid>,
        status: model::InterpretationStatus,
        interpretation_text: &str,
        interpretation_error: &str,
    ) -> Uuid {
        use chrono::Utc;
        let mut conn = state.postgresql_pool.get().await.unwrap();
        let id = Uuid::new_v4();
        let cards = vec![Card {
            arcana: Arcana::Major { name: Fool },
            flipped: false,
        }];
        let reading = model::Reading {
            id,
            created_at: Utc::now().naive_utc(),
            question: "q?".to_string(),
            context: String::new(),
            cards: cards.into(),
            shuffled_times: 0,
            user_id: user_id.unwrap_or_else(Uuid::nil),
            user_name: String::new(),
            user_self_description: String::new(),
            interpretation_status: status,
            interpretation_text: interpretation_text.to_string(),
            interpretation_error: interpretation_error.to_string(),
            deleted_at: None,
        };
        diesel::insert_into(crate::schema::readings::table)
            .values(reading)
            .execute(&mut conn)
            .await
            .unwrap();
        id
    }

    // Anonymous user tests
    #[tokio::test]
    #[serial]
    async fn test_get_interpretation_anon_pending_assigns_user() {
        let (state, app) = create_test_app().await;
        let anon_id = Uuid::new_v4();
        let interp_id =
            insert_reading(&state, None, model::InterpretationStatus::Pending, "", "").await;

        let req = Request::builder()
            .method("GET")
            .uri(format!("/api/v1/interpretation/{}", interp_id))
            .header("x-user-uuid", anon_id.to_string())
            .body(Body::empty())
            .unwrap();
        let resp = app.oneshot(req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::OK);
        let body = axum::body::to_bytes(resp.into_body(), usize::MAX)
            .await
            .unwrap();
        let result: GetInterpretationResult = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.done, false);
        assert!(result.error.is_empty());
        assert!(result.reading.is_some());
        // After assignment, reading.user_id should be anon_id
        assert_eq!(result.reading.unwrap().user_id, Some(anon_id));
    }

    #[tokio::test]
    #[serial]
    async fn test_get_interpretation_anon_done_assigns_user() {
        let (state, app) = create_test_app().await;
        let anon_id = Uuid::new_v4();
        let expected_text = "done text";
        let interp_id = insert_reading(
            &state,
            None,
            model::InterpretationStatus::Done,
            expected_text,
            "",
        )
        .await;
        let req = Request::builder()
            .method("GET")
            .uri(format!("/api/v1/interpretation/{}", interp_id))
            .header("x-user-uuid", anon_id.to_string())
            .body(Body::empty())
            .unwrap();
        let resp = app.oneshot(req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::OK);
        let body = axum::body::to_bytes(resp.into_body(), usize::MAX)
            .await
            .unwrap();
        let result: GetInterpretationResult = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.done, true);
        assert_eq!(result.interpretation, expected_text);
        assert!(result.reading.is_some());
        assert_eq!(result.reading.unwrap().user_id, Some(anon_id));
    }

    #[tokio::test]
    #[serial]
    async fn test_get_interpretation_anon_failed_assigns_user() {
        let (state, app) = create_test_app().await;
        let anon_id = Uuid::new_v4();
        let expected_error = "oops";
        let interp_id = insert_reading(
            &state,
            None,
            model::InterpretationStatus::Failed,
            "",
            expected_error,
        )
        .await;
        let req = Request::builder()
            .method("GET")
            .uri(format!("/api/v1/interpretation/{}", interp_id))
            .header("x-user-uuid", anon_id.to_string())
            .body(Body::empty())
            .unwrap();
        let resp = app.oneshot(req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::OK);
        let body = axum::body::to_bytes(resp.into_body(), usize::MAX)
            .await
            .unwrap();
        let result: GetInterpretationResult = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.done, true);
        assert_eq!(result.error, expected_error);
        assert!(result.reading.is_some());
        assert_eq!(result.reading.unwrap().user_id, Some(anon_id));
    }

    // Registered user tests
    #[tokio::test]
    #[serial]
    async fn test_get_interpretation_registered_pending() {
        let (state, app) = create_test_app().await;
        let (user, token) = insert_user_with_token(&state).await;
        let interp_id = insert_reading(
            &state,
            Some(user.id),
            model::InterpretationStatus::Pending,
            "",
            "",
        )
        .await;
        let req = Request::builder()
            .method("GET")
            .uri(format!("/api/v1/interpretation/{}", interp_id))
            .header("authorization", format!("Bearer {}", token.token))
            .body(Body::empty())
            .unwrap();
        let resp = app.oneshot(req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::OK);
        let body = axum::body::to_bytes(resp.into_body(), usize::MAX)
            .await
            .unwrap();
        let result: GetInterpretationResult = serde_json::from_slice(&body).unwrap();
        assert!(!result.done);
        assert!(result.error.is_empty());
        assert_eq!(result.reading.unwrap().user_id, Some(user.id));
    }

    #[tokio::test]
    #[serial]
    async fn test_get_interpretation_registered_done() {
        let (state, app) = create_test_app().await;
        let (user, token) = insert_user_with_token(&state).await;
        let expected_text = "hello";
        let interp_id = insert_reading(
            &state,
            Some(user.id),
            model::InterpretationStatus::Done,
            expected_text,
            "",
        )
        .await;
        let req = Request::builder()
            .method("GET")
            .uri(format!("/api/v1/interpretation/{}", interp_id))
            .header("authorization", format!("Bearer {}", token.token))
            .body(Body::empty())
            .unwrap();
        let resp = app.oneshot(req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::OK);
        let body = axum::body::to_bytes(resp.into_body(), usize::MAX)
            .await
            .unwrap();
        let result: GetInterpretationResult = serde_json::from_slice(&body).unwrap();
        assert!(result.done);
        assert_eq!(result.interpretation, expected_text);
        assert_eq!(result.reading.unwrap().user_id, Some(user.id));
    }

    #[tokio::test]
    #[serial]
    async fn test_get_interpretation_registered_failed() {
        let (state, app) = create_test_app().await;
        let (user, token) = insert_user_with_token(&state).await;
        let expected_error = "bad";
        let interp_id = insert_reading(
            &state,
            Some(user.id),
            model::InterpretationStatus::Failed,
            "",
            expected_error,
        )
        .await;
        let req = Request::builder()
            .method("GET")
            .uri(format!("/api/v1/interpretation/{}", interp_id))
            .header("authorization", format!("Bearer {}", token.token))
            .body(Body::empty())
            .unwrap();
        let resp = app.oneshot(req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::OK);
        let body = axum::body::to_bytes(resp.into_body(), usize::MAX)
            .await
            .unwrap();
        let result: GetInterpretationResult = serde_json::from_slice(&body).unwrap();
        assert!(result.done);
        assert_eq!(result.error, expected_error);
        assert_eq!(result.reading.unwrap().user_id, Some(user.id));
    }
}
