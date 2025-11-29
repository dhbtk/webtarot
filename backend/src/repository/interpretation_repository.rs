use crate::database::DbPool;
use crate::entity::interpretation;
use crate::entity::interpretation::Interpretation;
use crate::entity::reading::Reading;
use crate::middleware::locale::Locale;
use crate::state::AppState;
use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use metrics::{counter, histogram};
use redis::AsyncCommands;
use redis::aio::ConnectionManager;
use std::convert::Infallible;
use std::fmt::{Debug, Formatter};
use std::time::Instant;
use uuid::Uuid;

#[derive(Clone)]
pub struct InterpretationRepository {
    connection_manager: ConnectionManager,
    broadcast: tokio::sync::broadcast::Sender<Interpretation>,
    db_pool: DbPool,
}

impl Debug for InterpretationRepository {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "InterpretationManager {{ }}")
    }
}

impl FromRequestParts<AppState> for InterpretationRepository {
    type Rejection = Infallible;

    async fn from_request_parts(
        _parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        Ok(state.clone().into())
    }
}

impl From<AppState> for InterpretationRepository {
    fn from(value: AppState) -> Self {
        Self {
            connection_manager: value.redis_connection_manager,
            broadcast: value.interpretation_broadcast,
            db_pool: value.postgresql_pool,
        }
    }
}

impl InterpretationRepository {
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
        let start = Instant::now();
        let result = webtarot_shared::explain::explain(&reading.question, &reading.cards).await;
        let elapsed = start.elapsed();
        let card_count = reading.cards.len().to_string();
        let labels = [
            (
                "status",
                if result.is_ok() {
                    "success".to_owned()
                } else {
                    "failure".to_owned()
                },
            ),
            ("cards", card_count),
        ];
        counter!("interpretation_requests", &labels).increment(1);
        histogram!("interpretation_requests_duration_seconds", &labels)
            .record(elapsed.as_secs_f64());
        tracing::debug!(result = ?result, ?elapsed, "start_interpretation_request result");
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

    pub async fn copy_all_from_redis_to_db(&self) {
        use crate::schema::readings::dsl::*;
        use diesel::prelude::*;
        use diesel_async::RunQueryDsl;
        use serde_json::json;

        let mut manager = self.connection_manager.clone();
        let keys: Vec<String> = match manager.keys("interpretation:*").await {
            Ok(k) => k,
            Err(e) => {
                tracing::error!(error = ?e, "failed listing interpretation keys from redis");
                return;
            }
        };
        for key in keys {
            let Ok(value) = manager.get::<String, String>(key.clone()).await else {
                tracing::warn!(%key, "failed to fetch interpretation value from redis");
                continue;
            };
            let Ok(interpretation) = serde_json::from_str::<Interpretation>(&value) else {
                tracing::warn!(%key, "failed to parse interpretation json from redis");
                continue;
            };
            let reading_model: crate::model::Reading = interpretation.into();

            let mut conn = match self.db_pool.get().await {
                Ok(c) => c,
                Err(e) => {
                    tracing::error!(error = ?e, "failed to get db connection");
                    return;
                }
            };

            // Check if the reading already exists by primary key (id)
            let exists = readings
                .find(reading_model.id)
                .select(id)
                .first::<uuid::Uuid>(&mut conn)
                .await
                .optional();

            let should_insert = match exists {
                Ok(Some(_)) => false,
                Ok(None) => true,
                Err(e) => {
                    tracing::warn!(error = ?e, "failed checking reading existence; skipping insert");
                    false
                }
            };

            if should_insert {
                // Prepare plain values to avoid custom ToSql impls
                let status_str = match reading_model.interpretation_status {
                    crate::model::InterpretationStatus::Pending => "pending",
                    crate::model::InterpretationStatus::Done => "done",
                    crate::model::InterpretationStatus::Failed => "failed",
                };

                let cards_vec: Vec<webtarot_shared::model::Card> =
                    reading_model.cards.clone().into();
                let cards_json = serde_json::to_value(cards_vec).unwrap_or_else(|_| json!([]));

                if let Err(e) = diesel::insert_into(readings)
                    .values((
                        id.eq(reading_model.id),
                        created_at.eq(reading_model.created_at),
                        question.eq(reading_model.question.clone()),
                        context.eq(reading_model.context.clone()),
                        cards.eq(cards_json),
                        shuffled_times.eq(reading_model.shuffled_times),
                        user_id.eq(reading_model.user_id),
                        user_name.eq(reading_model.user_name.clone()),
                        user_self_description.eq(reading_model.user_self_description.clone()),
                        interpretation_status.eq(status_str),
                        interpretation_text.eq(reading_model.interpretation_text.clone()),
                        interpretation_error.eq(reading_model.interpretation_error.clone()),
                        deleted_at.eq(reading_model.deleted_at),
                    ))
                    .execute(&mut conn)
                    .await
                {
                    tracing::error!(error = ?e, reading_id = %reading_model.id, "failed inserting reading into database");
                } else {
                    tracing::info!(reading_id = %reading_model.id, "copied reading from redis to db");
                }
            }
        }
    }

    fn key_for_uuid(&self, uuid: Uuid) -> String {
        format!("interpretation:{}", uuid)
    }
}
