use diesel::{Connection, PgConnection};
use diesel_async::AsyncPgConnection;
use diesel_async::pooled_connection::AsyncDieselConnectionManager;
use diesel_async::pooled_connection::bb8::Pool;
use diesel_migrations::{EmbeddedMigrations, MigrationHarness, embed_migrations};
use std::env;

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

pub type DbPool = Pool<AsyncPgConnection>;
pub async fn create_database_pool() -> DbPool {
    let db_url = env::var("DATABASE_URL").expect("No DATABASE_URL variable set!");
    let config = AsyncDieselConnectionManager::<AsyncPgConnection>::new(db_url.clone());
    let pool = Pool::builder()
        .build(config)
        .await
        .expect("Could not build db pool");
    let mut conn = PgConnection::establish(&db_url).unwrap();
    conn.run_pending_migrations(MIGRATIONS)
        .expect("failed to run migrations");
    pool
}
