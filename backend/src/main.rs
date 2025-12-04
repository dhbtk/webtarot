mod app;
mod database;
mod entity;
pub mod error;
mod handler;
mod middleware;
mod model;
mod repository;
mod schema;
mod state;
#[cfg(test)]
mod test_helpers;

use crate::state::AppState;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::{EnvFilter, fmt};

// Initialize rust-i18n. This looks for YAML files under backend/locales
rust_i18n::i18n!("locales");

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();
    let sentry_guard = std::env::var("SENTRY_DSN").ok().map(|dsn| {
        sentry::init((
            dsn,
            sentry::ClientOptions {
                release: sentry::release_name!(),
                ..Default::default()
            },
        ))
    });

    let env_filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info,webtarot=trace"));

    let fmt_layer = fmt::layer().json().with_target(true);

    tracing_subscriber::registry()
        .with(env_filter)
        .with(fmt_layer)
        .with(sentry_tracing::layer())
        .init();
    // Set default locale (Portuguese as the project currently uses PT as baseline)
    rust_i18n::set_locale("pt");
    let state = AppState::new().await;
    tracing::info!(
        "[[webtarot]] Starting server with environment={:?}",
        state.env.environment
    );
    let app = app::create_app(AppState::new().await);

    tracing::info!("[[webtarot]] Listening on port 3000");
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();

    if let Some(guard) = sentry_guard {
        let _ = guard.flush(Some(std::time::Duration::from_secs(2)));
    }
}
