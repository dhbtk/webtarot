use axum::Json;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::{Deserialize, Serialize};
use tracing::error;

// Diesel is used throughout repositories; bring types when available.
// Keep these imports optional at compile time where this module is used.
#[allow(unused_imports)]
use diesel::result::{DatabaseErrorKind, Error as DieselError};
use diesel_async::pooled_connection::bb8::RunError;

pub type AppResult<T> = Result<T, AppError>;
pub type ResponseResult<T> = axum::response::Result<T, AppError>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AppError {
    NotFound,
    AlreadyExists,
    InvalidPassword,
    ValidateError(String),
    InternalError,
    Forbidden,
    Unauthorized,
}

impl AppError {
    pub fn status_code(&self) -> StatusCode {
        match self {
            Self::NotFound => StatusCode::NOT_FOUND,
            Self::AlreadyExists => StatusCode::BAD_REQUEST,
            Self::InvalidPassword => StatusCode::UNAUTHORIZED,
            Self::ValidateError(_) => StatusCode::BAD_REQUEST,
            Self::InternalError => StatusCode::INTERNAL_SERVER_ERROR,
            Self::Forbidden => StatusCode::FORBIDDEN,
            Self::Unauthorized => StatusCode::UNAUTHORIZED,
        }
    }

    pub fn into_response<B>(self) -> (StatusCode, Result<B, Self>) {
        (self.status_code(), Err(self))
    }

    /// Log the original error with context and convert to an InternalError.
    pub fn internal_with_log<E: core::fmt::Debug>(context: &str, err: E) -> Self {
        error!(target: "app_error", "{}: {:?}", context, err);
        AppError::InternalError
    }

    /// Convert a Diesel error into a domain `AppError`, logging the full original error.
    /// Maps common cases like unique violations and not found.
    pub fn from_diesel_with_log(context: &str, err: DieselError) -> Self {
        // Always log the full diesel error for observability
        error!(target: "app_error", "{}: diesel error: {:?}", context, err);
        match err {
            DieselError::NotFound => AppError::NotFound,
            DieselError::DatabaseError(DatabaseErrorKind::UniqueViolation, _info) => {
                AppError::AlreadyExists
            }
            _ => AppError::InternalError,
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let body = Json(self);
        (status, body).into_response()
    }
}

impl From<RunError> for AppError {
    fn from(value: RunError) -> Self {
        AppError::internal_with_log("Failed to get DB connection", value)
    }
}

impl From<DieselError> for AppError {
    fn from(value: DieselError) -> Self {
        AppError::from_diesel_with_log("Failed to execute DB query", value)
    }
}
