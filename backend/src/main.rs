mod interpretation;
mod reading;
mod stats;
mod user;

use crate::interpretation::{
    CreateInterpretationRequest, CreateInterpretationResponse, GetInterpretationResult,
    Interpretation, InterpretationManager,
};
use crate::reading::Reading;
use crate::stats::calculate_stats;
use crate::user::User;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::middleware::from_extractor;
use axum::routing::get;
use axum::routing::post;
use axum::{Json, Router};
use reading::{CreateReadingRequest, CreateReadingResponse};
use tower_http::services::{ServeDir, ServeFile};
use tower_http::trace::DefaultMakeSpan;
use tower_http::trace::DefaultOnResponse;
use tower_http::trace::TraceLayer;
use tracing::Level;
use tracing_subscriber::{fmt, prelude::*};

#[tokio::main]
async fn main() {
    fmt().with_env_filter("info,webtarot=trace").init();
    let interpretation_manager = InterpretationManager::new().await;

    let app = Router::new()
        .route("/api/v1/reading", post(create_reading))
        .route(
            "/api/v1/interpretation/history",
            get(get_interpretation_history),
        )
        .route("/api/v1/interpretation/{id}", get(interpretation_result))
        .route("/api/v1/interpretation", post(create_interpretation))
        .route("/api/v1/stats", get(stats))
        .with_state(interpretation_manager)
        .route_layer(from_extractor::<User>())
        .fallback_service(
            ServeDir::new("/static").not_found_service(ServeFile::new("/static/index.html")),
        )
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
                .on_response(DefaultOnResponse::new().level(Level::INFO)),
        );

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

#[axum::debug_handler]
async fn create_reading(
    State(interpretation_manager): State<InterpretationManager>,
    user: User,
    Json(create_reading_request): Json<CreateReadingRequest>,
) -> (StatusCode, Json<CreateReadingResponse>) {
    let reading = reading::perform_reading(&create_reading_request, &user);
    interpretation_manager.request_interpretation(reading.clone());
    (StatusCode::OK, Json(CreateReadingResponse::from(reading)))
}

async fn interpretation_result(
    State(interpretation_manager): State<InterpretationManager>,
    user: User,
    Path(interpretation_id): Path<String>,
) -> (StatusCode, Json<GetInterpretationResult>) {
    let Ok(uuid) = interpretation_id.parse() else {
        return (
            StatusCode::NOT_FOUND,
            Json(GetInterpretationResult::default()),
        );
    };
    let Some(interpretation) = interpretation_manager.get_interpretation(uuid).await else {
        return (
            StatusCode::NOT_FOUND,
            Json(Option::<Interpretation>::None.into()),
        );
    };
    let Some(_) = interpretation.reading().user_id else {
        return (
            StatusCode::OK,
            Json(
                interpretation_manager
                    .assign_to_user(uuid, user.id)
                    .await
                    .into(),
            ),
        );
    };
    (StatusCode::OK, Json(interpretation.into()))
}

async fn get_interpretation_history(
    State(interpretation_manager): State<InterpretationManager>,
    user: User,
) -> Json<Vec<Interpretation>> {
    Json(interpretation_manager.get_history_for_user(user.id).await)
}

async fn create_interpretation(
    State(interpretation_manager): State<InterpretationManager>,
    user: User,
    Json(create_interpretation_request): Json<CreateInterpretationRequest>,
) -> (StatusCode, Json<CreateInterpretationResponse>) {
    let reading: Reading = (create_interpretation_request, &user).into();
    interpretation_manager.request_interpretation(reading.clone());
    (StatusCode::OK, Json(reading.id.into()))
}

async fn stats(State(interpretation_manager): State<InterpretationManager>) -> Json<stats::Stats> {
    let interpretations = interpretation_manager.get_all_interpretations().await;
    let readings = interpretations
        .into_iter()
        .map(|r| r.reading().clone())
        .collect::<Vec<_>>();
    let stats = calculate_stats(&readings);
    Json(stats)
}
