use serde::{Deserialize, Serialize};
use webtarot_shared::model::{Card, Deck};

#[derive(Deserialize, Debug)]
pub struct CreateReadingRequest {
    pub question: String,
    pub cards: u8,
}

#[derive(Serialize, Debug)]
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

#[derive(Debug, Clone)]
pub struct Reading {
    pub id: uuid::Uuid,
    pub question: String,
    pub shuffled_times: usize,
    pub cards: Vec<Card>,
}

#[tracing::instrument]
pub fn perform_reading(request: &CreateReadingRequest) -> Reading {
    let mut deck = Deck::build();
    let shuffles = deck.shuffle(&request.question);
    let cards = deck.draw(request.cards as usize);
    Reading {
        id: uuid::Uuid::new_v4(),
        question: request.question.clone(),
        shuffled_times: shuffles,
        cards,
    }
}
