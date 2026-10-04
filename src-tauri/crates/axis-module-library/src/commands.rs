use std::sync::Mutex;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryItem {
    pub id: String,
    pub title: String,
    pub category: String, // "Journal", "Notes", "Books", "Research"
    pub content: String,
    pub tags: Vec<String>,
    pub updated_at: DateTime<Utc>,
}

pub struct LibraryState {
    pub items: Mutex<Vec<LibraryItem>>,
}

impl Default for LibraryState {
    fn default() -> Self {
        Self {
            items: Mutex::new(vec![
                LibraryItem {
                    id: Uuid::new_v4().to_string(),
                    title: "Architecture & System Vision".into(),
                    category: "Research".into(),
                    content: "# AXIS Architecture\n\nModular local-first workstation hub.\n- Decoupled Rust crates\n- Markdown-compatible data store".into(),
                    tags: vec!["architecture".into(), "rust".into()],
                    updated_at: Utc::now(),
                },
                LibraryItem {
                    id: Uuid::new_v4().to_string(),
                    title: "October 04 - Daily Check-in".into(),
                    category: "Journal".into(),
                    content: "Completed Lifestyle modules setup. Shifted focus to knowledge base and reading notes directly inside Axis Library.".into(),
                    tags: vec!["journal".into(), "daily".into()],
                    updated_at: Utc::now(),
                },
            ]),
        }
    }
}

#[tauri::command]
pub fn library_get_items(state: tauri::State<'_, LibraryState>) -> Result<Vec<LibraryItem>, String> {
    let items = state.items.lock().map_err(|e| e.to_string())?;
    Ok(items.clone())
}

#[tauri::command]
pub fn library_create_item(
    title: String,
    category: String,
    content: String,
    tags: Vec<String>,
    state: tauri::State<'_, LibraryState>,
) -> Result<LibraryItem, String> {
    let mut items = state.items.lock().map_err(|e| e.to_string())?;
    let new_item = LibraryItem {
        id: Uuid::new_v4().to_string(),
        title,
        category: if category.trim().is_empty() { "Notes".into() } else { category },
        content,
        tags,
        updated_at: Utc::now(),
    };
    items.push(new_item.clone());
    Ok(new_item)
}

#[tauri::command]
pub fn library_update_item(
    id: String,
    title: String,
    category: String,
    content: String,
    tags: Vec<String>,
    state: tauri::State<'_, LibraryState>,
) -> Result<LibraryItem, String> {
    let mut items = state.items.lock().map_err(|e| e.to_string())?;
    if let Some(item) = items.iter_mut().find(|i| i.id == id) {
        item.title = title;
        item.category = category;
        item.content = content;
        item.tags = tags;
        item.updated_at = Utc::now();
        Ok(item.clone())
    } else {
        Err("Library item not found".into())
    }
}

#[tauri::command]
pub fn library_delete_item(
    id: String,
    state: tauri::State<'_, LibraryState>,
) -> Result<(), String> {
    let mut items = state.items.lock().map_err(|e| e.to_string())?;
    let len_before = items.len();
    items.retain(|i| i.id != id);
    if items.len() < len_before {
        Ok(())
    } else {
        Err("Could not delete: item not found".into())
    }
}
