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
    interpretation_repository.request_interpretation(reading.clone(), locale);
    (StatusCode::OK, Json(CreateReadingResponse::from(reading)))
}
