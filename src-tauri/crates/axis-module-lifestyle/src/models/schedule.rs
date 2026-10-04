use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleSlot {
    pub id: String,
    pub day_of_week: u8, // 1 (Lunes) a 7 (Domingo)
    pub start_time: String, // HH:MM
    pub end_time: String,   // HH:MM
    pub activity: String,
    pub category: String,
}
