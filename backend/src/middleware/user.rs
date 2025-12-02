use crate::entity::user::User;
use crate::repository::user_repository::UserRepository;
use crate::state::AppState;
use axum::extract::FromRequestParts;
use axum::http::StatusCode;
use axum::http::request::Parts;
use uuid::Uuid;

impl FromRequestParts<AppState> for User {
    type Rejection = StatusCode;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let user_repository: UserRepository = state.clone().into();
        let user_id = get_anonymous_uuid(parts);
        if let Some(user_id) = user_id {
            if user_repository.exists_by_id(user_id).await {
                tracing::warn!(?user_id, "anon user request but user has signed up");
                return Err(StatusCode::UNAUTHORIZED);
            }
            Ok(User::Anonymous { id: user_id })
        } else {
            let Some(token) = get_authenticated_token(parts) else {
                tracing::warn!("no auth header");
                return Err(StatusCode::UNAUTHORIZED);
            };
            let Some(result) = user_repository.find_by_access_token(&token).await else {
                tracing::warn!("invalid auth token");
                return Err(StatusCode::UNAUTHORIZED);
            };
            Ok(result.into())
        }
    }
}

fn get_anonymous_uuid(parts: &mut Parts) -> Option<Uuid> {
    parts
        .headers
        .get("x-user-uuid")
        .or_else(|| {
            parts
                .headers
                .get("sec-websocket-protocol")
                .filter(|v| v.len() == 36) // uuid length. authenticated user tokens are longer
        })
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<Uuid>().ok())
}

fn get_authenticated_token(parts: &mut Parts) -> Option<String> {
    parts
        .headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.split_once("Bearer ").map(|v| v.1))
        .or_else(|| {
            parts
                .headers
                .get("sec-websocket-protocol")
                .and_then(|v| v.to_str().ok())
        })
        .map(|v| v.to_owned())
}
