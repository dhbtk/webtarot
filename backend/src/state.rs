use crate::database::DbPool;
use crate::entity::interpretation::Interpretation;
use crate::repository::interpretation_repository::InterpretationRepository;
use redis::aio::ConnectionManager;
use std::env;

#[derive(Clone)]
pub struct AppState {
    pub redis_connection_manager: ConnectionManager,
    pub interpretation_broadcast: tokio::sync::broadcast::Sender<Interpretation>,
    pub postgresql_pool: DbPool,
}

impl AppState {
    pub async fn new() -> Self {
        let client =
            redis::Client::open(env::var("REDIS_URL").expect("REDIS_URL not set")).unwrap();
        let manager = ConnectionManager::new(client).await.unwrap();
        let (interpretation_broadcast, _) = tokio::sync::broadcast::channel(100);
        let postgresql_pool = crate::database::create_database_pool().await;
        let state = Self {
            redis_connection_manager: manager,
            interpretation_broadcast,
            postgresql_pool,
        };
        InterpretationRepository::from(state.clone())
            .copy_all_from_redis_to_db()
            .await;
        state
    }
}
