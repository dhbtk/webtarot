use crate::state::AppState;
use axum::extract::{Request, State};
use axum::middleware::Next;
use axum::response::{IntoResponse, Redirect};

const DOMAIN: &str = "webtarot.io";

pub async fn domain_redirect(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> impl IntoResponse {
    if state.env.is_development()
        || request
            .headers()
            .get("x-forwarded-host")
            .and_then(|i| i.to_str().ok())
            .unwrap_or_default()
            == DOMAIN
    {
        return next.run(request).await;
    }
    let uri = format!("https://{}{}", DOMAIN, request.uri());
    tracing::warn!("redirecting to {}", uri);
    Redirect::permanent(&uri).into_response()
}
