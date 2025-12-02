use diesel::{Connection, PgConnection};
use diesel_async::AsyncPgConnection;
use diesel_async::pooled_connection::AsyncDieselConnectionManager;
use diesel_async::pooled_connection::bb8::Pool;
use diesel_migrations::{EmbeddedMigrations, MigrationHarness, embed_migrations};

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

pub type DbPool = Pool<AsyncPgConnection>;
pub async fn create_database_pool(db_url: String) -> DbPool {
    tracing::info!(?db_url, "connecting to postgresql");
    let config = AsyncDieselConnectionManager::<AsyncPgConnection>::new(db_url.clone());
    let pool = Pool::builder()
        .build(config)
        .await
        .expect("Could not build db pool");
    let mut conn = PgConnection::establish(&db_url).unwrap();
    conn.run_pending_migrations(MIGRATIONS)
        .expect("failed to run migrations");
    #[cfg(test)]
    {
        use diesel::RunQueryDsl;
        diesel::delete(crate::schema::users::dsl::users)
            .execute(&mut conn)
            .expect("Error deleting users to clear db");
        diesel::delete(crate::schema::readings::dsl::readings)
            .execute(&mut conn)
            .expect("Error deleting readings to clear db");
    }
    pool
}
