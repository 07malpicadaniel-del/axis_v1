use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyNote {
    pub id: String,
    pub date: String, // YYYY-MM-DD
    pub content: String,
    pub energy_level: u8, // 1 a 10
    pub created_at: DateTime<Utc>,
}
