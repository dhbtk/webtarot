use crate::state::AppEnvironment;
use axum::extract::{Request, State};
use axum::middleware::Next;
use axum::response::{IntoResponse, Redirect};

const DOMAIN: &str = "webtarot.io";

pub async fn domain_redirect(
    State(env): State<AppEnvironment>,
    request: Request,
    next: Next,
) -> impl IntoResponse {
    // Allow everything in development to avoid redirects during local runs
    if env.is_development() {
        return next.run(request).await;
    }

    // Determine the effective host, preferring x-forwarded-host when present
    let effective_host = request
        .headers()
        .get("x-forwarded-host")
        .or_else(|| request.headers().get("host"))
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_lowercase());

    // If we cannot determine host, do not redirect to avoid accidental loops
    let should_redirect = match effective_host {
        None => false,
        Some(host) => {
            // Strip optional port
            let host_without_port = host.split(':').next().map(|s| s.trim()).unwrap_or("");
            host_without_port != DOMAIN
        }
    };

    if !should_redirect {
        return next.run(request).await;
    }

    let uri = format!("https://{}{}", DOMAIN, request.uri());
    tracing::warn!("redirecting to {}", uri);
    Redirect::permanent(&uri).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        Router,
        http::{Request as HttpRequest, StatusCode, header::LOCATION},
        routing::get,
    };
    use tower::ServiceExt;

    fn prod_env() -> AppEnvironment {
        AppEnvironment {
            environment: crate::state::RuntimeEnv::Production,
            // The rest of the fields are irrelevant for this middleware when used via `from_fn_with_state`
            // but we must still construct a value; unused here.
            redis_url: String::new(),
            database_url: String::new(),
            openai_api_key: String::new(),
        }
    }

    #[tokio::test]
    async fn no_redirect_when_host_matches_domain() {
        let app = Router::new().route("/", get(|| async { "ok" })).layer(
            axum::middleware::from_fn_with_state(prod_env(), domain_redirect),
        );

        let req = HttpRequest::builder()
            .uri("/")
            .header("host", "webtarot.io")
            .body(axum::body::Body::empty())
            .unwrap();

        let res = app.clone().oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn redirect_when_host_differs() {
        let app = Router::new()
            .route("/path?q=1", get(|| async { "ok" }))
            .layer(axum::middleware::from_fn_with_state(
                prod_env(),
                domain_redirect,
            ));

        let req = HttpRequest::builder()
            .uri("/path?q=1")
            .header("host", "example.com")
            .body(axum::body::Body::empty())
            .unwrap();

        let res = app.clone().oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::PERMANENT_REDIRECT);
        let location = res.headers().get(LOCATION).unwrap().to_str().unwrap();
        assert_eq!(location, "https://webtarot.io/path?q=1");
    }

    #[tokio::test]
    async fn no_redirect_when_forwarded_host_matches() {
        let app = Router::new().route("/", get(|| async { "ok" })).layer(
            axum::middleware::from_fn_with_state(prod_env(), domain_redirect),
        );

        let req = HttpRequest::builder()
            .uri("/")
            .header("host", "example.com")
            .header("x-forwarded-host", "webtarot.io")
            .body(axum::body::Body::empty())
            .unwrap();

        let res = app.clone().oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn no_redirect_when_host_has_port() {
        let app = Router::new().route("/", get(|| async { "ok" })).layer(
            axum::middleware::from_fn_with_state(prod_env(), domain_redirect),
        );

        let req = HttpRequest::builder()
            .uri("/")
            .header("host", "webtarot.io:443")
            .body(axum::body::Body::empty())
            .unwrap();

        let res = app.clone().oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }
}
