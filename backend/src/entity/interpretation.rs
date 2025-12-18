use crate::entity::reading::Reading;
use crate::entity::user::User;
use chrono::NaiveDateTime;
use rust_i18n::t;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use webtarot_shared::explain::ExplainError;
use webtarot_shared::model::Card;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Interpretation {
    Pending(Reading),
    Done(Reading, String, NaiveDateTime),
    Failed(Reading, String),
}

impl Interpretation {
    pub fn is_done(&self) -> bool {
        matches!(self, Self::Done(..))
    }
    pub fn reading(&self) -> &Reading {
        match self {
            Self::Pending(reading) => reading,
            Self::Done(reading, _, _) => reading,
            Self::Failed(reading, _) => reading,
        }
    }

    pub fn into_reading(self) -> Reading {
        match self {
            Self::Pending(reading) => reading,
            Self::Done(reading, _, _) => reading,
            Self::Failed(reading, _) => reading,
        }
    }

    pub fn reading_mut(&mut self) -> &mut Reading {
        match self {
            Self::Pending(reading) => reading,
            Self::Done(reading, _, _) => reading,
            Self::Failed(reading, _) => reading,
        }
    }
}

impl From<Interpretation> for crate::model::Reading {
    fn from(value: Interpretation) -> Self {
        use crate::model::InterpretationStatus;

        let (
            reading,
            status,
            interpretation_text,
            interpretation_error,
            other_interpretation_done_at,
        ) = match value {
            Interpretation::Pending(r) => (
                r,
                InterpretationStatus::Pending,
                String::new(),
                String::new(),
                None,
            ),
            Interpretation::Done(r, text, ts) => {
                (r, InterpretationStatus::Done, text, String::new(), Some(ts))
            }
            Interpretation::Failed(r, err) => {
                (r, InterpretationStatus::Failed, String::new(), err, None)
            }
        };

        crate::model::Reading {
            id: reading.id,
            created_at: reading.created_at.naive_utc(),
            question: reading.question,
            context: reading.context,
            cards: reading.cards.into(),
            shuffled_times: reading.shuffled_times as i32,
            user_id: reading.user_id.unwrap_or_else(Uuid::nil),
            user_name: reading.user_name,
            user_self_description: reading.user_self_description,
            interpretation_status: status,
            interpretation_text,
            interpretation_error,
            deleted_at: None,
            interpretation_done_at: other_interpretation_done_at,
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
            user_name: value.user_name,
            user_self_description: value.user_self_description,
            context: value.context,
        };

        match value.interpretation_status {
            InterpretationStatus::Pending => Interpretation::Pending(reading),
            InterpretationStatus::Done => Interpretation::Done(
                reading,
                value.interpretation_text,
                value.interpretation_done_at.unwrap(),
            ),
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
    pub context: String,
}

impl From<(CreateInterpretationRequest, &User)> for Reading {
    fn from((value, user): (CreateInterpretationRequest, &User)) -> Self {
        Reading {
            id: Uuid::new_v4(),
            created_at: chrono::Utc::now(),
            question: value.question,
            shuffled_times: 0,
            cards: value.cards,
            user_id: Some(user.id()),
            user_name: user.name().unwrap_or_default().to_string(),
            user_self_description: user.self_description().unwrap_or_default().to_string(),
            context: value.context.clone(),
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
    pub interpretation_done_at: Option<NaiveDateTime>,
}

impl From<Interpretation> for GetInterpretationResult {
    fn from(value: Interpretation) -> Self {
        match value {
            Interpretation::Pending(reading) => Self {
                done: false,
                error: "".to_string(),
                interpretation: reading.question.clone(),
                reading: Some(reading),
                interpretation_done_at: None,
            },
            Interpretation::Done(reading, result, ts) => Self {
                done: true,
                error: Default::default(),
                interpretation: result,
                reading: Some(reading),
                interpretation_done_at: Some(ts),
            },

            Interpretation::Failed(reading, err) => Self {
                done: true,
                error: err,
                interpretation: Default::default(),
                reading: Some(reading),
                interpretation_done_at: None,
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
            interpretation_done_at: None,
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
