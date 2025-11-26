use crate::entity;
use crate::entity::stats::calculate_stats;
use crate::repository::interpretation_repository::InterpretationRepository;
use axum::Json;
use axum::extract::State;

#[tracing::instrument]
pub async fn get_stats(
    State(interpretation_manager): State<InterpretationRepository>,
) -> Json<entity::stats::Stats> {
    let interpretations = interpretation_manager.get_all_interpretations().await;
    let readings = interpretations
        .into_iter()
        .map(|r| r.into_reading())
        .collect::<Vec<_>>();
    let stats = calculate_stats(&readings);
    Json(stats)
}
