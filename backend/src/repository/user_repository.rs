use crate::database::DbPool;
use crate::entity::user::{AuthenticationResponse, CreateUserRequest, User};
use crate::model::{AccessToken, NewAccessToken};
use crate::repository::error::AppError;
use crate::state::AppState;
use axum::extract::FromRequestParts;
use axum::http::HeaderMap;
use chrono::Utc;
use diesel::ExpressionMethods;
use diesel::{OptionalExtension, QueryDsl, SelectableHelper};
use diesel_async::pooled_connection::bb8::PooledConnection;
use diesel_async::{AsyncPgConnection, RunQueryDsl};
use uuid::Uuid;

// Type alias for pooled async Postgres connection used in repository methods
type DbConn<'a> = PooledConnection<'a, AsyncPgConnection>;

#[derive(Clone)]
pub struct UserRepository {
    db_pool: DbPool,
}

impl From<AppState> for UserRepository {
    fn from(state: AppState) -> Self {
        Self {
            db_pool: state.postgresql_pool,
        }
    }
}

impl FromRequestParts<AppState> for UserRepository {
    type Rejection = ();
    async fn from_request_parts(
        _: &mut axum::http::request::Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        Ok(Self::from(state.clone()))
    }
}

impl UserRepository {
    pub async fn exists_by_id(&self, id: Uuid) -> bool {
        let mut conn = self.db_pool.get().await.unwrap();
        crate::schema::users::dsl::users
            .find(id)
            .select(crate::model::User::as_select())
            .first(&mut conn)
            .await
            .optional()
            .unwrap()
            .is_some()
    }

    pub async fn find_by_access_token(
        &self,
        access_token: &str,
    ) -> Option<(crate::model::User, crate::model::AccessToken)> {
        let mut conn = self.db_pool.get().await.unwrap();
        use crate::schema::{access_tokens, users};

        access_tokens::table
            .inner_join(users::table)
            .filter(access_tokens::dsl::token.eq(access_token))
            .select((
                crate::model::User::as_select(),
                crate::model::AccessToken::as_select(),
            ))
            .first::<(crate::model::User, crate::model::AccessToken)>(&mut conn)
            .await
            .optional()
            .unwrap()
    }

    pub async fn find_by_email(&self, email: &str) -> Result<crate::model::User, AppError> {
        let mut conn = self.db_pool.get().await.map_err(AppError::from)?;
        crate::schema::users::dsl::users
            .filter(crate::schema::users::dsl::email.eq(email))
            .select(crate::model::User::as_select())
            .first(&mut conn)
            .await
            .map_err(|e| AppError::from_diesel_with_log("Failed to find user by email", e))
    }

    pub async fn create_user(
        &self,
        id: Uuid,
        request: CreateUserRequest,
        headers: HeaderMap,
    ) -> Result<AuthenticationResponse, AppError> {
        request.validate()?;
        let ip = Self::extract_user_ip(&headers);
        let user_agent = Self::extract_user_agent(&headers);
        let mut conn = self.db_pool.get().await.map_err(AppError::from)?;
        let user = crate::model::User {
            id,
            created_at: Utc::now().naive_utc(),
            updated_at: Utc::now().naive_utc(),
            email: request.email,
            name: request.name,
            self_description: request.self_description,
            password_digest: self.password_digest(&request.password),
        };
        let access_token = crate::model::NewAccessToken {
            user_id: id,
            created_at: Utc::now().naive_utc(),
            token: self.generate_token(),
            deleted_at: None,
            last_user_ip: ip.to_string(),
            last_user_agent: user_agent.to_string(),
        };
        diesel::insert_into(crate::schema::users::table)
            .values(user.clone())
            .execute(&mut conn)
            .await
            .map_err(|e| AppError::from_diesel_with_log("Failed to insert user", e))?;
        let access_token = Self::insert_access_token(&mut conn, access_token).await?;
        Ok((user, access_token).into())
    }

    async fn insert_access_token(
        mut conn: &mut DbConn<'_>,
        access_token: NewAccessToken,
    ) -> Result<AccessToken, AppError> {
        diesel::insert_into(crate::schema::access_tokens::table)
            .values(access_token)
            .returning(crate::model::AccessToken::as_returning())
            .get_result(&mut conn)
            .await
            .map_err(|e| AppError::from_diesel_with_log("Failed to insert access token", e))
    }

    pub async fn log_in(
        &self,
        email: &str,
        password: &str,
        headers: &HeaderMap,
    ) -> Result<AuthenticationResponse, AppError> {
        let mut conn = self.db_pool.get().await.map_err(AppError::from)?;
        let user = self.find_by_email(email).await?;
        if password_auth::verify_password(password, &user.password_digest).is_ok() {
            let access_token = crate::model::NewAccessToken {
                user_id: user.id,
                created_at: Utc::now().naive_utc(),
                token: self.generate_token(),
                deleted_at: None,
                last_user_ip: Self::extract_user_ip(headers),
                last_user_agent: Self::extract_user_agent(headers),
            };
            let access_token = Self::insert_access_token(&mut conn, access_token).await?;
            return Ok((user, access_token).into());
        }
        Err(AppError::Forbidden)
    }

    fn extract_user_agent(headers: &HeaderMap) -> String {
        headers
            .get("user-agent")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("unknown")
            .into()
    }

    fn extract_user_ip(headers: &HeaderMap) -> String {
        headers
            .get("x-forwarded-for")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("127.0.0.1")
            .into()
    }

    fn password_digest(&self, password: &str) -> String {
        password_auth::generate_hash(password)
    }

    fn generate_token(&self) -> String {
        format!("at-{}", Uuid::new_v4())
    }
}

impl From<(crate::model::User, crate::model::AccessToken)> for AuthenticationResponse {
    fn from(value: (crate::model::User, crate::model::AccessToken)) -> Self {
        let (user, access_token) = value;
        AuthenticationResponse {
            access_token: access_token.token.clone(),
            user: User::from((user, access_token)),
        }
    }
}
