use crate::model::Card;
use crate::t;
use serde::Deserialize;
use std::error::Error as StdError;
use std::fmt;
use std::sync::Arc;
use std::time::Duration;

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: Message,
}

#[derive(Deserialize)]
struct Message {
    content: String,
}

pub type ExplainResult = Result<String, ExplainError>;

#[derive(Clone, Debug)]
pub enum ExplainError {
    MissingApiKey,
    HttpClientBuild(Arc<reqwest::Error>),
    Request(Arc<reqwest::Error>),
    ApiError {
        status: reqwest::StatusCode,
        body: String,
    },
    ParseResponse(Arc<reqwest::Error>),
    EmptyResponse,
}

impl fmt::Display for ExplainError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ExplainError::MissingApiKey => write!(
                f,
                "Não encontrei a variável de ambiente OPENAI_KEY. Defina-a com sua chave da OpenAI."
            ),
            ExplainError::HttpClientBuild(e) => write!(f, "Erro criando cliente HTTP: {}", e),
            ExplainError::Request(e) => write!(f, "Falha ao chamar a API da OpenAI: {}", e),
            ExplainError::ApiError { status, body } => {
                write!(f, "A API da OpenAI retornou erro ({}): {}", status, body)
            }
            ExplainError::ParseResponse(e) => write!(f, "Falha ao ler resposta da OpenAI: {}", e),
            ExplainError::EmptyResponse => write!(
                f,
                "Não foi possível obter a interpretação das cartas no momento."
            ),
        }
    }
}

impl StdError for ExplainError {
    fn source(&self) -> Option<&(dyn StdError + 'static)> {
        match self {
            ExplainError::HttpClientBuild(e)
            | ExplainError::Request(e)
            | ExplainError::ParseResponse(e) => Some(e),
            _ => None,
        }
    }
}

#[derive(Clone)]
pub struct InterpretationService {
    client: reqwest::Client,
    api_key: String,
}

impl InterpretationService {
    pub fn new(api_key: String) -> Self {
        let client = reqwest::Client::builder()
            .user_agent("webtarot/0.1")
            .timeout(Duration::from_secs(120))
            .build()
            .unwrap();
        Self { client, api_key }
    }

    pub async fn explain(
        &self,
        question: &str,
        cards: &[Card],
        user_name: Option<String>,
        user_self_description: Option<String>,
    ) -> ExplainResult {
        let user = Self::get_user_prompt(question, cards, user_name, user_self_description);

        // Read API key from environment
        let key = self.api_key.clone();

        // Build HTTP client
        let client = self.client.clone();

        // Compose request body for Chat Completions API using i18n system prompt
        let system_prompt = t!("system.prompt");

        let body = serde_json::json!({
            "model": "gpt-5.1",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user}
            ]
        });

        let req = client
            .post("https://api.openai.com/v1/chat/completions")
            .bearer_auth(key)
            .header(reqwest::header::CONTENT_TYPE, "application/json")
            .timeout(Duration::from_mins(5))
            .json(&body);

        let resp = match req.send().await {
            Ok(r) => r,
            Err(e) => return Err(ExplainError::Request(Arc::new(e))),
        };

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(ExplainError::ApiError { status, body: text });
        }

        let parsed: ChatResponse = match resp.json().await {
            Ok(p) => p,
            Err(e) => return Err(ExplainError::ParseResponse(Arc::new(e))),
        };

        if let Some(first) = parsed.choices.into_iter().next()
            && !first.message.content.trim().is_empty()
        {
            return Ok(first.message.content);
        }

        Err(ExplainError::EmptyResponse)
    }

    fn get_user_prompt(
        question: &str,
        cards: &[Card],
        user_name: Option<String>,
        user_self_description: Option<String>,
    ) -> String {
        // Prepare a concise, helpful prompt for the model with localized card names
        let cards_list = cards
            .iter()
            .enumerate()
            .map(|(i, c)| format!("{}. {}", i + 1, c))
            .collect::<Vec<_>>()
            .join("\n");

        // Include current local date/time to provide temporal context to the model
        let now = chrono::Local::now().to_rfc3339();

        let label_now = t!("labels.now");
        let label_question = t!("labels.question");
        let label_user_name = t!("labels.user_name");
        let label_user_self_description = t!("labels.user_self_description");
        let label_cards = t!("labels.cards_in_order");

        let mut user = format!(
            "{} {}\n{} {}\n{}\n{}",
            label_now, now, label_question, question, label_cards, cards_list
        );

        if let Some(name) = user_name {
            user.push('\n');
            user.push_str(&format!("{} {}", label_user_name, name));
        }

        if let Some(desc) = user_self_description {
            user.push('\n');
            user.push_str(&format!("{} {}", label_user_self_description, desc));
        }
        user
    }
}
