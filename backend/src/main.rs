use futures_util::stream::StreamExt;
use std::sync::{Arc, RwLock};
mod interpretation;
mod locale;
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
use axum::extract::ws::{Message, WebSocket};
use axum::extract::{Path, State, WebSocketUpgrade};
use axum::http::StatusCode;
use axum::middleware::from_extractor;
use axum::response::IntoResponse;
use axum::routing::post;
use axum::routing::{delete, get};
use axum::{Json, Router};
use futures_util::SinkExt;
use reading::{CreateReadingRequest, CreateReadingResponse};
use serde::{Deserialize, Serialize};
use tower_http::services::{ServeDir, ServeFile};
use tower_http::trace::DefaultMakeSpan;
use tower_http::trace::DefaultOnResponse;
use tower_http::trace::TraceLayer;
use tracing::Level;
use tracing_subscriber::fmt;
use uuid::Uuid;
// Initialize rust-i18n. This looks for YAML files under backend/locales
rust_i18n::i18n!("locales");

#[tokio::main]
async fn main() {
    fmt().with_env_filter("info,webtarot=trace").init();
    // Set default locale (Portuguese as the project currently uses PT as baseline)
    rust_i18n::set_locale("pt");
    let interpretation_manager = InterpretationManager::new().await;

    let app = Router::new()
        .route("/api/v1/reading", post(create_reading))
        .route(
            "/api/v1/interpretation/history",
            get(get_interpretation_history),
        )
        .route(
            "/api/v1/interpretation/notify",
            get(notify_websocket_handler),
        )
        .route("/api/v1/interpretation/{id}", get(interpretation_result))
        .route("/api/v1/interpretation/{id}", delete(delete_interpretation))
        .route("/api/v1/interpretation", post(create_interpretation))
        .route("/api/v1/stats", get(stats))
        .with_state(interpretation_manager)
        // Set locale and user for each request
        .route_layer(from_extractor::<locale::Locale>())
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

#[tracing::instrument(skip(user), fields(user_id = %user.id.to_string()))]
async fn create_reading(
    State(interpretation_manager): State<InterpretationManager>,
    user: User,
    Json(create_reading_request): Json<CreateReadingRequest>,
) -> (StatusCode, Json<CreateReadingResponse>) {
    let reading = reading::perform_reading(&create_reading_request, &user);
    interpretation_manager.request_interpretation(reading.clone());
    (StatusCode::OK, Json(CreateReadingResponse::from(reading)))
}

#[tracing::instrument(skip(user), fields(user_id = %user.id.to_string()))]
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

#[tracing::instrument(skip(user), fields(user_id = %user.id.to_string()))]
async fn delete_interpretation(
    State(interpretation_manager): State<InterpretationManager>,
    user: User,
    Path(interpretation_id): Path<String>,
) -> StatusCode {
    let Ok(interpretation_id) = interpretation_id.parse::<Uuid>() else {
        return StatusCode::BAD_REQUEST;
    };
    let Some(_) = interpretation_manager
        .delete_interpretation(interpretation_id, user.id)
        .await
    else {
        return StatusCode::BAD_REQUEST;
    };
    StatusCode::NO_CONTENT
}

#[tracing::instrument(skip(user), fields(user_id = %user.id.to_string()))]
async fn get_interpretation_history(
    State(interpretation_manager): State<InterpretationManager>,
    user: User,
) -> Json<Vec<Interpretation>> {
    Json(interpretation_manager.get_history_for_user(user.id).await)
}

#[tracing::instrument(skip(user), fields(user_id = %user.id.to_string()))]
async fn create_interpretation(
    State(interpretation_manager): State<InterpretationManager>,
    user: User,
    Json(create_interpretation_request): Json<CreateInterpretationRequest>,
) -> (StatusCode, Json<CreateInterpretationResponse>) {
    let reading: Reading = (create_interpretation_request, &user).into();
    interpretation_manager.request_interpretation(reading.clone());
    (StatusCode::OK, Json(reading.id.into()))
}

#[tracing::instrument]
async fn stats(State(interpretation_manager): State<InterpretationManager>) -> Json<stats::Stats> {
    let interpretations = interpretation_manager.get_all_interpretations().await;
    let readings = interpretations
        .into_iter()
        .map(|r| r.into_reading())
        .collect::<Vec<_>>();
    let stats = calculate_stats(&readings);
    Json(stats)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum InterpretationsWebsocketMessage {
    Subscribe { uuid: Uuid },
    Done { uuid: Uuid },
}

#[tracing::instrument(skip(user, ws), fields(user_id = %user.id.to_string()))]
async fn notify_websocket_handler(
    State(interpretation_manager): State<InterpretationManager>,
    user: User,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    tracing::info!("notify_websocket_handler start");
    ws.on_upgrade(|socket| notify_websocket(socket, interpretation_manager, user))
}

async fn notify_websocket(
    stream: WebSocket,
    interpretation_manager: InterpretationManager,
    user: User,
) {
    let (mut sender, mut receiver) = stream.split();
    let mut rx = interpretation_manager.subscribe();
    let uuids_send: Arc<RwLock<Vec<Uuid>>> = Arc::new(RwLock::new(Vec::new()));
    let uuids_recv = uuids_send.clone();

    let mut send_task = tokio::spawn(async move {
        while let Ok(interpretation) = rx.recv().await {
            let message = InterpretationsWebsocketMessage::Done {
                uuid: interpretation.reading().id,
            };
            if !uuids_send
                .read()
                .unwrap()
                .contains(&interpretation.reading().id)
            {
                continue;
            }
            tracing::debug!(message = ?message, "sending websocket message");
            let result = sender
                .send(Message::text(serde_json::to_string(&message).unwrap()))
                .await;
            if result.is_err() {
                break;
            }
        }
    });

    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(Message::Text(message))) = receiver.next().await {
            tracing::debug!(message = ?message, "websocket message");
            if let Ok(InterpretationsWebsocketMessage::Subscribe { uuid }) =
                serde_json::from_str(&message)
                && let Some(interpretation) = interpretation_manager.get_interpretation(uuid).await
                && interpretation.reading().user_id == Some(user.id)
            {
                if let Interpretation::Pending(_) = interpretation {
                    tracing::debug!(uuid = ?uuid, "adding uuid to send queue");
                    uuids_recv.write().unwrap().push(uuid);
                    continue;
                }
                tracing::debug!(uuid = ?uuid, "renotifying");
                interpretation_manager.renotify(uuid).await;
            }
        }
    });

    tokio::select! {
        _ = &mut send_task => recv_task.abort(),
        _ = &mut recv_task => send_task.abort(),
    };
}
