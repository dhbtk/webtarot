use crate::entity::interpretation::{GetInterpretationResult, Interpretation};
use crate::middleware::user::User;
use crate::repository::interpretation_repository::InterpretationRepository;
use axum::Json;
use axum::extract::Path;
use axum::http::StatusCode;

#[tracing::instrument(skip(user), fields(user_id = %user.id.to_string()))]
pub async fn get_interpretation(
    interpretation_repository: InterpretationRepository,
    user: User,
    Path(interpretation_id): Path<String>,
) -> (StatusCode, Json<GetInterpretationResult>) {
    let Ok(uuid) = interpretation_id.parse() else {
        return (
            StatusCode::NOT_FOUND,
            Json(GetInterpretationResult::default()),
        );
    };
    let Some(interpretation) = interpretation_repository.get_interpretation(uuid).await else {
        return (
            StatusCode::NOT_FOUND,
            Json(Option::<Interpretation>::None.into()),
        );
    };
    let Some(_) = interpretation.reading().user_id else {
        return (
            StatusCode::OK,
            Json(
                interpretation_repository
                    .assign_to_user(uuid, user.id)
                    .await
                    .into(),
            ),
        );
    };
    (StatusCode::OK, Json(interpretation.into()))
}
