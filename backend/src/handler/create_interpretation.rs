use crate::entity::interpretation::{CreateInterpretationRequest, CreateInterpretationResponse};
use crate::entity::reading::Reading;
use crate::middleware::user::User;
use crate::repository::interpretation_repository::InterpretationRepository;
use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;

#[tracing::instrument(skip(user), fields(user_id = %user.id.to_string()))]
pub async fn create_interpretation(
    State(interpretation_manager): State<InterpretationRepository>,
    user: User,
    Json(create_interpretation_request): Json<CreateInterpretationRequest>,
) -> (StatusCode, Json<CreateInterpretationResponse>) {
    let reading: Reading = (create_interpretation_request, &user).into();
    interpretation_manager.request_interpretation(reading.clone());
    (StatusCode::OK, Json(reading.id.into()))
}
