use crate::entity::user::{AuthenticationResponse, User};
use crate::error::{AppError, ResponseResult};
use crate::repository::interpretation_repository::InterpretationRepository;
use crate::repository::user_repository::UserRepository;
use axum::Json;
use axum::http::{HeaderMap, StatusCode};
use serde::Deserialize;

pub async fn log_in(
    user: User,
    user_repository: UserRepository,
    interpretation_repository: InterpretationRepository,
    headers: HeaderMap,
    Json(log_in_request): Json<LogInRequest>,
) -> (StatusCode, ResponseResult<Json<AuthenticationResponse>>) {
    if let User::Authenticated { .. } = user {
        return AppError::Forbidden.into_response();
    }
    let response = user_repository
        .log_in(&log_in_request.email, &log_in_request.password, &headers)
        .await;
    if let Err(err) = &response {
        tracing::error!(target: "log_in", "Failed to log in user: {:?}", err);
        return err.clone().into_response();
    }
    let response = response.unwrap();
    if let Err(e) = interpretation_repository
        .reassign_from_anon_to_user(user.id(), response.user.id())
        .await
    {
        tracing::error!(target: "log_in", "Failed to reassign interpretations from anon user to logged in user: {:?}", e);
        return e.into_response();
    }
    (StatusCode::OK, Ok(Json(response)))
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogInRequest {
    email: String,
    password: String,
}
