#![cfg(test)]
use crate::entity::interpretation::Interpretation;
use crate::entity::reading::Reading;
use crate::repository::interpretation_repository::InterpretationRepository;
use crate::state::AppState;
use mockito::{Matcher, Server, ServerGuard};
use tokio::time::{Duration, timeout};
use uuid::Uuid;
use webtarot_shared::explain; // ensure dependency resolved

/// Start a mock server for the OpenAI Chat Completions API and point the
/// application to it via the OPENAI_BASE_URL env var.
/// Returns the mock server (so its lifetime is tied to the test) and the text used.
pub async fn setup_mock_openai(mocked_text: &str) -> (ServerGuard, String) {
    let mut server = Server::new_async().await;
    let base_url = server.url();
    // Safety: tests run single-threaded via `serial_test`, so env var override is acceptable.
    unsafe {
        std::env::set_var("OPENAI_BASE_URL", &base_url);
    }

    // The repository uses `webtarot_shared::explain::InterpretationService` which targets
    // POST /v1/chat/completions with model "gpt-5.1"; we emulate a minimal response.
    server
        .mock("POST", "/v1/chat/completions")
        .match_header("authorization", Matcher::Regex("(?i)^Bearer .+".into()))
        .match_body(Matcher::PartialJson(
            serde_json::json!({"model": "gpt-5.1"}),
        ))
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(
            serde_json::json!({
                "choices": [
                    {"message": {"content": mocked_text}}
                ]
            })
            .to_string(),
        )
        .create();

    (server, mocked_text.to_string())
}

/// Subscribe to the interpretation broadcast channel from state.
pub fn subscribe_to_repo(state: &AppState) -> tokio::sync::broadcast::Receiver<Interpretation> {
    let repo = InterpretationRepository::from(state.clone());
    repo.subscribe()
}

/// Wait for an Interpretation::Done event for the specified id, with timeout seconds.
pub async fn wait_for_done(
    rx: &mut tokio::sync::broadcast::Receiver<Interpretation>,
    interpretation_id: Uuid,
    timeout_secs: u64,
) -> Result<(Reading, String), String> {
    let deadline = Duration::from_secs(timeout_secs);
    for _ in 0..(timeout_secs * 5).max(1) {
        // poll a few times within the global timeout
        match timeout(deadline, rx.recv()).await {
            Ok(Ok(evt)) => match evt {
                Interpretation::Done(reading, text) if reading.id == interpretation_id => {
                    return Ok((reading, text));
                }
                Interpretation::Failed(reading, err) if reading.id == interpretation_id => {
                    return Err(format!("Interpretation failed: {}", err));
                }
                _ => {
                    // Ignore events for other readings
                }
            },
            Ok(Err(_)) => {
                // channel closed; break with error
                return Err("Broadcast channel closed".to_string());
            }
            Err(_) => {
                // timeout for this poll, continue trying until global attempts exhausted
            }
        }
    }
    Err("Timed out waiting for Interpretation::Done".to_string())
}
