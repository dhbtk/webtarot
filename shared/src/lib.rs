// Initialize rust-i18n with locales directory inside this crate
// This makes the `t!` macro available to translate strings at runtime.
rust_i18n::i18n!("locales");

pub mod explain;
pub mod model;

// Re-export the `t!` macro so modules can `use crate::t`.
pub use rust_i18n::t;
