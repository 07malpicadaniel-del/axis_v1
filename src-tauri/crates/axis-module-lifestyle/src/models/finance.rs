use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TransactionType {
    Income,
    Expense,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinanceEntry {
    pub id: String,
    pub title: String,
    pub amount: f64,
    pub transaction_type: TransactionType,
    pub category: String,
    pub date: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavingGoal {
    pub id: String,
    pub title: String,
    pub target_amount: f64,
    pub current_amount: f64,
}
