use crate::entity::interpretation::{CreateInterpretationRequest, CreateInterpretationResponse};
use crate::entity::reading::Reading;
use crate::entity::user::User;
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
) -> (StatusCode, Json<CreateInterpretationResponse>) {
    let reading: Reading = (create_interpretation_request, &user).into();
    interpretation_repository.request_interpretation(reading.clone(), locale, user);
    (StatusCode::OK, Json(reading.id.into()))
}
