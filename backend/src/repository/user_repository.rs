use crate::database::DbPool;
use crate::state::AppState;
use axum::extract::FromRequestParts;
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
}
