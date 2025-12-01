use crate::database::DbPool;
use crate::entity::interpretation::Interpretation;
use crate::repository::interpretation_repository::InterpretationRepository;
use redis::aio::ConnectionManager;
use std::env;

#[derive(Clone)]
pub struct AppEnviroment {
    pub redis_url: String,
    pub database_url: String,
    pub openai_api_key: String,
}

impl Default for AppEnviroment {
    fn default() -> Self {
        Self::new()
    }
}

impl AppEnviroment {
    pub fn new() -> Self {
        Self {
            redis_url: env::var("REDIS_URL").expect("REDIS_URL not set"),
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL not set"),
            openai_api_key: env::var("OPENAI_KEY").expect("OPENAI_KEY not set"),
        }
    }
}

#[derive(Clone)]
pub struct AppState {
    pub env: AppEnviroment,
    pub redis_connection_manager: ConnectionManager,
    pub interpretation_broadcast: tokio::sync::broadcast::Sender<Interpretation>,
    pub postgresql_pool: DbPool,
}

impl AppState {
    pub async fn new() -> Self {
        let env = AppEnviroment::new();
        let client = redis::Client::open(env.redis_url.clone()).unwrap();
        let manager = ConnectionManager::new(client).await.unwrap();
        let (interpretation_broadcast, _) = tokio::sync::broadcast::channel(100);
        let postgresql_pool = crate::database::create_database_pool(env.database_url.clone()).await;
        let state = Self {
            env,
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
