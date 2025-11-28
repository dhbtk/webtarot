use crate::entity;
use crate::entity::stats::calculate_stats;
use crate::repository::interpretation_repository::InterpretationRepository;
use axum::Json;

#[tracing::instrument]
pub async fn get_stats(
    interpretation_repository: InterpretationRepository,
) -> Json<entity::stats::Stats> {
    let interpretations = interpretation_repository.get_all_interpretations().await;
    let readings = interpretations
        .into_iter()
        .map(|r| r.into_reading())
        .collect::<Vec<_>>();
    let stats = calculate_stats(&readings);
    Json(stats)
}
