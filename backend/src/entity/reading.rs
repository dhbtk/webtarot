use crate::entity::user::User;
use serde::{Deserialize, Serialize};
use tracing::instrument;
use webtarot_shared::explain::InterpretationBackend;
use webtarot_shared::model::{Card, Deck};

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CreateReadingRequest {
    pub question: String,
    pub cards: u8,
    pub context: String,
    pub backend: InterpretationBackend,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CreateReadingResponse {
    pub shuffled_times: usize,
    pub cards: Vec<Card>,
    pub interpretation_id: String,
}

impl From<Reading> for CreateReadingResponse {
    fn from(reading: Reading) -> Self {
        Self {
            shuffled_times: reading.shuffled_times,
            cards: reading.cards,
            interpretation_id: reading.id.to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Reading {
    pub id: uuid::Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub question: String,
    pub shuffled_times: usize,
    pub cards: Vec<Card>,
    pub user_id: Option<uuid::Uuid>,
    pub user_name: String,
    pub user_self_description: String,
    pub context: String,
    #[serde(default)]
    pub backend: Option<InterpretationBackend>,
}

#[instrument]
pub fn perform_reading(request: &CreateReadingRequest, user: &User) -> Reading {
    let mut deck = Deck::build();
    let shuffles = deck.shuffle(&request.question);
    let cards = deck.draw(request.cards as usize);
    Reading {
        id: uuid::Uuid::new_v4(),
        created_at: chrono::Utc::now(),
        question: request.question.clone(),
        shuffled_times: shuffles,
        cards,
        user_id: Some(user.id()),
        user_name: user.name().unwrap_or_default().to_string(),
        user_self_description: user.self_description().unwrap_or_default().to_string(),
        context: request.context.clone(),
        backend: Some(request.backend.clone()),
    }
}
