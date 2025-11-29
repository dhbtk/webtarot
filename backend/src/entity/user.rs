#[derive(Clone, Debug)]
pub enum User {
    Anonymous {
        id: uuid::Uuid,
    },
    Authenticated {
        id: uuid::Uuid,
        created_at: chrono::NaiveDateTime,
        updated_at: chrono::NaiveDateTime,
        email: String,
        name: String,
        self_description: String,
        access_token: AccessToken,
    },
}

impl User {
    pub fn id(&self) -> uuid::Uuid {
        match self {
            Self::Anonymous { id } => *id,
            Self::Authenticated { id, .. } => *id,
        }
    }
}

#[derive(Clone, Debug)]
pub struct AccessToken {
    pub id: i64,
    pub created_at: chrono::NaiveDateTime,
    pub last_user_ip: String,
    pub last_user_agent: String,
}

impl From<(crate::model::User, crate::model::AccessToken)> for User {
    fn from(value: (crate::model::User, crate::model::AccessToken)) -> Self {
        let (user, access_token) = value;
        User::Authenticated {
            id: user.id,
            created_at: user.created_at,
            updated_at: user.updated_at,
            email: user.email,
            name: user.name,
            self_description: user.self_description,
            access_token: AccessToken {
                id: access_token.id,
                created_at: access_token.created_at,
                last_user_ip: access_token.last_user_ip,
                last_user_agent: access_token.last_user_agent,
            },
        }
    }
}
