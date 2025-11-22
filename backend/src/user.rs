use axum::extract::FromRequestParts;
use axum::http::StatusCode;
use axum::http::request::Parts;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct User {
    pub id: Uuid,
}

impl<S> FromRequestParts<S> for User
where
    S: Send + Sync,
{
    type Rejection = StatusCode;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let user_id = parts
            .headers
            .get("x-user-uuid")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.parse::<Uuid>().ok())
            .inspect(|v| tracing::debug!("User ID: {:?}", v))
            .ok_or(StatusCode::UNAUTHORIZED)?;
        Ok(Self { id: user_id })
    }
}
