pub mod protocol;
pub mod tools;

use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};

pub struct McpState {
    pub servers: Arc<Mutex<HashMap<String, McpServer>>>,
}

impl Default for McpState {
    fn default() -> Self {
        Self {
            servers: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

pub struct McpServer {
    pub id: String,
    pub name: String,
    pub child: Option<Child>,
}

#[tauri::command]
pub async fn mcp_start_server(
    state: tauri::State<'_, McpState>,
    id: String,
    command: String,
    args: Vec<String>,
    env: HashMap<String, String>,
) -> Result<String, String> {
    let mut servers = state.servers.lock().await;

    if servers.contains_key(&id) {
        return Err(format!("Server {} already exists", id));
    }

    let child = Command::new(&command)
        .args(&args)
        .envs(&env)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start MCP server: {}", e))?;

    servers.insert(
        id.clone(),
        McpServer {
            id: id.clone(),
            name: command,
            child: Some(child),
        },
    );

    Ok(id)
}

#[tauri::command]
pub async fn mcp_stop_server(
    state: tauri::State<'_, McpState>,
    id: String,
) -> Result<(), String> {
    let mut servers = state.servers.lock().await;

    if let Some(mut server) = servers.remove(&id) {
        if let Some(mut child) = server.child.take() {
            let _ = child.kill().await;
            let _ = child.wait().await;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn mcp_send_request(
    state: tauri::State<'_, McpState>,
    id: String,
    request: String,
) -> Result<String, String> {
    let mut servers = state.servers.lock().await;
    let server = servers
        .get_mut(&id)
        .ok_or_else(|| format!("Server {} not found", id))?;

    let child = server
        .child
        .as_mut()
        .ok_or("Server process not running")?;

    let stdin = child
        .stdin
        .as_mut()
        .ok_or("stdin not available")?;

    let stdout = child
        .stdout
        .take()
        .ok_or("stdout not available")?;

    use tokio::io::AsyncWriteExt;
    stdin
        .write_all(request.as_bytes())
        .await
        .map_err(|e| format!("Write failed: {}", e))?;
    stdin
        .write_all(b"\n")
        .await
        .map_err(|e| format!("Write failed: {}", e))?;

    let mut reader = BufReader::new(stdout);
    let mut line = String::new();
    reader
        .read_line(&mut line)
        .await
        .map_err(|e| format!("Read failed: {}", e))?;

    child.stdout = Some(reader.into_inner());

    Ok(line)
}

#[tauri::command]
pub async fn mcp_list_servers(
    state: tauri::State<'_, McpState>,
) -> Result<Vec<String>, String> {
    let servers = state.servers.lock().await;
    Ok(servers.keys().cloned().collect())
}
