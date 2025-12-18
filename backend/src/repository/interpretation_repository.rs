use crate::database::DbPool;
use crate::entity::interpretation;
use crate::entity::interpretation::Interpretation;
use crate::entity::reading::Reading;
use crate::entity::user::User;
use crate::error::AppResult;
use crate::middleware::locale::Locale;
use crate::state::AppState;
use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use chrono::Utc;
use diesel::{
    BoolExpressionMethods, ExpressionMethods, OptionalExtension, QueryDsl, SelectableHelper,
};
use diesel_async::RunQueryDsl;
use metrics::{counter, histogram};
use std::convert::Infallible;
use std::fmt::{Debug, Formatter};
use std::time::Instant;
use uuid::Uuid;
use webtarot_shared::explain::{InterpretationBackend, InterpretationService};

#[derive(Clone)]
pub struct InterpretationRepository {
    broadcast: tokio::sync::broadcast::Sender<Interpretation>,
    db_pool: DbPool,
    interpretation_service: InterpretationService,
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
            broadcast: value.interpretation_broadcast,
            db_pool: value.postgresql_pool,
            interpretation_service: InterpretationService::new(
                value.env.openai_api_key.clone(),
                value.env.google_api_key.clone(),
            ),
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

    pub async fn request_interpretation(&self, reading: Reading, locale: Locale, user: User) {
        self.save_as_pending(reading.clone()).await;
        let cloned = self.clone();

        tokio::spawn(async move {
            cloned
                .start_interpretation_request(reading, locale, user)
                .await;
        });
    }

    async fn save_as_pending(&self, reading: Reading) {
        let to_store: crate::model::Reading = Interpretation::Pending(reading).into();
        let mut conn = self.db_pool.get().await.unwrap();
        diesel::insert_into(crate::schema::readings::dsl::readings)
            .values(&to_store)
            .execute(&mut conn)
            .await
            .unwrap();
    }

    async fn start_interpretation_request(&self, reading: Reading, locale: Locale, _user: User) {
        tracing::debug!("start_interpretation_request");
        rust_i18n::set_locale(&locale.0);
        let start = Instant::now();
        let result = self
            .interpretation_service
            .explain(
                &reading.question,
                Some(reading.context.clone()).filter(|i| !i.trim().is_empty()),
                &reading.cards,
                Some(reading.user_name.clone()).filter(|i| !i.trim().is_empty()),
                Some(reading.user_self_description.clone()).filter(|i| !i.trim().is_empty()),
                reading
                    .backend
                    .clone()
                    .unwrap_or(InterpretationBackend::ChatGPT),
            )
            .await;
        let elapsed = start.elapsed();
        let card_count = reading.cards.len().to_string();
        let labels = [
            (
                "status",
                (if result.is_ok() { "success" } else { "failure" }).to_owned(),
            ),
            ("cards", card_count),
        ];
        counter!("interpretation_requests", &labels).increment(1);
        histogram!("interpretation_requests_duration_seconds", &labels)
            .record(elapsed.as_secs_f64());
        tracing::debug!(result = ?result, ?elapsed, "start_interpretation_request result");
        let result = match result {
            Ok(result) => Interpretation::Done(reading, result, Utc::now().naive_utc()),
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

    pub async fn reassign_from_anon_to_user(
        &self,
        anon_uuid: Uuid,
        user_id: Uuid,
    ) -> AppResult<()> {
        let mut conn = self.db_pool.get().await?;
        diesel::update(
            crate::schema::readings::dsl::readings
                .filter(crate::schema::readings::dsl::user_id.eq(anon_uuid)),
        )
        .set(crate::schema::readings::dsl::user_id.eq(user_id))
        .execute(&mut conn)
        .await?;
        Ok(())
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

    pub async fn get_history_for_user_paged(
        &self,
        user_id: Uuid,
        before: Option<chrono::NaiveDateTime>,
        limit: i64,
    ) -> Vec<Interpretation> {
        use crate::schema::readings::dsl as r;
        let mut conn = self.db_pool.get().await.unwrap();
        let mut query = r::readings
            .select(crate::model::Reading::as_select())
            .filter(r::user_id.eq(user_id).and(r::deleted_at.is_null()))
            .into_boxed();

        if let Some(before) = before {
            query = query.filter(r::created_at.lt(before));
        }

        query
            .order(r::created_at.desc())
            .limit(limit)
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
}
