use pawcast_lib::commands::http::{fetch_bounded, validate_http_url, FetchOptions};
use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::mpsc;
use std::thread;

#[test]
fn rejects_non_http_and_credential_bearing_urls() {
    assert!(validate_http_url("file:///etc/passwd").is_err());
    assert!(validate_http_url("https://user:secret@example.com/path").is_err());
    assert!(validate_http_url("https://example.com/path").is_ok());
}

fn serve_once(body: Vec<u8>, status: &str, headers: &[(&str, &str)]) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    let status = status.to_owned();
    let headers = headers
        .iter()
        .map(|(k, v)| ((*k).to_owned(), (*v).to_owned()))
        .collect::<Vec<_>>();
    thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        let mut request = [0_u8; 2048];
        let _ = stream.read(&mut request);
        write!(
            stream,
            "HTTP/1.1 {status}\r\nContent-Length: {}\r\n",
            body.len()
        )
        .unwrap();
        for (name, value) in headers {
            write!(stream, "{name}: {value}\r\n").unwrap();
        }
        write!(stream, "Connection: close\r\n\r\n").unwrap();
        stream.write_all(&body).unwrap();
    });
    format!("http://{address}/")
}

#[tokio::test]
async fn preserves_status_text_body_and_headers() {
    let url = serve_once(b"not here".to_vec(), "404 Not Found", &[("X-Test", "yes")]);
    let response = fetch_bounded(&url, FetchOptions::default(), 1024)
        .await
        .unwrap();
    assert!(!response.ok);
    assert_eq!(response.status, 404);
    assert_eq!(response.status_text, "Not Found");
    assert_eq!(response.data, "not here");
    assert_eq!(
        response.headers.get("x-test").map(String::as_str),
        Some("yes")
    );
}

#[tokio::test]
async fn rejects_responses_over_the_limit() {
    let url = serve_once(vec![b'x'; 65], "200 OK", &[]);
    let error = fetch_bounded(&url, FetchOptions::default(), 64)
        .await
        .unwrap_err();
    assert_eq!(error.code, "response_too_large");
}

#[tokio::test]
async fn sends_binary_request_body_without_utf8_conversion() {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    let (sender, receiver) = mpsc::channel();
    thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        let mut received = Vec::new();
        let mut chunk = [0_u8; 1024];
        loop {
            let count = stream.read(&mut chunk).unwrap();
            received.extend_from_slice(&chunk[..count]);
            let header_end = received.windows(4).position(|window| window == b"\r\n\r\n");
            if let Some(header_end) = header_end {
                let headers = String::from_utf8_lossy(&received[..header_end]);
                let content_length = headers
                    .lines()
                    .find_map(|line| {
                        line.to_ascii_lowercase()
                            .strip_prefix("content-length: ")
                            .and_then(|value| value.parse::<usize>().ok())
                    })
                    .unwrap_or(0);
                let body_start = header_end + 4;
                if received.len() >= body_start + content_length {
                    sender
                        .send(received[body_start..body_start + content_length].to_vec())
                        .unwrap();
                    break;
                }
            }
        }
        write!(
            stream,
            "HTTP/1.1 204 No Content\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
        )
        .unwrap();
    });
    let options = FetchOptions {
        method: Some("POST".into()),
        body: Some("ignored".into()),
        body_bytes: Some(vec![0, 159, 255, 10]),
        ..Default::default()
    };
    fetch_bounded(&format!("http://{address}/upload"), options, 1024)
        .await
        .unwrap();
    assert_eq!(receiver.recv().unwrap(), vec![0, 159, 255, 10]);
}
