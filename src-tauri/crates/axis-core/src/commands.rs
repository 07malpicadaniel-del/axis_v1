use serde::{Deserialize, Serialize};
use std::fs::OpenOptions;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::process::{Command, Stdio};
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemStatus {
    pub status: String,
    pub core_version: String,
    pub active_modules: Vec<String>,
}

#[tauri::command]
pub fn check_core_status() -> String {
    "AXIS Core v0.1.0 — Operational (100% Rust)".to_string()
}

#[tauri::command]
pub fn get_system_status() -> Result<SystemStatus, String> {
    Ok(SystemStatus {
        status: "Operational".to_string(),
        core_version: "0.1.0-alpha".to_string(),
        active_modules: vec![
            "axis-core".to_string(),
            "lifestyle".to_string(),
            "bob-oracle".to_string(),
        ],
    })
}

fn bob_http_request(
    method: &str,
    path: &str,
    json_body: Option<&str>,
    timeout_ms: Option<u64>,
) -> Result<String, String> {
    let addr: SocketAddr = "127.0.0.1:8086".parse().unwrap();
    let mut stream = TcpStream::connect_timeout(&addr, Duration::from_millis(2500))
        .map_err(|_| "BOB Daemon apagado (puerto 8086 inactivo)".to_string())?;

    let read_to = timeout_ms.map(Duration::from_millis);
    let _ = stream.set_read_timeout(read_to);
    let _ = stream.set_write_timeout(None);

    let body_bytes = json_body.unwrap_or("").as_bytes();
    let req = format!(
        "{} {} HTTP/1.1\r\nHost: 127.0.0.1:8086\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        method,
        path,
        body_bytes.len()
    );

    stream
        .write_all(req.as_bytes())
        .map_err(|e| e.to_string())?;
    if !body_bytes.is_empty() {
        stream.write_all(body_bytes).map_err(|e| e.to_string())?;
    }
    let _ = stream.flush();

    let mut resp_bytes = Vec::new();
    stream
        .read_to_end(&mut resp_bytes)
        .map_err(|e| format!("Error leyendo respuesta de BOB: {}", e))?;

    let resp = String::from_utf8_lossy(&resp_bytes).to_string();
    if let Some(idx) = resp.find("\r\n\r\n") {
        Ok(resp[idx + 4..].to_string())
    } else {
        Ok(resp)
    }
}

#[tauri::command]
pub async fn get_bob_status() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        bob_http_request("GET", "/status", None, Some(4000))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn wake_bob_daemon() -> Result<String, String> {
    if bob_http_request("GET", "/status", None, Some(1500)).is_ok() {
        return Ok("BOB ya está despierto y activo en el puerto 8086.".to_string());
    }

    let home = std::env::var("HOME").unwrap_or_else(|_| "/home/daniel".to_string());
    let bob_dir = format!("{}/proyectos/bob_engine", home);
    let bob_bin = format!("{}/target/release/bob_agent", bob_dir);

    let log_out = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open("/tmp/bob_daemon.log")
        .map(Stdio::from)
        .unwrap_or_else(|_| Stdio::null());

    let log_err = OpenOptions::new()
        .create(true)
        .write(true)
        .append(true)
        .open("/tmp/bob_daemon.log")
        .map(Stdio::from)
        .unwrap_or_else(|_| Stdio::null());

    Command::new(&bob_bin)
        .arg("--daemon")
        .current_dir(&bob_dir)
        .stdout(log_out)
        .stderr(log_err)
        .spawn()
        .map_err(|e| format!("No se pudo lanzar {}: {}", bob_bin, e))?;

    Ok("Despertando a BOB (logs en vivo en /tmp/bob_daemon.log): cargando embeddings en RAM y 99 capas en RTX 5060 Ti...".to_string())
}

#[tauri::command]
pub async fn sync_bob_ecosystem() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        bob_http_request("POST", "/sync-projects", Some("{}"), None)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn ask_bob_agent(
    message: String,
    mode: String,
    axis_context: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let payload = serde_json::json!({
            "message": message,
            "mode": mode,
            "axis_context": axis_context
        })
        .to_string();
        bob_http_request("POST", "/chat", Some(&payload), None)
    })
    .await
    .map_err(|e| e.to_string())?
}
