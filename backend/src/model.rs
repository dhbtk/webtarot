use chrono::NaiveDateTime;
use diesel::deserialize::FromSql;
use diesel::pg::{Pg, PgValue};
use diesel::serialize::{IsNull, Output, ToSql};
use diesel::sql_types::{Jsonb, Text};
use diesel::{AsChangeset, AsExpression, FromSqlRow, Insertable, Queryable, Selectable};
use serde::{Deserialize, Serialize};
use std::io::Write;
use uuid::Uuid;
use webtarot_shared::model::Card;

#[derive(Debug, Clone, Insertable, Queryable, Selectable, AsChangeset)]
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
    pub interpretation_status: InterpretationStatus,
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

impl ToSql<Jsonb, Pg> for Cards {
    fn to_sql<'b>(&'b self, out: &mut Output<'b, '_, Pg>) -> diesel::serialize::Result {
        // JSONB binary format: 1 byte version (currently 1), followed by JSON payload bytes.
        let bytes = serde_json::to_vec(&self.0)
            .map_err(Box::<dyn std::error::Error + Send + Sync>::from)?;
        out.write_all(&[1])?; // jsonb version
        out.write_all(&bytes)?;
        Ok(IsNull::No)
    }
}

#[derive(Debug, Clone, FromSqlRow, Serialize, Deserialize, AsExpression)]
#[diesel(sql_type = Text)]
pub enum InterpretationStatus {
    Pending,
    Done,
    Failed,
}

impl FromSql<Text, Pg> for InterpretationStatus {
    fn from_sql(bytes: PgValue<'_>) -> diesel::deserialize::Result<Self> {
        // Reuse Diesel's own FromSql implementation for String from TEXT
        let status = <String as FromSql<Text, Pg>>::from_sql(bytes)?;
        match status.to_lowercase().as_str() {
            // Be flexible with casing
            "pending" => Ok(InterpretationStatus::Pending),
            "done" => Ok(InterpretationStatus::Done),
            "failed" => Ok(InterpretationStatus::Failed),
            other => Err(Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("Unknown InterpretationStatus: {}", other),
            ))),
        }
    }
}

impl ToSql<Text, Pg> for InterpretationStatus {
    fn to_sql<'b>(&'b self, out: &mut Output<'b, '_, Pg>) -> diesel::serialize::Result {
        let s = match self {
            InterpretationStatus::Pending => "pending",
            InterpretationStatus::Done => "done",
            InterpretationStatus::Failed => "failed",
        };
        out.write_all(s.as_bytes())?;
        Ok(IsNull::No)
    }
}
