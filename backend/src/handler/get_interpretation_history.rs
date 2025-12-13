use crate::entity::interpretation::Interpretation;
use crate::entity::user::User;
use crate::repository::interpretation_repository::InterpretationRepository;
use axum::{Json, extract::Query};

#[derive(Debug, serde::Deserialize)]
pub struct HistoryQuery {
    /// RFC3339/ISO8601 timestamp string, items strictly before this `created_at` will be returned
    pub before: Option<String>,
    /// Max number of items to return (defaults to 30)
    pub limit: Option<i64>,
}

#[tracing::instrument(skip(user), fields(user_id = %user.id().to_string()))]
pub async fn get_interpretation_history(
    interpretation_repository: InterpretationRepository,
    user: User,
    Query(params): Query<HistoryQuery>,
) -> Json<Vec<Interpretation>> {
    let limit = params.limit.unwrap_or(30).clamp(1, 200);

    let before = params.before.and_then(|s| {
        // Accept RFC3339 string; parse with timezone then convert to naive UTC
        match chrono::DateTime::parse_from_rfc3339(&s) {
            Ok(dt) => Some(dt.naive_utc()),
            Err(_) => None,
        }
    });

    Json(
        interpretation_repository
            .get_history_for_user_paged(user.id(), before, limit)
            .await,
    )
}
