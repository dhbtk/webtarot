use crate::reading::Reading;
use cached::{Cached, SizedCache};
use serde::{Deserialize, Serialize};
use std::fmt::{Debug, Formatter};
use std::sync::{Arc, Mutex};
use uuid::Uuid;
use webtarot_shared::explain::ExplainResult;

#[derive(Clone)]
pub struct InterpretationManager {
    interpretations: Arc<Mutex<SizedCache<Uuid, Interpretation>>>,
}

#[derive(Debug, Clone)]
pub enum Interpretation {
    Pending(Reading),
    Done(Reading, ExplainResult),
}

impl Interpretation {
    pub fn is_done(&self) -> bool {
        matches!(self, Self::Done(_, _))
    }
    pub fn reading(&self) -> &Reading {
        match self {
            Self::Pending(reading) => reading,
            Self::Done(reading, _) => reading,
        }
    }
}

impl Default for InterpretationManager {
    fn default() -> Self {
        Self {
            interpretations: Arc::new(Mutex::new(SizedCache::with_size(512 * 1024))),
        }
    }
}

impl Debug for InterpretationManager {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let mut interpretations = self.interpretations.lock().unwrap();
        let all_keys = interpretations.key_order().copied().collect::<Vec<_>>();
        let in_flight = all_keys
            .iter()
            .filter(|k| !interpretations.cache_get(k).unwrap().is_done())
            .count();
        let finished = all_keys
            .iter()
            .filter(|k| interpretations.cache_get(k).unwrap().is_done())
            .count();
        write!(
            f,
            "InterpretationManager {{ in_flight: {} finished: {} }}",
            in_flight, finished
        )
    }
}

impl InterpretationManager {
    #[tracing::instrument]
    pub fn request_interpretation(self, reading: Reading) {
        let uuid = reading.id;
        self.mark_started(reading.clone());
        tokio::spawn(self.start_interpretation_request(reading));
    }

    fn mark_started(&self, reading: Reading) {
        let mut interpretations = self.interpretations.lock().unwrap();
        interpretations.cache_set(reading.id, Interpretation::Pending(reading));
    }

    #[tracing::instrument]
    async fn start_interpretation_request(self, reading: Reading) {
        tracing::debug!("start_interpretation_request");
        let result = webtarot_shared::explain::explain(&reading.question, &reading.cards).await;
        tracing::debug!(result = ?result, "start_interpretation_request result");
        let mut interpretations = self.interpretations.lock().unwrap();
        interpretations.cache_set(reading.id, Interpretation::Done(reading, result));
    }

    pub fn get_interpretation(&self, uuid: Uuid) -> Option<Interpretation> {
        let mut interpretations = self.interpretations.lock().unwrap();
        if let Some(interpretation) = interpretations.cache_get(&uuid) {
            return Some((*interpretation).clone());
        }
        None
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
            Interpretation::Pending(reading) => {
                Self {
                    done: false,
                    error: "".to_string(),
                    interpretation: reading.question.clone(),
                    reading: Some(reading),
                }
            }
            Interpretation::Done(reading, result) => {
                Self {
                    done: true,
                    error: result.clone().err().map(|e| e.to_string()).unwrap_or_default(),
                    interpretation: result.ok().unwrap_or_default(),
                    reading: Some(reading),
                }
            }
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
