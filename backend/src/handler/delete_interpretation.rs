use crate::middleware::user::User;
use crate::repository::interpretation_repository::InterpretationRepository;
use axum::extract::Path;
use axum::http::StatusCode;
use uuid::Uuid;

#[tracing::instrument(skip(user), fields(user_id = %user.id.to_string()))]
pub async fn delete_interpretation(
    interpretation_repository: InterpretationRepository,
    user: User,
    Path(interpretation_id): Path<String>,
) -> StatusCode {
    let Ok(interpretation_id) = interpretation_id.parse::<Uuid>() else {
        return StatusCode::BAD_REQUEST;
    };
    let Some(_) = interpretation_repository
        .delete_interpretation(interpretation_id, user.id)
        .await
    else {
        return StatusCode::BAD_REQUEST;
    };
    StatusCode::NO_CONTENT
}
