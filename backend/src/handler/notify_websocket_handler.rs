use crate::entity::interpretation::Interpretation;
use crate::entity::user::User;
use crate::repository::interpretation_repository::InterpretationRepository;
use axum::extract::WebSocketUpgrade;
use axum::extract::ws::{Message, WebSocket};
use axum::response::IntoResponse;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, RwLock};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum InterpretationsWebsocketMessage {
    Subscribe { uuid: Uuid },
    Done { uuid: Uuid },
}

#[tracing::instrument(skip(user, ws), fields(user_id = %user.id().to_string()))]
pub async fn notify_websocket_handler(
    interpretation_repository: InterpretationRepository,
    user: User,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    tracing::info!("notify_websocket_handler start");
    ws.on_upgrade(|socket| notify_websocket(socket, interpretation_repository, user))
}

async fn notify_websocket(
    stream: WebSocket,
    interpretation_repository: InterpretationRepository,
    user: User,
) {
    let (mut sender, mut receiver) = stream.split();
    let mut rx = interpretation_repository.subscribe();
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
                && let Some(interpretation) =
                    interpretation_repository.get_interpretation(uuid).await
                && interpretation.reading().user_id == Some(user.id())
            {
                if let Interpretation::Pending(_) = interpretation {
                    tracing::debug!(uuid = ?uuid, "adding uuid to send queue");
                    uuids_recv.write().unwrap().push(uuid);
                    continue;
                }
                tracing::debug!(uuid = ?uuid, "renotifying");
                interpretation_repository.renotify(uuid).await;
            }
        }
    });

    tokio::select! {
        _ = &mut send_task => recv_task.abort(),
        _ = &mut recv_task => send_task.abort(),
    };
}
