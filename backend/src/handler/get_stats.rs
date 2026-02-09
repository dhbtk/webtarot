use crate::entity;
use crate::entity::stats::calculate_stats;
use crate::repository::interpretation_repository::InterpretationRepository;
use axum::Json;
use axum::extract::Query;

#[tracing::instrument]
pub async fn get_stats(
    interpretation_repository: InterpretationRepository,
    Query(request): Query<entity::stats::StatsRequest>,
) -> Json<entity::stats::Stats> {
    let interpretations = interpretation_repository
        .get_interpretations_for_stats(request)
        .await
        .unwrap();
    let readings = interpretations
        .into_iter()
        .map(|r| r.into_reading())
        .collect::<Vec<_>>();
    let stats = calculate_stats(&readings);
    Json(stats)
}
