use chrono::NaiveDateTime;
use diesel::deserialize::FromSql;
use diesel::pg::{Pg, PgValue};
use diesel::sql_types::Jsonb;
use diesel::{AsExpression, FromSqlRow, Insertable, Queryable, Selectable};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use webtarot_shared::model::Card;

#[derive(Debug, Clone, Insertable, Queryable, Selectable)]
#[diesel(table_name = crate::schema::readings)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Reading {
    pub id: Uuid,
    pub created_at: NaiveDateTime,
    pub question: String,
    pub context: String,
    pub cards: Cards,
    pub shuffled_times: i32,
    pub user_id: Uuid,
    pub user_name: String,
    pub user_self_description: String,
    pub interpretation_status: String,
    pub interpretation_text: String,
    pub interpretation_error: String,
    pub deleted_at: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, FromSqlRow, Serialize, Deserialize, AsExpression)]
#[diesel(sql_type = Jsonb)]
pub struct Cards(Vec<Card>);

impl From<Vec<Card>> for Cards {
    fn from(cards: Vec<Card>) -> Self {
        Self(cards)
    }
}

impl From<Cards> for Vec<Card> {
    fn from(cards: Cards) -> Self {
        cards.0
    }
}

impl FromSql<Jsonb, Pg> for Cards {
    fn from_sql(bytes: PgValue<'_>) -> diesel::deserialize::Result<Self> {
        let value = <serde_json::Value as FromSql<Jsonb, Pg>>::from_sql(bytes)?;
        Ok(serde_json::from_value(value)?)
    }
}
