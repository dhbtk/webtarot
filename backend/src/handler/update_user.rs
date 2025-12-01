use crate::entity::user::{UpdateUserRequest, User};
use crate::error::{AppError, ResponseResult};
use crate::repository::user_repository::UserRepository;
use axum::Json;
use axum::http::StatusCode;

#[axum::debug_handler(state = crate::state::AppState)]
pub async fn update_user(
    user: User,
    user_repository: UserRepository,
    Json(request): Json<UpdateUserRequest>,
) -> (StatusCode, ResponseResult<Json<User>>) {
    let id = user.id();
    let User::Authenticated { access_token, .. } = user else {
        return AppError::Forbidden.into_response();
    };
    match user_repository
        .update_user(id, access_token.id, request)
        .await
    {
        Err(e) => e.into_response(),
        Ok(user) => (StatusCode::OK, Ok(Json(user))),
    }
}
