use crate::reading::Reading;
use cached::{Cached, SizedCache};
use serde::{Deserialize, Serialize};
use std::fmt::{Debug, Formatter};
use std::sync::{Arc, Mutex};
use uuid::Uuid;
use webtarot_shared::explain::ExplainResult;

#[derive(Clone)]
pub struct InterpretationManager {
    interpretations: Arc<Mutex<SizedCache<Uuid, Option<ExplainResult>>>>,
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
            .filter(|k| interpretations.cache_get(k).unwrap().is_none())
            .count();
        let finished = all_keys
            .iter()
            .filter(|k| interpretations.cache_get(k).unwrap().is_some())
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
        self.mark_started(uuid);
        tokio::spawn(self.start_interpretation_request(reading));
    }

    fn mark_started(&self, uuid: Uuid) {
        let mut interpretations = self.interpretations.lock().unwrap();
        interpretations.cache_set(uuid, None);
    }

    #[tracing::instrument]
    async fn start_interpretation_request(self, reading: Reading) {
        tracing::debug!("start_interpretation_request");
        let result = webtarot_shared::explain::explain(&reading.question, &reading.cards).await;
        tracing::debug!(result = ?result, "start_interpretation_request result");
        let mut interpretations = self.interpretations.lock().unwrap();
        interpretations.cache_set(reading.id, Some(result));
    }

    pub fn get_interpretation(&self, uuid: Uuid) -> Option<Option<ExplainResult>> {
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
}

impl From<Option<ExplainResult>> for GetInterpretationResult {
    fn from(value: Option<ExplainResult>) -> Self {
        Self {
            done: value.is_some(),
            error: value
                .clone()
                .and_then(|v| v.err())
                .map(|e| e.to_string())
                .unwrap_or_default(),
            interpretation: value.and_then(|v| v.ok()).unwrap_or_default(),
        }
    }
}

impl From<Option<Option<ExplainResult>>> for GetInterpretationResult {
    fn from(value: Option<Option<ExplainResult>>) -> Self {
        if let Some(value) = value {
            return value.into();
        }
        Self {
            done: false,
            error: "Not found".to_string(),
            interpretation: "".to_string(),
        }
    }
}
