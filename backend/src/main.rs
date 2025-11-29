mod database;
mod entity;
mod handler;
mod middleware;
mod model;
mod repository;
mod schema;
mod state;

use crate::handler::create_user;
use crate::middleware::metrics::metrics;
use crate::state::AppState;
use axum::Router;
use axum::middleware::{from_extractor, from_fn};
use axum::routing::post;
use axum::routing::{delete, get};
use handler::{
    create_interpretation, create_reading, delete_interpretation, get_interpretation,
    get_interpretation_history, get_stats, get_user, log_in, notify_websocket_handler,
};
use middleware::locale;
use middleware::metrics::setup_metrics_recorder;
use std::future::ready;
use tower_http::services::{ServeDir, ServeFile};
use tower_http::trace::DefaultMakeSpan;
use tower_http::trace::DefaultOnResponse;
use tower_http::trace::TraceLayer;
use tracing::Level;
use tracing_subscriber::fmt;

// Initialize rust-i18n. This looks for YAML files under backend/locales
rust_i18n::i18n!("locales");

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();
    fmt().with_env_filter("info,webtarot=trace").init();
    // Set default locale (Portuguese as the project currently uses PT as baseline)
    rust_i18n::set_locale("pt");
    let handle = setup_metrics_recorder();

    let app = Router::new()
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
        .route("/api/v1/login", post(log_in::log_in))
        .with_state(AppState::new().await)
        // Set locale and user for each request
        .route_layer(from_extractor::<locale::Locale>())
        .fallback_service(
            ServeDir::new("/static").not_found_service(ServeFile::new("/static/index.html")),
        )
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
                .on_response(DefaultOnResponse::new().level(Level::INFO)),
        )
        // Must be after routes are defined so it can observe them
        .layer(from_fn(metrics));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
