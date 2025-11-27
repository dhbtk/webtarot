use crate::entity::interpretation;
use crate::entity::interpretation::Interpretation;
use crate::entity::reading::Reading;
use crate::middleware::locale::Locale;
use redis::AsyncCommands;
use redis::aio::ConnectionManager;
use std::env;
use std::fmt::{Debug, Formatter};
use uuid::Uuid;

#[derive(Clone)]
pub struct InterpretationRepository {
    connection_manager: ConnectionManager,
    broadcast: tokio::sync::broadcast::Sender<Interpretation>,
}

impl Debug for InterpretationRepository {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "InterpretationManager {{ }}")
    }
}

impl InterpretationRepository {
    pub async fn new() -> Self {
        let client =
            redis::Client::open(env::var("REDIS_URL").expect("REDIS_URL not set")).unwrap();
        let manager = ConnectionManager::new(client).await.unwrap();
        let (broadcast, _) = tokio::sync::broadcast::channel(100);
        Self {
            connection_manager: manager,
            broadcast,
        }
    }

    pub fn subscribe(&self) -> tokio::sync::broadcast::Receiver<Interpretation> {
        self.broadcast.subscribe()
    }

    pub async fn renotify(&self, uuid: Uuid) {
        let interpretation = self.get_interpretation(uuid).await.unwrap();
        self.broadcast.send(interpretation).unwrap();
    }

    pub fn request_interpretation(&self, reading: Reading, locale: Locale) {
        let mut cloned = self.clone();
        tokio::spawn(async move {
            cloned.mark_started(reading.clone()).await;
            cloned.start_interpretation_request(reading, locale).await;
        });
    }

    async fn mark_started(&mut self, reading: Reading) {
        let to_store = Interpretation::Pending(reading);
        let mut manager = self.connection_manager.clone();
        manager
            .set::<String, String, String>(
                self.key_for_uuid(to_store.reading().id),
                serde_json::to_string(&to_store).unwrap(),
            )
            .await
            .unwrap();
    }

    async fn start_interpretation_request(&mut self, reading: Reading, locale: Locale) {
        tracing::debug!("start_interpretation_request");
        rust_i18n::set_locale(&locale.0);
        let result = webtarot_shared::explain::explain(&reading.question, &reading.cards).await;
        tracing::debug!(result = ?result, "start_interpretation_request result");
        let uuid = reading.id;
        let result = match result {
            Ok(result) => Interpretation::Done(reading, result),
            Err(e) => Interpretation::Failed(reading, interpretation::localize_explain_error(&e)),
        };
        let mut manager = self.connection_manager.clone();
        manager
            .set::<String, String, String>(
                self.key_for_uuid(uuid),
                serde_json::to_string(&result).unwrap(),
            )
            .await
            .unwrap();
        self.broadcast.send(result).unwrap();
    }

    pub async fn get_interpretation(&self, uuid: Uuid) -> Option<Interpretation> {
        let mut manager = self.connection_manager.clone();
        let Ok(value) = manager.get::<String, String>(self.key_for_uuid(uuid)).await else {
            return None;
        };
        let Ok(parsed) = serde_json::from_str::<Interpretation>(&value) else {
            return None;
        };
        Some(parsed)
    }

    pub async fn assign_to_user(&self, uuid: Uuid, user_id: Uuid) -> Option<Interpretation> {
        let mut interpretation = self.get_interpretation(uuid).await?;
        interpretation.reading_mut().user_id = Some(user_id);
        let mut manager = self.connection_manager.clone();
        manager
            .set::<String, String, String>(
                self.key_for_uuid(uuid),
                serde_json::to_string(&interpretation).unwrap(),
            )
            .await
            .unwrap();
        Some(interpretation)
    }

    pub async fn get_all_interpretations(&self) -> Vec<Interpretation> {
        let mut manager = self.connection_manager.clone();
        let keys: Vec<String> = manager.keys("interpretation:*").await.unwrap();
        let mut results = Vec::new();
        for key in keys {
            let Ok(value) = manager.get::<String, String>(key).await else {
                continue;
            };
            let Ok(parsed) = serde_json::from_str::<Interpretation>(&value) else {
                continue;
            };
            if parsed.is_done() {
                results.push(parsed);
            };
        }
        results
    }

    pub async fn get_history_for_user(&self, user_id: Uuid) -> Vec<Interpretation> {
        let mut manager = self.connection_manager.clone();
        let keys: Vec<String> = manager.keys("interpretation:*").await.unwrap();
        let mut results = Vec::new();
        for key in keys {
            let Ok(value) = manager.get::<String, String>(key).await else {
                continue;
            };
            let Ok(parsed) = serde_json::from_str::<Interpretation>(&value) else {
                continue;
            };
            let Some(reading_user_uuid) = parsed.reading().user_id else {
                continue;
            };
            if reading_user_uuid == user_id {
                results.push(parsed);
            }
        }
        results.sort_by(|a, b| b.reading().created_at.cmp(&a.reading().created_at));
        results
    }

    pub async fn delete_interpretation(&self, uuid: Uuid, user_id: Uuid) -> Option<()> {
        let mut manager = self.connection_manager.clone();
        let interpretation = self.get_interpretation(uuid).await?;
        let reading_user_uuid = interpretation.reading().user_id?;
        if reading_user_uuid == user_id {
            manager
                .del::<String, String>(self.key_for_uuid(uuid))
                .await
                .unwrap();
            return Some(());
        }
        None
    }

    fn key_for_uuid(&self, uuid: Uuid) -> String {
        format!("interpretation:{}", uuid)
    }
}
