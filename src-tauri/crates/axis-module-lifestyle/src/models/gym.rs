use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GymSet {
    pub set_number: u32,
    pub weight_kg: f32,
    pub reps: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GymExercise {
    pub id: String,
    pub name: String,
    pub muscle_group: String,
    pub sets: Vec<GymSet>,
    pub logged_at: DateTime<Utc>,
}
