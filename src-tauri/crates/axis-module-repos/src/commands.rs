use std::fs;
use std::path::Path;
use std::process::Command;
use std::sync::Mutex;
use chrono::Local;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

const REPOS_STORAGE_FILE: &str = "data/repos.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalRepo {
    pub id: String,
    pub name: String,
    pub path: String,
    pub current_branch: String,
    pub is_clean: bool,
    pub last_commit: String,
    pub last_commit_time: String,
    pub tag: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitCommit {
    pub hash: String,
    pub author: String,
    pub date_rel: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitFileChange {
    pub status: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoDetails {
    pub branch: String,
    pub branches: Vec<String>,
    pub is_clean: bool,
    pub commits: Vec<GitCommit>,
    pub changes: Vec<GitFileChange>,
}

pub struct ReposState {
    pub repos: Mutex<Vec<LocalRepo>>,
}

fn inspect_git(path: &str) -> (String, bool, String, String) {
    let branch = Command::new("git")
        .args(["-C", path, "rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .ok()
        .and_then(|out| if out.status.success() { String::from_utf8(out.stdout).ok() } else { None })
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| "detached".into());

    let is_clean = Command::new("git")
        .args(["-C", path, "status", "--porcelain"])
        .output()
        .ok()
        .map(|out| out.stdout.is_empty())
        .unwrap_or(true);

    let last_commit = Command::new("git")
        .args(["-C", path, "log", "-1", "--format=%s"])
        .output()
        .ok()
        .and_then(|out| if out.status.success() { String::from_utf8(out.stdout).ok() } else { None })
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| "No commits found".into());

    let commit_time = Command::new("git")
        .args(["-C", path, "log", "-1", "--format=%cr"])
        .output()
        .ok()
        .and_then(|out| if out.status.success() { String::from_utf8(out.stdout).ok() } else { None })
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| "Unknown".into());

    (branch, is_clean, last_commit, commit_time)
}

fn save_to_disk(repos: &[LocalRepo]) {
    if let Some(parent) = Path::new(REPOS_STORAGE_FILE).parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(repos) {
        let _ = fs::write(REPOS_STORAGE_FILE, json);
    }
}

fn load_from_disk() -> Option<Vec<LocalRepo>> {
    let content = fs::read_to_string(REPOS_STORAGE_FILE).ok()?;
    serde_json::from_str(&content).ok()
}

impl Default for ReposState {
    fn default() -> Self {
        if let Some(mut disk_repos) = load_from_disk() {
            for repo in disk_repos.iter_mut() {
                let (branch, is_clean, commit_msg, commit_time) = inspect_git(&repo.path);
                repo.current_branch = branch;
                repo.is_clean = is_clean;
                repo.last_commit = commit_msg;
                repo.last_commit_time = commit_time;
            }
            return Self {
                repos: Mutex::new(disk_repos),
            };
        }

        let axis_path = std::env::current_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| "/home/daniel/axis_v1".into());

        let (branch, is_clean, commit_msg, commit_time) = inspect_git(&axis_path);

        let initial_repo = LocalRepo {
            id: Uuid::new_v4().to_string(),
            name: "axis_v1".into(),
            path: axis_path,
            current_branch: branch,
            is_clean,
            last_commit: commit_msg,
            last_commit_time: commit_time,
            tag: "Rust / React".into(),
        };

        let initial_list = vec![initial_repo];
        save_to_disk(&initial_list);

        Self {
            repos: Mutex::new(initial_list),
        }
    }
}

#[tauri::command]
pub fn repos_get_list(state: tauri::State<'_, ReposState>) -> Result<Vec<LocalRepo>, String> {
    let mut repos = state.repos.lock().map_err(|e| e.to_string())?;
    
    for repo in repos.iter_mut() {
        let (branch, is_clean, commit_msg, commit_time) = inspect_git(&repo.path);
        repo.current_branch = branch;
        repo.is_clean = is_clean;
        repo.last_commit = commit_msg;
        repo.last_commit_time = commit_time;
    }
    save_to_disk(&repos);
    Ok(repos.clone())
}

#[tauri::command]
pub fn repos_add_repo(
    path: String,
    name: Option<String>,
    tag: String,
    state: tauri::State<'_, ReposState>,
) -> Result<LocalRepo, String> {
    let mut repos = state.repos.lock().map_err(|e| e.to_string())?;
    let path_buf = std::path::PathBuf::from(&path);

    let default_name = path_buf
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unnamed-repo")
        .to_string();

    let repo_name = name.unwrap_or(default_name);
    let (branch, is_clean, commit_msg, commit_time) = inspect_git(&path);

    let new_repo = LocalRepo {
        id: Uuid::new_v4().to_string(),
        name: repo_name,
        path,
        current_branch: branch,
        is_clean,
        last_commit: commit_msg,
        last_commit_time: commit_time,
        tag: if tag.trim().is_empty() { "General".into() } else { tag },
    };

    repos.push(new_repo.clone());
    save_to_disk(&repos);
    Ok(new_repo)
}

