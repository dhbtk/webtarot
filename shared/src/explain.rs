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

        // Allow overriding the base URL via env var for testing
        let base_url = std::env::var("OPENAI_BASE_URL")
            .unwrap_or_else(|_| "https://api.openai.com".to_string());
        let endpoint = format!("{}/v1/chat/completions", base_url.trim_end_matches('/'));

        let req = client
            .post(endpoint)
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{Arcana, Card, MajorArcana};
    use mockito::{Matcher, Server};
    use serde_json::json;

    fn sample_cards() -> Vec<Card> {
        vec![
            Card {
                arcana: Arcana::Major {
                    name: MajorArcana::Fool,
                },
                flipped: false,
            },
            Card {
                arcana: Arcana::Major {
                    name: MajorArcana::Magician,
                },
                flipped: true,
            },
            Card {
                arcana: Arcana::Major {
                    name: MajorArcana::HighPriestess,
                },
                flipped: false,
            },
        ]
    }

    #[tokio::test]
    async fn explain_sends_expected_request_and_returns_text() {
        // Dedicated mock server instance for this test
        let mut server = Server::new_async().await;
        let base_url = server.url();
        unsafe {
            std::env::set_var("OPENAI_BASE_URL", &base_url);
        }

        let mocked_text = "This is a mocked explanation";
        let _m = server
            .mock("POST", "/v1/chat/completions")
            .match_header(
                "content-type",
                Matcher::Any, // reqwest may set charset; we assert presence later in JSON
            )
            .match_header("authorization", Matcher::Regex("(?i)^Bearer .+".into()))
            .match_body(Matcher::AllOf(vec![
                Matcher::PartialJson(json!({"model": "gpt-5.1"})),
                // Verify that the user message contains the question string
                Matcher::Regex(r"Will I get the job\?".into()),
            ]))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(
                json!({
                    "choices": [
                        {"message": {"content": mocked_text}}
                    ]
                })
                .to_string(),
            )
            .create();

        let svc = InterpretationService::new("test_key".into());

        let cards = sample_cards();
        let result = svc
            .explain(
                "Will I get the job?",
                &cards,
                Some("Alice".to_string()),
                Some("A software engineer".to_string()),
            )
            .await
            .expect("explain should succeed");

        assert_eq!(result, mocked_text);
    }

    #[test]
    fn get_user_prompt_cases() {
        let cards = sample_cards();

        let prompt_no_user =
            InterpretationService::get_user_prompt("What is my path?", &cards, None, None);
        assert!(
            prompt_no_user.contains(t!("labels.question").as_ref()),
            "should include localized question label"
        );
        assert!(
            prompt_no_user.contains(t!("labels.cards_in_order").as_ref()),
            "should include cards label"
        );
        assert!(
            !prompt_no_user.contains(t!("labels.user_name").as_ref()),
            "should not include user name label"
        );
        assert!(prompt_no_user.contains("1."), "should enumerate cards");

        let prompt_with_name = InterpretationService::get_user_prompt(
            "What is my path?",
            &cards,
            Some("Bob".into()),
            None,
        );
        assert!(prompt_with_name.contains(&format!("{} Bob", t!("labels.user_name").as_ref())));
        assert!(!prompt_with_name.contains(t!("labels.user_self_description").as_ref()));

        let prompt_with_desc = InterpretationService::get_user_prompt(
            "What is my path?",
            &cards,
            None,
            Some("Curious learner".into()),
        );
        assert!(prompt_with_desc.contains(&format!(
            "{} Curious learner",
            t!("labels.user_self_description").as_ref()
        )));

        let prompt_with_both = InterpretationService::get_user_prompt(
            "What is my path?",
            &cards,
            Some("Carol".into()),
            Some("Explorer".into()),
        );
        assert!(prompt_with_both.contains(&format!("{} Carol", t!("labels.user_name").as_ref())));
        assert!(prompt_with_both.contains(&format!(
            "{} Explorer",
            t!("labels.user_self_description").as_ref()
        )));
    }
}
