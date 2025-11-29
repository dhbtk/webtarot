use crate::entity::reading::Reading;
use crate::middleware::user::User;
use rust_i18n::t;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use webtarot_shared::explain::ExplainError;
use webtarot_shared::model::Card;

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

impl From<Interpretation> for crate::model::Reading {
    fn from(value: Interpretation) -> Self {
        use crate::model::InterpretationStatus;

        let (reading, status, interpretation_text, interpretation_error) = match value {
            Interpretation::Pending(r) => (
                r,
                InterpretationStatus::Pending,
                String::new(),
                String::new(),
            ),
            Interpretation::Done(r, text) => (r, InterpretationStatus::Done, text, String::new()),
            Interpretation::Failed(r, err) => (r, InterpretationStatus::Failed, String::new(), err),
        };

        crate::model::Reading {
            id: reading.id,
            created_at: reading.created_at.naive_utc(),
            question: reading.question,
            context: String::new(),
            cards: reading.cards.into(),
            shuffled_times: reading.shuffled_times as i32,
            user_id: reading.user_id.unwrap_or_else(Uuid::nil),
            user_name: String::new(),
            user_self_description: String::new(),
            interpretation_status: status,
            interpretation_text,
            interpretation_error,
            deleted_at: None,
        }
    }
}

impl From<crate::model::Reading> for Interpretation {
    fn from(value: crate::model::Reading) -> Self {
        use crate::model::InterpretationStatus;

        let reading = Reading {
            id: value.id,
            created_at: chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(
                value.created_at,
                chrono::Utc,
            ),
            question: value.question,
            shuffled_times: value.shuffled_times as usize,
            cards: value.cards.into(),
            user_id: if value.user_id.is_nil() {
                None
            } else {
                Some(value.user_id)
            },
        };

        match value.interpretation_status {
            InterpretationStatus::Pending => Interpretation::Pending(reading),
            InterpretationStatus::Done => Interpretation::Done(reading, value.interpretation_text),
            InterpretationStatus::Failed => {
                Interpretation::Failed(reading, value.interpretation_error)
            }
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
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
            error: t!("errors.not_found").to_string(),
            interpretation: "".to_string(),
            reading: None,
        }
    }
}

pub fn localize_explain_error(e: &ExplainError) -> String {
    match e {
        ExplainError::MissingApiKey => t!("errors.missing_openai_key").to_string(),
        ExplainError::HttpClientBuild(err) => {
            t!("errors.http_client_build", error = err.to_string()).to_string()
        }
        ExplainError::Request(err) => {
            t!("errors.request_failed", error = err.to_string()).to_string()
        }
        ExplainError::ApiError { status, body } => t!(
            "errors.api_error",
            status = status.as_u16().to_string(),
            body = body
        )
        .to_string(),
        ExplainError::ParseResponse(err) => {
            t!("errors.parse_response", error = err.to_string()).to_string()
        }
        ExplainError::EmptyResponse => t!("errors.empty_response").to_string(),
    }
}
