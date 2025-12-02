use crate::entity::user::{AuthenticationResponse, CreateUserRequest, User};
use crate::error::{AppError, ResponseResult};
use crate::repository::user_repository::UserRepository;
use crate::state::AppState;
use axum::Json;
use axum::http::{HeaderMap, StatusCode};

#[axum::debug_handler(state = AppState)]
pub async fn create_user(
    user: User,
    user_repository: UserRepository,
    headers: HeaderMap,
    Json(request_body): Json<CreateUserRequest>,
) -> (StatusCode, ResponseResult<Json<AuthenticationResponse>>) {
    if let User::Authenticated { .. } = user {
        return AppError::Forbidden.into_response();
    }

    match user_repository
        .create_user(user.id(), request_body, headers)
        .await
    {
        Ok(response) => (StatusCode::CREATED, Ok(response.into())),
        Err(err) => err.into_response(),
    }
}
