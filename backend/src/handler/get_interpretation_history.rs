use crate::entity::interpretation::Interpretation;
use crate::middleware::user::User;
use crate::repository::interpretation_repository::InterpretationRepository;
use axum::Json;

#[tracing::instrument(skip(user), fields(user_id = %user.id.to_string()))]
pub async fn get_interpretation_history(
    interpretation_repository: InterpretationRepository,
    user: User,
) -> Json<Vec<Interpretation>> {
    Json(
        interpretation_repository
            .get_history_for_user(user.id)
            .await,
    )
}
