use crate::reading::Reading;
use redis::AsyncCommands;
use redis::aio::ConnectionManager;
use serde::{Deserialize, Serialize};
use std::env;
use std::fmt::{Debug, Formatter};
use uuid::Uuid;

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

    #[tracing::instrument]
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

    #[tracing::instrument]
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