#[tauri::command]
pub fn repos_delete_repo(
    id: String,
    state: tauri::State<'_, ReposState>,
) -> Result<(), String> {
    let mut repos = state.repos.lock().map_err(|e| e.to_string())?;
    let len_before = repos.len();
    repos.retain(|r| r.id != id);
    if repos.len() < len_before {
        save_to_disk(&repos);
        Ok(())
    } else {
        Err("Repository not found in registry".into())
    }
}

#[tauri::command]
pub fn repos_get_details(path: String) -> Result<RepoDetails, String> {
    let branch = Command::new("git")
        .args(["-C", &path, "rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .ok()
        .and_then(|out| if out.status.success() { String::from_utf8(out.stdout).ok() } else { None })
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| "detached".into());

    let branches = Command::new("git")
        .args(["-C", &path, "branch", "--format=%(refname:short)"])
        .output()
        .ok()
        .and_then(|out| if out.status.success() { String::from_utf8(out.stdout).ok() } else { None })
        .map(|s| s.lines().map(|l| l.trim().to_string()).filter(|l| !l.is_empty()).collect())
        .unwrap_or_default();

    let status_out = Command::new("git")
        .args(["-C", &path, "status", "--porcelain"])
        .output()
        .ok()
        .and_then(|out| if out.status.success() { String::from_utf8(out.stdout).ok() } else { None })
        .unwrap_or_default();

    let mut changes = Vec::new();
    for line in status_out.lines() {
        if line.len() >= 4 {
            let status = line[0..2].trim().to_string();
            let file_path = line[3..].trim().to_string();
            changes.push(GitFileChange {
                status: if status.is_empty() { "?".into() } else { status },
                path: file_path,
            });
        }
    }
    let is_clean = changes.is_empty();

    let log_out = Command::new("git")
        .args(["-C", &path, "log", "-n", "25", "--format=%h|||%an|||%cr|||%s"])
        .output()
        .ok()
        .and_then(|out| if out.status.success() { String::from_utf8(out.stdout).ok() } else { None })
        .unwrap_or_default();

    let mut commits = Vec::new();
    for line in log_out.lines() {
        let parts: Vec<&str> = line.split("|||").collect();
        if parts.len() == 4 {
            commits.push(GitCommit {
                hash: parts[0].to_string(),
                author: parts[1].to_string(),
                date_rel: parts[2].to_string(),
                message: parts[3].to_string(),
            });
        }
    }

    Ok(RepoDetails {
        branch,
        branches,
        is_clean,
        commits,
        changes,
    })
}

#[tauri::command]
pub fn repos_commit_and_push(
    path: String,
    message: String,
) -> Result<String, String> {
    let commit_msg = if message.trim().is_empty() {
        format!("feat: sync updates from axis ({})", Local::now().format("%Y-%m-%d %H:%M"))
    } else {
        message.trim().to_string()
    };

    // 1. git add .
    let add_out = Command::new("git")
        .args(["-C", &path, "add", "."])
        .output()
        .map_err(|e| format!("git add error: {}", e))?;

    if !add_out.status.success() {
        return Err(String::from_utf8_lossy(&add_out.stderr).to_string());
    }

    // 2. Comprobar si hay cambios para commitear
    let status_out = Command::new("git")
        .args(["-C", &path, "status", "--porcelain"])
        .output()
        .map_err(|e| format!("git status error: {}", e))?;

    // 3. git commit
    let commit_out = Command::new("git")
        .args(["-C", &path, "commit", "-m", &commit_msg])
        .output()
        .map_err(|e| format!("git commit error: {}", e))?;

    // Si falló el commit pero no es por working tree limpio, retornar error
    if !commit_out.status.success() && !status_out.stdout.is_empty() {
        return Err(String::from_utf8_lossy(&commit_out.stderr).to_string());
    }

    // 4. Obtener la rama actual
    let branch = Command::new("git")
        .args(["-C", &path, "rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .ok()
        .and_then(|out| if out.status.success() { String::from_utf8(out.stdout).ok() } else { None })
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| "main".into());

    // 5. git push origin <branch>
    let push_out = Command::new("git")
        .args(["-C", &path, "push", "origin", &branch])
        .output()
        .map_err(|e| format!("git push error: {}", e))?;

    if !push_out.status.success() {
        return Err(String::from_utf8_lossy(&push_out.stderr).to_string());
    }

    Ok(format!("Pushed to origin/{} successfully", branch))
}
