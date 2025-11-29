use crate::database::DbPool;
use crate::entity::user::{CreateUserRequest, CreateUserResponse, User};
use crate::repository::error::AppError;
use crate::state::AppState;
use axum::extract::FromRequestParts;
use axum::http::HeaderMap;
use chrono::Utc;
use diesel::ExpressionMethods;
use diesel::{OptionalExtension, QueryDsl, SelectableHelper};
use diesel_async::RunQueryDsl;
use uuid::Uuid;

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

    pub async fn create_user(
        &self,
        id: Uuid,
        request: CreateUserRequest,
        headers: HeaderMap,
    ) -> Result<CreateUserResponse, AppError> {
        request.validate()?;
        let ip = headers
            .get("x-forwarded-for")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("127.0.0.1");
        let user_agent = headers
            .get("user-agent")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("unknown");
        let mut conn = self
            .db_pool
            .get()
            .await
            .map_err(|e| AppError::internal_with_log("Failed to get DB connection", e))?;
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
        let access_token = diesel::insert_into(crate::schema::access_tokens::table)
            .values(access_token)
            .returning(crate::model::AccessToken::as_returning())
            .get_result(&mut conn)
            .await
            .map_err(|e| AppError::from_diesel_with_log("Failed to insert access token", e))?;
        Ok((user, access_token).into())
    }

    fn password_digest(&self, password: &str) -> String {
        password_auth::generate_hash(password)
    }

    fn generate_token(&self) -> String {
        format!("at-{}", Uuid::new_v4())
    }
}

impl From<(crate::model::User, crate::model::AccessToken)> for CreateUserResponse {
    fn from(value: (crate::model::User, crate::model::AccessToken)) -> Self {
        let (user, access_token) = value;
        CreateUserResponse {
            access_token: access_token.token.clone(),
            user: User::from((user, access_token)),
        }
    }
}
