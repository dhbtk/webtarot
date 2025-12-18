use crate::database::DbPool;
use crate::entity::interpretation::Interpretation;
use redis::aio::ConnectionManager;
use std::env;

#[derive(Clone)]
pub struct AppEnvironment {
    pub environment: RuntimeEnv,
    pub redis_url: String,
    pub database_url: String,
    pub openai_api_key: String,
    pub google_api_key: String,
}

impl AppEnvironment {
    pub fn is_development(&self) -> bool {
        self.environment == RuntimeEnv::Development
    }
}

impl Default for AppEnvironment {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum RuntimeEnv {
    Development,
    Production,
}

impl RuntimeEnv {
    pub fn from_env() -> Self {
        if env::var("RUST_ENV").unwrap_or_else(|_| "development".to_string()) == "production" {
            Self::Production
        } else {
            Self::Development
        }
    }
}

impl AppEnvironment {
    pub fn new() -> Self {
        Self {
            environment: RuntimeEnv::from_env(),
            redis_url: env::var("REDIS_URL").expect("REDIS_URL not set"),
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL not set"),
            openai_api_key: env::var("OPENAI_KEY").expect("OPENAI_KEY not set"),
            google_api_key: env::var("GOOG_API_KEY").unwrap_or_default(),
        }
    }
}

#[derive(Clone)]
pub struct AppState {
    pub env: AppEnvironment,
    pub redis_connection_manager: ConnectionManager,
    pub interpretation_broadcast: tokio::sync::broadcast::Sender<Interpretation>,
    pub postgresql_pool: DbPool,
}

impl AppState {
    pub async fn new() -> Self {
        let env = AppEnvironment::new();
        Self::from_env(env).await
    }

    pub async fn from_env(env: AppEnvironment) -> Self {
        let client = redis::Client::open(env.redis_url.clone()).unwrap();
        let manager = ConnectionManager::new(client).await.unwrap();
        let (interpretation_broadcast, _) = tokio::sync::broadcast::channel(100);
        let postgresql_pool = crate::database::create_database_pool(env.database_url.clone()).await;
        Self {
            env,
            redis_connection_manager: manager,
            interpretation_broadcast,
            postgresql_pool,
        }
    }
}
