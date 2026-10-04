use std::sync::Mutex;
use crate::models::task::{Priority, Task, TaskStatus};

pub struct LifestyleState {
    pub tasks: Mutex<Vec<Task>>,
}

impl Default for LifestyleState {
    fn default() -> Self {
        Self {
            tasks: Mutex::new(vec![
                Task::new("Diseñar arquitectura de Bob".into(), "AI".into(), Priority::High),
                Task::new("Revisar contratos en TRATO".into(), "Legal".into(), Priority::Medium),
            ]),
        }
    }
}

#[tauri::command]
pub fn lifestyle_get_tasks(state: tauri::State<'_, LifestyleState>) -> Result<Vec<Task>, String> {
    let tasks = state.tasks.lock().map_err(|e| e.to_string())?;
    Ok(tasks.clone())
}

#[tauri::command]
pub fn lifestyle_create_task(
    title: String,
    category: String,
    priority: Priority,
    state: tauri::State<'_, LifestyleState>,
) -> Result<Task, String> {
    let mut tasks = state.tasks.lock().map_err(|e| e.to_string())?;
    let new_task = Task::new(title, category, priority);
    tasks.push(new_task.clone());
    Ok(new_task)
}

#[tauri::command]
pub fn lifestyle_update_task_status(
    task_id: String,
    status: TaskStatus,
    state: tauri::State<'_, LifestyleState>,
) -> Result<(), String> {
    let mut tasks = state.tasks.lock().map_err(|e| e.to_string())?;
    if let Some(task) = tasks.iter_mut().find(|t| t.id == task_id) {
        task.status = status;
        Ok(())
    } else {
        Err("Tarea no encontrada".into())
    }
}
