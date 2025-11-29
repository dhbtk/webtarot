use crate::database::DbPool;
use crate::entity::interpretation;
use crate::entity::interpretation::Interpretation;
use crate::entity::reading::Reading;
use crate::middleware::locale::Locale;
use crate::state::AppState;
use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use diesel::{
    BoolExpressionMethods, ExpressionMethods, OptionalExtension, QueryDsl, SelectableHelper,
};
use diesel_async::RunQueryDsl;
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
            cloned.save_as_pending(reading.clone()).await;
            cloned.start_interpretation_request(reading, locale).await;
        });
    }

    async fn save_as_pending(&mut self, reading: Reading) {
        let to_store: crate::model::Reading = Interpretation::Pending(reading).into();
        let mut conn = self.db_pool.get().await.unwrap();
        diesel::insert_into(crate::schema::readings::dsl::readings)
            .values(&to_store)
            .execute(&mut conn)
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
        let result = match result {
            Ok(result) => Interpretation::Done(reading, result),
            Err(e) => Interpretation::Failed(reading, interpretation::localize_explain_error(&e)),
        };
        self.broadcast
            .send(self.update_interpretation(result).await)
            .unwrap();
    }

    pub async fn get_interpretation(&self, uuid: Uuid) -> Option<Interpretation> {
        let mut conn = self.db_pool.get().await.unwrap();
        let interpretation = crate::schema::readings::dsl::readings
            .find(uuid)
            .select(crate::model::Reading::as_select())
            .first(&mut conn)
            .await
            .optional()
            .unwrap();
        if let Some(interpretation) = interpretation {
            return Some(Interpretation::from(interpretation));
        }
        None
    }

    async fn update_interpretation(&self, interpretation: Interpretation) -> Interpretation {
        let mut conn = self.db_pool.get().await.unwrap();
        let reading: crate::model::Reading = interpretation.into();
        diesel::update(crate::schema::readings::dsl::readings.find(reading.id))
            .set(reading)
            .returning(crate::model::Reading::as_returning())
            .get_result(&mut conn)
            .await
            .unwrap()
            .into()
    }

    pub async fn assign_to_user(&self, uuid: Uuid, user_id: Uuid) -> Option<Interpretation> {
        let mut interpretation = self.get_interpretation(uuid).await?;
        interpretation.reading_mut().user_id = Some(user_id);
        interpretation = self.update_interpretation(interpretation).await;
        Some(interpretation)
    }

    pub async fn get_all_interpretations(&self) -> Vec<Interpretation> {
        let mut conn = self.db_pool.get().await.unwrap();
        crate::schema::readings::dsl::readings
            .select(crate::model::Reading::as_select())
            .filter(crate::schema::readings::dsl::deleted_at.is_null())
            .load::<crate::model::Reading>(&mut conn)
            .await
            .unwrap()
            .into_iter()
            .map(Interpretation::from)
            .collect()
    }

    pub async fn get_history_for_user(&self, user_id: Uuid) -> Vec<Interpretation> {
        let mut conn = self.db_pool.get().await.unwrap();
        crate::schema::readings::dsl::readings
            .select(crate::model::Reading::as_select())
            .filter(
                crate::schema::readings::dsl::user_id
                    .eq(user_id)
                    .and(crate::schema::readings::dsl::deleted_at.is_null()),
            )
            .order(crate::schema::readings::dsl::created_at.desc())
            .load::<crate::model::Reading>(&mut conn)
            .await
            .unwrap()
            .into_iter()
            .map(Interpretation::from)
            .collect()
    }

    pub async fn delete_interpretation(&self, uuid: Uuid, user_id: Uuid) -> Option<()> {
        let mut conn = self.db_pool.get().await.unwrap();
        diesel::update(crate::schema::readings::dsl::readings.find(uuid))
            .set(crate::schema::readings::dsl::deleted_at.eq(diesel::dsl::now))
            .filter(crate::schema::readings::dsl::user_id.eq(user_id))
            .execute(&mut conn)
            .await
            .optional()
            .unwrap();
        Some(())
    }

    pub async fn copy_all_from_redis_to_db(&self) {
        use crate::schema::readings::dsl::*;
        use diesel::prelude::*;
        use diesel_async::RunQueryDsl;

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
                .first::<Uuid>(&mut conn)
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
                if let Err(e) = diesel::insert_into(readings)
                    .values(&reading_model)
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
}
