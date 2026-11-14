use std::sync::OnceLock;
use std::time::Duration;

use reqwest::{Client, Method, StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

/// Dirección HTTP local predeterminada de `aurora-daemon`.
pub const DEFAULT_DAEMON_URL: &str = "http://127.0.0.1:8090";

static HTTP_CLIENT: OnceLock<Result<Client, String>> = OnceLock::new();

/// Error estructurado serializable para respuestas IPC en Tauri v2.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuroraIpcError {
    /// Código estable (`DaemonOffline`, `BadRequest`, `GatekeeperError`, `HttpError`, etc.).
    pub code: String,
    /// Descripción legible en español para el operador de AXIS.
    pub message: String,
    /// URL configurada del demonio local Aurora.
    pub daemon_url: String,
    /// Código HTTP cuando hubo respuesta del demonio.
    pub http_status: Option<u16>,
}

impl AuroraIpcError {
    #[must_use]
    pub fn daemon_offline(daemon_url: &str, detalle: &str) -> Self {
        Self {
            code: "DaemonOffline".to_string(),
            message: format!(
                "El demonio local aurora-daemon está apagado o no responde en {daemon_url} ({detalle})."
            ),
            daemon_url: daemon_url.to_string(),
            http_status: None,
        }
    }

    #[must_use]
    pub fn validacion(daemon_url: &str, message: impl Into<String>) -> Self {
        Self {
            code: "ValidationError".to_string(),
            message: message.into(),
            daemon_url: daemon_url.to_string(),
            http_status: None,
        }
    }
}

/// Resuelve la URL base configurada mediante `AURORA_DAEMON_URL` o fallback local.
#[must_use]
pub fn resolver_daemon_url() -> String {
    std::env::var("AURORA_DAEMON_URL")
        .ok()
        .map(|s| s.trim().trim_end_matches('/').to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| DEFAULT_DAEMON_URL.to_string())
}

fn obtener_cliente() -> Result<&'static Client, String> {
    let resultado = HTTP_CLIENT.get_or_init(|| {
        Client::builder()
            .connect_timeout(Duration::from_secs(2))
            .timeout(Duration::from_secs(90))
            .build()
            .map_err(|e| format!("no se pudo inicializar el cliente HTTP hacia Aurora: {e}"))
    });
    match resultado {
        Ok(cliente) => Ok(cliente),
        Err(msg) => Err(msg.clone()),
    }
}

/// Sanitiza un segmento de ruta URL (UUID/identificador) evitando inyección o traversal.
pub fn validar_identificador(raw: &str, nombre_campo: &str) -> Result<String, AuroraIpcError> {
    let daemon_url = resolver_daemon_url();
    let limpio = raw.trim();
    if limpio.is_empty() {
        return Err(AuroraIpcError::validacion(
            &daemon_url,
            format!("el parámetro `{nombre_campo}` no puede estar vacío"),
        ));
    }
    if !limpio
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err(AuroraIpcError::validacion(
            &daemon_url,
            format!("el parámetro `{nombre_campo}` contiene caracteres inválidos para URL"),
        ));
    }
    Ok(limpio.to_string())
}

/// Consulta `GET /api/v1/health` devolviendo siempre un objeto estructurado amigable (`DaemonOffline` si está apagado).
pub async fn consultar_salud() -> Value {
    let daemon_url = resolver_daemon_url();
    let cliente = match obtener_cliente() {
        Ok(c) => c,
        Err(err) => {
            return json!({
                "status": "DaemonOffline",
                "online": false,
                "daemon_url": daemon_url,
                "error": "HttpClientInitError",
                "mensaje": err,
            });
        }
    };

    let url = format!("{daemon_url}/api/v1/health");
    let respuesta = match cliente
        .get(&url)
        .timeout(Duration::from_secs(3))
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(err) => {
            return json!({
                "status": "DaemonOffline",
                "online": false,
                "daemon_url": daemon_url,
                "error": if err.is_timeout() { "Timeout" } else { "ConnectionRefused" },
                "mensaje": format!("aurora-daemon no está escuchando en {daemon_url}. Inícialo con `cargo run -p aurora-daemon` en Aurora_v1."),
                "detalle": err.to_string(),
            });
        }
    };

    let status = respuesta.status();
    if !status.is_success() {
        let cuerpo = respuesta.text().await.unwrap_or_default();
        return json!({
            "status": "DaemonOffline",
            "online": false,
            "daemon_url": daemon_url,
            "error": format!("Http{}", status.as_u16()),
            "mensaje": format!("aurora-daemon respondió estado HTTP {} en /api/v1/health", status.as_u16()),
            "detalle": cuerpo,
        });
    }

    match respuesta.json::<Value>().await {
        Ok(mut val) => {
            if let Some(obj) = val.as_object_mut() {
                obj.insert("online".to_string(), Value::Bool(true));
                obj.insert("daemon_url".to_string(), Value::String(daemon_url));
            }
            val
        }
        Err(err) => json!({
            "status": "DaemonOffline",
            "online": false,
            "daemon_url": daemon_url,
            "error": "InvalidJson",
            "mensaje": format!("respuesta JSON inválida desde aurora-daemon: {err}"),
        }),
    }
}

