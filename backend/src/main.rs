mod interpretation;
mod reading;

use crate::interpretation::{GetInterpretationResult, InterpretationManager};
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::routing::get;
use axum::routing::post;
use axum::{Json, Router};
use reading::{CreateReadingRequest, CreateReadingResponse};
use tower_http::trace::DefaultMakeSpan;
use tower_http::trace::DefaultOnResponse;
use tower_http::trace::TraceLayer;
use tracing::Level;
use tracing_subscriber::{fmt, prelude::*};

#[tokio::main]
async fn main() {
    fmt().with_env_filter("info,webtarot=trace").init();

    let app = Router::new()
        .route("/api/v1/reading", post(create_reading))
        .route("/api/v1/interpretation/{id}", get(interpretation_result))
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
                .on_response(DefaultOnResponse::new().level(Level::INFO)),
        )
        .with_state(InterpretationManager::default());

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

#[axum::debug_handler]
async fn create_reading(
    State(interpretation_manager): State<InterpretationManager>,
    Json(create_reading_request): Json<CreateReadingRequest>,
) -> (StatusCode, Json<CreateReadingResponse>) {
    let reading = reading::perform_reading(&create_reading_request);
    interpretation_manager.request_interpretation(reading.clone());
    (StatusCode::OK, Json(CreateReadingResponse::from(reading)))
}

async fn interpretation_result(
    State(interpretation_manager): State<InterpretationManager>,
    Path(interpretation_id): Path<String>,
) -> (StatusCode, Json<GetInterpretationResult>) {
    let Ok(uuid) = interpretation_id.parse() else {
        return (
            StatusCode::NOT_FOUND,
            Json(GetInterpretationResult::default()),
        );
    };
    (
        StatusCode::OK,
        Json(interpretation_manager.get_interpretation(uuid).into()),
    )
}
