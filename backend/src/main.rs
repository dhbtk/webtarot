mod entity;
mod handler;
mod middleware;
mod repository;

use axum::Router;
use axum::middleware::from_extractor;
use axum::routing::post;
use axum::routing::{delete, get};
use axum_prometheus::{PrometheusMetricLayer, metrics_exporter_prometheus::PrometheusHandle};
use handler::{
    create_interpretation, create_reading, delete_interpretation, get_interpretation,
    get_interpretation_history, get_stats, notify_websocket_handler,
};
use middleware::locale;
use repository::interpretation_repository::InterpretationRepository;
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
    fmt().with_env_filter("info,webtarot=trace").init();
    // Set default locale (Portuguese as the project currently uses PT as baseline)
    rust_i18n::set_locale("pt");
    let interpretation_manager = InterpretationRepository::new().await;

    // Prometheus metrics layer (collects per-request metrics: method, path, status, latency, RPS)
    let (prometheus_layer, prometheus_handle): (PrometheusMetricLayer<'_>, PrometheusHandle) =
        PrometheusMetricLayer::pair();

    let app = Router::new()
        // Expose Prometheus metrics endpoint
        .route(
            "/metrics",
            get({
                let handle = prometheus_handle.clone();
                move || async move { handle.render() }
            }),
        )
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
        .with_state(interpretation_manager)
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
        .layer(prometheus_layer);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