/// Ejecuta una petición JSON HTTP contra `aurora-daemon` propagando errores estructurados.
pub async fn solicitar_json(
    metodo: Method,
    ruta: &str,
    cuerpo: Option<Value>,
) -> Result<Value, AuroraIpcError> {
    let daemon_url = resolver_daemon_url();
    let cliente = obtener_cliente().map_err(|msg| AuroraIpcError {
        code: "HttpClientInitError".to_string(),
        message: msg,
        daemon_url: daemon_url.clone(),
        http_status: None,
    })?;

    let ruta_normalizada = if ruta.starts_with('/') {
        ruta.to_string()
    } else {
        format!("/{ruta}")
    };
    let url = format!("{daemon_url}{ruta_normalizada}");

    let mut req = cliente.request(metodo, &url);
    if let Some(payload) = cuerpo {
        req = req.json(&payload);
    }

    let respuesta = req.send().await.map_err(|err| {
        if err.is_connect() || err.is_timeout() {
            AuroraIpcError::daemon_offline(&daemon_url, &err.to_string())
        } else {
            AuroraIpcError {
                code: "HttpTransportError".to_string(),
                message: format!("error de red al consultar aurora-daemon ({ruta_normalizada}): {err}"),
                daemon_url: daemon_url.clone(),
                http_status: None,
            }
        }
    })?;

    let status = respuesta.status();
    let texto = respuesta.text().await.map_err(|err| AuroraIpcError {
        code: "HttpBodyError".to_string(),
        message: format!("error leyendo respuesta de aurora-daemon: {err}"),
        daemon_url: daemon_url.clone(),
        http_status: Some(status.as_u16()),
    })?;

    if !status.is_success() {
        return Err(mapear_error_http(&daemon_url, status, &texto));
    }

    if texto.trim().is_empty() {
        return Ok(json!({ "ok": true }));
    }

    serde_json::from_str::<Value>(&texto).map_err(|err| AuroraIpcError {
        code: "InvalidJson".to_string(),
        message: format!("respuesta JSON inválida de aurora-daemon: {err}"),
        daemon_url,
        http_status: Some(status.as_u16()),
    })
}

fn mapear_error_http(daemon_url: &str, status: StatusCode, cuerpo: &str) -> AuroraIpcError {
    if let Ok(parsed) = serde_json::from_str::<Value>(cuerpo) {
        if let (Some(codigo), Some(detalle_o_error)) = (
            parsed.get("codigo").and_then(Value::as_str),
            parsed
                .get("detalle")
                .and_then(Value::as_str)
                .or_else(|| parsed.get("error").and_then(Value::as_str)),
        ) {
            return AuroraIpcError {
                code: codigo.to_string(),
                message: detalle_o_error.to_string(),
                daemon_url: daemon_url.to_string(),
                http_status: Some(status.as_u16()),
            };
        }

        if let Some(err_obj) = parsed.get("error").and_then(Value::as_object) {
            let code = err_obj
                .get("code")
                .and_then(Value::as_str)
                .unwrap_or("DaemonError")
                .to_string();
            let message = err_obj
                .get("message")
                .and_then(Value::as_str)
                .unwrap_or(cuerpo)
                .to_string();
            return AuroraIpcError {
                code,
                message,
                daemon_url: daemon_url.to_string(),
                http_status: Some(status.as_u16()),
            };
        }
    }

    AuroraIpcError {
        code: format!("Http{}", status.as_u16()),
        message: if cuerpo.trim().is_empty() {
            format!("aurora-daemon respondió con código HTTP {}", status.as_u16())
        } else {
            cuerpo.to_string()
        },
        daemon_url: daemon_url.to_string(),
        http_status: Some(status.as_u16()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validar_identificador_rechaza_traversal_y_acepta_uuid() {
        let ok = validar_identificador("550e8400-e29b-41d4-a716-446655440000", "ordenId");
        assert!(matches!(
            ok.as_deref(),
            Ok("550e8400-e29b-41d4-a716-446655440000")
        ));

        let vacio = validar_identificador("   ", "ordenId");
        assert!(vacio.is_err());

        let traversal = validar_identificador("../admin", "ordenId");
        assert!(traversal.is_err());
    }

    #[test]
    fn mapear_error_http_extrae_codigo_y_mensaje_de_daemon() {
        let daemon_payload = r#"{"error":"prospecto bloqueado","codigo":"LFPDPPP_OPT_OUT","detalle":"cumplimiento LFPDPPP: prospecto en opt_out"}"#;
        let err_daemon = mapear_error_http(DEFAULT_DAEMON_URL, StatusCode::FORBIDDEN, daemon_payload);
        assert_eq!(err_daemon.code, "LFPDPPP_OPT_OUT");
        assert_eq!(err_daemon.message, "cumplimiento LFPDPPP: prospecto en opt_out");
        assert_eq!(err_daemon.http_status, Some(403));

        let nested_payload = r#"{"error":{"code":"OptOutActive","message":"prospecto bloqueado por LFPDPPP"}}"#;
        let err_nested = mapear_error_http(DEFAULT_DAEMON_URL, StatusCode::FORBIDDEN, nested_payload);
        assert_eq!(err_nested.code, "OptOutActive");
        assert_eq!(err_nested.message, "prospecto bloqueado por LFPDPPP");
        assert_eq!(err_nested.http_status, Some(403));
    }
}

