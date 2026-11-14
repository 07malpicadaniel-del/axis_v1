use reqwest::Method;
use serde_json::{json, Value};

use crate::client::{
    consultar_salud, resolver_daemon_url, solicitar_json, validar_identificador, AuroraIpcError,
};

/// Consulta la salud y telemetría de hardware del demonio local `aurora-daemon`.
/// Si el demonio está apagado, devuelve `DaemonOffline` amigable sin bloquear AXIS.
#[tauri::command]
pub async fn aurora_health() -> Result<Value, AuroraIpcError> {
    Ok(consultar_salud().await)
}

/// Lanza una cacería OSINT completa (`OSINT -> Memoria 4D -> Córtex BOB`).
#[tauri::command]
pub async fn aurora_launch_hunt(payload: Value) -> Result<Value, AuroraIpcError> {
    if !payload.is_object() {
        return Err(AuroraIpcError::validacion(
            &resolver_daemon_url(),
            "la solicitud de cacería OSINT debe ser un objeto JSON válido",
        ));
    }
    solicitar_json(Method::POST, "/api/v1/osint/hunt", Some(payload)).await
}

/// Recupera la topología completa de la Telaraña 4D (nodos, aristas e islas).
#[tauri::command]
pub async fn aurora_get_telarana() -> Result<Value, AuroraIpcError> {
    solicitar_json(Method::GET, "/api/v1/memory/telarana", None).await
}

/// Recupera el subgrafo de 1 y 2 saltos del Círculo Cercano para un prospecto.
#[tauri::command]
pub async fn aurora_get_subgrafo(prospecto_id: String) -> Result<Value, AuroraIpcError> {
    let id = validar_identificador(&prospecto_id, "prospectoId")?;
    solicitar_json(Method::GET, &format!("/api/v1/memory/subgrafo/{id}"), None).await
}

/// Lista las órdenes pendientes e historial reciente de la Sala Gatekeeper.
#[tauri::command]
pub async fn aurora_list_gatekeeper() -> Result<Value, AuroraIpcError> {
    solicitar_json(Method::GET, "/api/v1/gatekeeper/pendientes", None).await
}

/// Aprueba una orden en el Gatekeeper para manufacturar PDF, WAV, MP4 y SRT en NVMe.
#[tauri::command]
pub async fn aurora_approve_order(
    orden_id: String,
    despachar_inmediatamente: Option<bool>,
) -> Result<Value, AuroraIpcError> {
    let id = validar_identificador(&orden_id, "ordenId")?;
    let body = json!({
        "despachar_inmediatamente": despachar_inmediatamente,
    });
    solicitar_json(
        Method::POST,
        &format!("/api/v1/gatekeeper/aprobar/{id}"),
        Some(body),
    )
    .await
}

/// Rechaza formalmente una orden en el Gatekeeper registrando el motivo auditado.
#[tauri::command]
pub async fn aurora_reject_order(orden_id: String, motivo: String) -> Result<Value, AuroraIpcError> {
    let id = validar_identificador(&orden_id, "ordenId")?;
    let motivo_limpio = motivo.trim();
    if motivo_limpio.is_empty() {
        return Err(AuroraIpcError::validacion(
            &resolver_daemon_url(),
            "el motivo de rechazo en Gatekeeper es obligatorio",
        ));
    }
    solicitar_json(
        Method::POST,
        &format!("/api/v1/gatekeeper/rechazar/{id}"),
        Some(json!({ "motivo": motivo_limpio })),
    )
    .await
}

/// Ejecuta la purga física inmediata LFPDPPP (`opt_out`) de un prospecto en WAL/HNSW y blacklist.
#[tauri::command]
pub async fn aurora_trigger_opt_out(
    prospecto_id: String,
    campana_id: Option<String>,
    motivo: String,
) -> Result<Value, AuroraIpcError> {
    let id = validar_identificador(&prospecto_id, "prospectoId")?;
    let campana_validada = match campana_id {
        Some(raw) if !raw.trim().is_empty() => Some(validar_identificador(&raw, "campanaId")?),
        _ => None,
    };
    let motivo_limpio = if motivo.trim().is_empty() {
        "Solicitud directa ARCO/Opt-Out desde operador AXIS"
    } else {
        motivo.trim()
    };
    solicitar_json(
        Method::POST,
        "/api/v1/lfpdppp/opt-out",
        Some(json!({
            "prospecto_id": id,
            "campana_id": campana_validada,
            "motivo": motivo_limpio,
        })),
    )
    .await
}

/// Obtiene las cuotas de rate-limit por plataforma, circuit breakers y telemetría de Pulso.
#[tauri::command]
pub async fn aurora_get_pulse_status() -> Result<Value, AuroraIpcError> {
    solicitar_json(Method::GET, "/api/v1/pulse/estado", None).await
}

/// Ejecuta el ciclo nocturno de auditoría BOB + recalibración 4D + generación de dataset DPO JSONL.
#[tauri::command]
pub async fn aurora_run_dpo_consolidation() -> Result<Value, AuroraIpcError> {
    solicitar_json(Method::POST, "/api/v1/dpo/consolidar", None).await
}
