use crate::handler::{
    create_interpretation, create_reading, create_user, delete_interpretation, get_interpretation,
    get_interpretation_history, get_stats, get_user, log_in, notify_websocket_handler, update_user,
};
use crate::middleware;
use crate::middleware::locale;
use crate::middleware::metrics::setup_metrics_recorder;
use crate::state::AppState;
#[cfg(test)]
use crate::state::RuntimeEnv;
use axum::Router;
use axum::http::HeaderValue;
use axum::http::header::CACHE_CONTROL;
use axum::middleware::{from_extractor, from_fn};
use axum::routing::{delete, get, patch, post};
use std::future::ready;
use tower::ServiceBuilder;
use tower_http::services::{ServeDir, ServeFile};
use tower_http::set_header::SetResponseHeaderLayer;
use tower_http::trace::{DefaultMakeSpan, DefaultOnResponse, TraceLayer};
use tracing::Level;

pub fn create_app(state: AppState) -> Router {
    let handle = setup_metrics_recorder();

    Router::new()
        .route("/metrics", get(move || ready(handle.render())))
        .route("/api/v1/reading", post(create_reading::create_reading))
        .route(
            "/api/v1/interpretation/history",
            get(get_interpretation_history::get_interpretation_history),
        )
        .route(
            "/api/v1/interpretation/notify",
            get(notify_websocket_handler::notify_websocket_handler),
        )
        .route(
            "/api/v1/interpretation/{id}",
            get(get_interpretation::get_interpretation),
        )
        .route(
            "/api/v1/interpretation/{id}",
            delete(delete_interpretation::delete_interpretation),
        )
        .route(
            "/api/v1/interpretation",
            post(create_interpretation::create_interpretation),
        )
        .route("/api/v1/stats", get(get_stats::get_stats))
        .route("/api/v1/user", post(create_user::create_user))
        .route("/api/v1/user", get(get_user::get_user))
        .route("/api/v1/user", patch(update_user::update_user))
        .route("/api/v1/login", post(log_in::log_in))
        .with_state(state.clone())
        // Set locale and user for each request
        .route_layer(from_extractor::<locale::Locale>())
        .fallback_service({
            // SPA entry point should not be cached to ensure users get latest app shell
            let no_cache = SetResponseHeaderLayer::overriding(
                CACHE_CONTROL,
                HeaderValue::from_static("no-cache"),
            );
            let index_service = ServiceBuilder::new()
                .layer(no_cache)
                .service(ServeFile::new("/static/index.html"));

            // Combine ServeDir with index fallback first
            let combined = ServeDir::new("/static").not_found_service(index_service);

            // Then apply long-term caching to anything that didn't set Cache-Control yet
            let static_cache = SetResponseHeaderLayer::if_not_present(
                CACHE_CONTROL,
                HeaderValue::from_static("public, max-age=31536000, immutable"),
            );

            ServiceBuilder::new().layer(static_cache).service(combined)
        })
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
                .on_response(DefaultOnResponse::new().level(Level::INFO)),
        )
        // Must be after routes are defined so it can observe them
        .layer(from_fn(middleware::metrics::metrics))
}

#[cfg(test)]
pub async fn create_test_app() -> (AppState, Router) {
    let state = AppState::from_env(crate::state::AppEnvironment {
        environment: RuntimeEnv::Development,
        redis_url: "redis://localhost:6379/0".to_string(),
        database_url: "postgres://localhost/webtarot_test".to_string(),
        openai_api_key: "dummy".to_string(),
    })
    .await;

    (state.clone(), create_app(state))
}
