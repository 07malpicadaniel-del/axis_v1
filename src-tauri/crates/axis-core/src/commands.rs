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
