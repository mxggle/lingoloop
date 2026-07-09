use crate::error::AppError;
use futures_util::StreamExt;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::{Client, Method};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;
use url::Url;

pub const DEFAULT_RESPONSE_LIMIT: usize = 16 * 1024 * 1024;

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchOptions {
    pub method: Option<String>,
    #[serde(default)]
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
    pub body_bytes: Option<Vec<u8>>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesktopFetchResponse {
    pub ok: bool,
    pub status: u16,
    pub status_text: String,
    pub data: String,
    pub headers: HashMap<String, String>,
}

pub fn validate_http_url(value: &str) -> Result<Url, AppError> {
    let url = Url::parse(value).map_err(|_| {
        AppError::new("invalid_url", "Request URL is invalid").operation("desktop_fetch")
    })?;
    if !matches!(url.scheme(), "http" | "https") {
        return Err(AppError::new(
            "unsupported_url_scheme",
            "Only HTTP and HTTPS requests are allowed",
        )
        .operation("desktop_fetch"));
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err(AppError::new(
            "url_credentials_not_allowed",
            "Credentials must not be embedded in request URLs",
        )
        .operation("desktop_fetch"));
    }
    Ok(url)
}

fn response_too_large() -> AppError {
    AppError::new(
        "response_too_large",
        "The server response exceeded the desktop request limit",
    )
    .operation("desktop_fetch")
}

pub async fn fetch_bounded(
    url: &str,
    options: FetchOptions,
    limit: usize,
) -> Result<DesktopFetchResponse, AppError> {
    let url = validate_http_url(url)?;
    let client = Client::builder()
        .connect_timeout(Duration::from_secs(15))
        .timeout(Duration::from_secs(120))
        .redirect(reqwest::redirect::Policy::custom(|attempt| {
            if attempt.previous().len() >= 10 {
                return attempt.error("redirect limit exceeded");
            }
            if validate_http_url(attempt.url().as_str()).is_err() {
                return attempt.error("invalid redirect target");
            }
            attempt.follow()
        }))
        .build()
        .map_err(|error| AppError::io("desktop_fetch_client", error))?;
    let method = options
        .method
        .as_deref()
        .unwrap_or("GET")
        .parse::<Method>()
        .map_err(|_| {
            AppError::new("invalid_http_method", "Request method is invalid")
                .operation("desktop_fetch")
        })?;
    let mut headers = HeaderMap::new();
    for (name, value) in options.headers {
        let name = HeaderName::from_bytes(name.as_bytes()).map_err(|_| {
            AppError::new("invalid_http_header", "Request header name is invalid")
                .operation("desktop_fetch")
        })?;
        let value = HeaderValue::from_str(&value).map_err(|_| {
            AppError::new("invalid_http_header", "Request header value is invalid")
                .operation("desktop_fetch")
        })?;
        headers.append(name, value);
    }
    let mut request = client.request(method, url).headers(headers);
    if let Some(body) = options.body_bytes {
        request = request.body(body);
    } else if let Some(body) = options.body {
        request = request.body(body);
    }
    let response = request.send().await.map_err(|error| {
        eprintln!("desktop_fetch failed: {error}");
        AppError::new("network_error", "The desktop request failed")
            .operation("desktop_fetch")
            .retryable(true)
    })?;
    if response
        .content_length()
        .is_some_and(|length| length > limit as u64)
    {
        return Err(response_too_large());
    }
    let status = response.status();
    let status_text = status.canonical_reason().unwrap_or("").to_owned();
    let response_headers = response
        .headers()
        .iter()
        .map(|(name, value)| {
            (
                name.as_str().to_owned(),
                value.to_str().unwrap_or_default().to_owned(),
            )
        })
        .collect();
    let mut data = Vec::new();
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|error| AppError::io("desktop_fetch_body", error))?;
        if data.len().saturating_add(chunk.len()) > limit {
            return Err(response_too_large());
        }
        data.extend_from_slice(&chunk);
    }
    Ok(DesktopFetchResponse {
        ok: status.is_success(),
        status: status.as_u16(),
        status_text,
        data: String::from_utf8_lossy(&data).into_owned(),
        headers: response_headers,
    })
}

#[tauri::command]
pub async fn desktop_fetch(
    url: String,
    options: Option<FetchOptions>,
) -> Result<DesktopFetchResponse, AppError> {
    fetch_bounded(&url, options.unwrap_or_default(), DEFAULT_RESPONSE_LIMIT).await
}
