use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemStatus {
    pub status: String,
    pub core_version: String,
}

#[tauri::command]
pub fn check_core_status() -> Result<SystemStatus, String> {
    Ok(SystemStatus {
        status: "Online".to_string(),
        core_version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::process::{Command, Stdio};
use std::time::Duration;

fn send_bob_http_request(method: &str, path: &str, body: &str, timeout_secs: u64) -> Result<String, String> {
    let addr: SocketAddr = "127.0.0.1:8086".parse().unwrap();
    let mut stream = TcpStream::connect_timeout(&addr, Duration::from_millis(800))
        .map_err(|_| "BOB Daemon está desconectado (puerto 8086 inactivo). Presiona 'Despertar a BOB'.".to_string())?;

    let _ = stream.set_read_timeout(Some(Duration::from_secs(timeout_secs)));
    let _ = stream.set_write_timeout(Some(Duration::from_secs(10)));

    let req = format!(
        "{} {} HTTP/1.1\r\nHost: 127.0.0.1:8086\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        method,
        path,
        body.len(),
        body
    );

    stream.write_all(req.as_bytes()).map_err(|e| e.to_string())?;

    let mut resp_bytes = Vec::new();
    stream.read_to_end(&mut resp_bytes).map_err(|e| e.to_string())?;
    let raw_resp = String::from_utf8_lossy(&resp_bytes).to_string();

    if let Some(idx) = raw_resp.find("\r\n\r\n") {
        Ok(raw_resp[idx + 4..].to_string())
    } else {
        Ok(raw_resp)
    }
}

#[tauri::command]
pub fn get_bob_status() -> Result<String, String> {
    send_bob_http_request("GET", "/status", "", 5)
}

#[tauri::command]
pub fn wake_bob_daemon() -> Result<String, String> {
    if get_bob_status().is_ok() {
        return Ok("BOB ya se encuentra activo en memoria.".to_string());
    }

    let home = std::env::var("HOME").unwrap_or_else(|_| "/home/daniel".to_string());
    let bob_dir = format!("{}/proyectos/bob_engine", home);
    let bob_bin = format!("{}/target/release/bob_agent", bob_dir);

    Command::new(&bob_bin)
        .arg("--daemon")
        .current_dir(&bob_dir)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("No se pudo lanzar {}: {}", bob_bin, e))?;

    Ok("Iniciando Córtex 27B y cargando 99 capas en RTX 5060 Ti (~15-25s)...".to_string())
}

#[tauri::command]
pub fn sync_bob_ecosystem() -> Result<String, String> {
    send_bob_http_request("POST", "/sync-projects", "{}", 60)
}

#[tauri::command]
pub fn ask_bob_agent(message: String, mode: String, axis_context: String) -> Result<String, String> {
    let escape = |s: &str| -> String {
        s.replace('\\', "\\\\")
            .replace('"', "\\\"")
            .replace('\n', "\\n")
            .replace('\r', "")
    };
    let payload = format!(
        "{{\"message\":\"{}\",\"mode\":\"{}\",\"axis_context\":\"{}\"}}",
        escape(&message),
        escape(&mode),
        escape(&axis_context)
    );
    send_bob_http_request("POST", "/chat", &payload, 180)
}
