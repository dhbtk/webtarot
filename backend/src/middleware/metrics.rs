use axum::extract::{MatchedPath, Request};
use axum::middleware::Next;
use axum::response::Response;
use metrics::{counter, histogram};
use metrics_exporter_prometheus::{PrometheusBuilder, PrometheusHandle};
use std::sync::OnceLock;
use std::time::Instant;

pub async fn metrics(request: Request, next: Next) -> Response {
    let start = Instant::now();
    let path = match request.extensions().get::<MatchedPath>() {
        None => request.uri().path().to_owned(),
        Some(path) => path.as_str().to_owned(),
    };
    let method = request.method().clone();

    // Run the rest of the request handling first, so we can measure it and get response
    // codes.
    let response = next.run(request).await;

    let latency = start.elapsed().as_secs_f64();
    let status = response.status().as_u16().to_string();

    let labels = [
        ("method", method.to_string()),
        ("path", path.clone()),
        ("status", status),
        ("static", (!path.starts_with("/api")).to_string()),
    ];

    counter!("http_requests_total", &labels).increment(1);
    histogram!("http_requests_duration_seconds", &labels).record(latency);

    response
}

static PROM_HANDLE: OnceLock<PrometheusHandle> = OnceLock::new();

pub fn setup_metrics_recorder() -> PrometheusHandle {
    const EXPONENTIAL_SECONDS: &[f64] = &[
        0.001, 0.002, 0.003, 0.005, 0.01, 0.015, 0.020, 0.025, 0.03, 0.04, 0.05, 0.1, 0.25, 0.5,
        1.0, 2.5, 5.0, 10.0,
    ];

    if let Some(h) = PROM_HANDLE.get() {
        return h.clone();
    }

    let handle = PrometheusBuilder::new()
        .set_buckets(EXPONENTIAL_SECONDS)
        .unwrap()
        .install_recorder()
        .unwrap();

    // Store for subsequent calls
    let _ = PROM_HANDLE.set(handle.clone());
    handle
}
