use crate::model::Card;
use serde::Deserialize;
use std::error::Error as StdError;
use std::fmt;

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

#[derive(Debug)]
pub enum ExplainError {
    MissingApiKey,
    HttpClientBuild(reqwest::Error),
    Request(reqwest::Error),
    ApiError { status: reqwest::StatusCode, body: String },
    ParseResponse(reqwest::Error),
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

pub async fn explain(question: &str, cards: &[Card]) -> Result<String, ExplainError> {
    // Prepare a concise, helpful prompt for the model
    let cards_list = cards
        .iter()
        .enumerate()
        .map(|(i, c)| format!("{}. {}", i + 1, c))
        .collect::<Vec<_>>()
        .join("\n");

    let system = "Você é um tarólogo experiente. Interprete a leitura com empatia, de forma prática e objetiva. Use linguagem clara, em até 8 parágrafos.";

    let user = format!(
        "Pergunta: {}\nCartas (na ordem):\n{}\n\nFaça uma leitura que conecte as cartas à pergunta, considerando cartas invertidas quando indicado.",
        question, cards_list
    );

    // Read API key from environment
    let key = match std::env::var("OPENAI_KEY") {
        Ok(k) if !k.trim().is_empty() => k,
        _ => return Err(ExplainError::MissingApiKey),
    };

    // Build HTTP client
    let client = match reqwest::Client::builder()
        .user_agent("webtarot/0.1")
        .timeout(std::time::Duration::from_secs(60))
        .build()
    {
        Ok(c) => c,
        Err(e) => return Err(ExplainError::HttpClientBuild(e)),
    };

    // Compose request body for Chat Completions API
    let body = serde_json::json!({
        "model": "gpt-5-mini",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ]
    });

    let req = client
        .post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(key)
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        .json(&body);

    let resp = match req.send().await {
        Ok(r) => r,
        Err(e) => return Err(ExplainError::Request(e)),
    };

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(ExplainError::ApiError { status, body: text });
    }

    let parsed: ChatResponse = match resp.json().await {
        Ok(p) => p,
        Err(e) => return Err(ExplainError::ParseResponse(e)),
    };

    if let Some(first) = parsed.choices.into_iter().next() {
        if !first.message.content.trim().is_empty() {
            return Ok(first.message.content);
        }
    }

    Err(ExplainError::EmptyResponse)
}
