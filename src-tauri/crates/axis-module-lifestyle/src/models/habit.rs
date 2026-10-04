use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Habit {
    pub id: String,
    pub name: String,
    pub target_per_week: u32,
    pub streak: u32,
    pub completed_today: bool,
    pub history: Vec<String>, // Fechas en formato YYYY-MM-DD
}
