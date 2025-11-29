use crate::entity::user::User;
use axum::Json;

pub async fn get_user(user: User) -> Json<User> {
    Json(user)
}
