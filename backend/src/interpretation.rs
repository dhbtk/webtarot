use crate::reading::Reading;
use crate::user::User;
use redis::AsyncCommands;
use redis::aio::ConnectionManager;
use serde::{Deserialize, Serialize};
use std::env;
use std::fmt::{Debug, Formatter};
use uuid::Uuid;
use webtarot_shared::model::Card;

#[derive(Clone)]
pub struct InterpretationManager {
    connection_manager: ConnectionManager,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Interpretation {
    Pending(Reading),
    Done(Reading, String),
    Failed(Reading, String),
}

impl Interpretation {
    pub fn is_done(&self) -> bool {
        matches!(self, Self::Done(..))
    }
    pub fn reading(&self) -> &Reading {
        match self {
            Self::Pending(reading) => reading,
            Self::Done(reading, _) => reading,
            Self::Failed(reading, _) => reading,
        }
    }

    pub fn into_reading(self) -> Reading {
        match self {
            Self::Pending(reading) => reading,
            Self::Done(reading, _) => reading,
            Self::Failed(reading, _) => reading,
        }
    }

    pub fn reading_mut(&mut self) -> &mut Reading {
        match self {
            Self::Pending(reading) => reading,
            Self::Done(reading, _) => reading,
            Self::Failed(reading, _) => reading,
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreateInterpretationRequest {
    pub question: String,
    pub cards: Vec<Card>,
}

impl From<(CreateInterpretationRequest, &User)> for Reading {
    fn from((value, user): (CreateInterpretationRequest, &User)) -> Self {
        Reading {
            id: Uuid::new_v4(),
            created_at: chrono::Utc::now(),
            question: value.question,
            shuffled_times: 0,
            cards: value.cards,
            user_id: Some(user.id),
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreateInterpretationResponse {
    pub interpretation_id: Uuid,
}

impl From<Uuid> for CreateInterpretationResponse {
    fn from(value: Uuid) -> Self {
        Self {
            interpretation_id: value,
        }
    }
}

impl Debug for InterpretationManager {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "InterpretationManager {{ }}")
    }
}

impl InterpretationManager {
    pub async fn new() -> Self {
        let client =
            redis::Client::open(env::var("REDIS_URL").expect("REDIS_URL not set")).unwrap();
        let manager = ConnectionManager::new(client).await.unwrap();
        Self {
            connection_manager: manager,
        }
    }

    pub fn request_interpretation(&self, reading: Reading) {
        let mut cloned = self.clone();
        tokio::spawn(async move {
            cloned.mark_started(reading.clone()).await;
            cloned.start_interpretation_request(reading).await;
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

    async fn start_interpretation_request(&mut self, reading: Reading) {
        tracing::debug!("start_interpretation_request");
        let result = webtarot_shared::explain::explain(&reading.question, &reading.cards).await;
        tracing::debug!(result = ?result, "start_interpretation_request result");
        let uuid = reading.id;
        let result = match result {
            Ok(result) => Interpretation::Done(reading, result),
            Err(e) => Interpretation::Failed(reading, e.to_string()),
        };
        let mut manager = self.connection_manager.clone();
        manager
            .set::<String, String, String>(
                self.key_for_uuid(uuid),
                serde_json::to_string(&result).unwrap(),
            )
            .await
            .unwrap();
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
        results.sort_by(|a, b| {
            b.reading()
                .created_at
                .cmp(&a.reading().created_at)
                .reverse()
        });
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

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct GetInterpretationResult {
    pub done: bool,
    pub error: String,
    pub interpretation: String,
    pub reading: Option<Reading>,
}

impl From<Interpretation> for GetInterpretationResult {
    fn from(value: Interpretation) -> Self {
        match value {
            Interpretation::Pending(reading) => Self {
                done: false,
                error: "".to_string(),
                interpretation: reading.question.clone(),
                reading: Some(reading),
            },
            Interpretation::Done(reading, result) => Self {
                done: true,
                error: Default::default(),
                interpretation: result,
                reading: Some(reading),
            },

            Interpretation::Failed(reading, err) => Self {
                done: true,
                error: err,
                interpretation: Default::default(),
                reading: Some(reading),
            },
        }
    }
}

impl From<Option<Interpretation>> for GetInterpretationResult {
    fn from(value: Option<Interpretation>) -> Self {
        if let Some(value) = value {
            return value.into();
        }
        Self {
            done: false,
            error: "Not found".to_string(),
            interpretation: "".to_string(),
            reading: None,
        }
    }
}
