use crate::entity::interpretation::Interpretation;
use redis::aio::ConnectionManager;
use std::env;

#[derive(Clone)]
pub struct AppState {
    pub connection_manager: ConnectionManager,
    pub interpretation_broadcast: tokio::sync::broadcast::Sender<Interpretation>,
}

impl AppState {
    pub async fn new() -> Self {
        let client =
            redis::Client::open(env::var("REDIS_URL").expect("REDIS_URL not set")).unwrap();
        let manager = ConnectionManager::new(client).await.unwrap();
        let (interpretation_broadcast, _) = tokio::sync::broadcast::channel(100);
        Self {
            connection_manager: manager,
            interpretation_broadcast,
        }
    }
}
