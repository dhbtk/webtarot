use axum::extract::FromRequestParts;
use axum::http::StatusCode;
use axum::http::request::Parts;

#[derive(Debug, Clone)]
pub struct Locale(pub String);

impl Locale {
    fn choose_language(header: Option<&str>) -> String {
        // Supported locales
        const SUPPORTED: [&str; 2] = ["pt", "en"];

        if let Some(lang) = header {
            // Try exact match first
            let short = lang.split(',').next().unwrap_or("").trim();
            let code = if short.len() >= 2 { &short[..2] } else { short };
            let code = code.to_ascii_lowercase();
            if SUPPORTED.contains(&code.as_str()) {
                return code;
            }
        }
        // Default to Portuguese
        "pt".to_string()
    }
}

impl<S> FromRequestParts<S> for Locale
where
    S: Send + Sync,
{
    type Rejection = StatusCode;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // Priority: X-Locale, then Accept-Language
        let selected = parts
            .headers
            .get("x-locale")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
            .or_else(|| {
                parts
                    .headers
                    .get("accept-language")
                    .and_then(|v| v.to_str().ok())
                    .map(|s| s.to_string())
            });

        let code = Self::choose_language(selected.as_deref());
        // Set the locale for this request context
        rust_i18n::set_locale(&code);
        Ok(Locale(code))
    }
}
