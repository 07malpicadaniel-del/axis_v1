use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TaskStatus {
    Pending,
    InProgress,
    Completed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Priority {
    Low,
    Medium,
    High,
    Urgent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: TaskStatus,
    pub priority: Priority,
    pub category: String,
    pub due_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

impl Task {
    pub fn new(title: String, category: String, priority: Priority) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            title,
            description: None,
            status: TaskStatus::Pending,
            priority,
            category,
            due_date: None,
            created_at: Utc::now(),
        }
    }
}
