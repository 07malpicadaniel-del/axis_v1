use std::sync::Mutex;
use chrono::{Local, Utc};
use uuid::Uuid;

use crate::models::finance::{FinanceEntry, SavingGoal, TransactionType};
use crate::models::habit::Habit;
use crate::models::schedule::ScheduleSlot;
use crate::models::task::{Priority, Task, TaskStatus};

pub struct LifestyleState {
    pub tasks: Mutex<Vec<Task>>,
    pub habits: Mutex<Vec<Habit>>,
    pub schedule: Mutex<Vec<ScheduleSlot>>,
    pub finance_entries: Mutex<Vec<FinanceEntry>>,
    pub saving_goals: Mutex<Vec<SavingGoal>>,
}

impl Default for LifestyleState {
    fn default() -> Self {
        let today = Local::now().format("%Y-%m-%d").to_string();
        Self {
            tasks: Mutex::new(vec![
                Task::new("Set up development workspace".into(), "Dev".into(), Priority::High),
                Task::new("Plan weekly study blocks".into(), "Academics".into(), Priority::Medium),
            ]),
            habits: Mutex::new(vec![
                Habit {
                    id: Uuid::new_v4().to_string(),
                    name: "Hypertrophy Training".into(),
                    target_per_week: 4,
                    streak: 5,
                    completed_today: true,
                    history: vec![today],
                },
                Habit {
                    id: Uuid::new_v4().to_string(),
                    name: "Read 20 pages".into(),
                    target_per_week: 7,
                    streak: 12,
                    completed_today: false,
                    history: vec![],
                },
            ]),
            schedule: Mutex::new(vec![
                ScheduleSlot {
                    id: Uuid::new_v4().to_string(),
                    day_of_week: 1,
                    start_time: "08:00".into(),
                    end_time: "10:00".into(),
                    activity: "Systems Engineering Lecture".into(),
                    category: "University".into(),
                },
                ScheduleSlot {
                    id: Uuid::new_v4().to_string(),
                    day_of_week: 1,
                    start_time: "17:00".into(),
                    end_time: "19:00".into(),
                    activity: "Hypertrophy Session".into(),
                    category: "Gym".into(),
                },
            ]),
            finance_entries: Mutex::new(vec![
                FinanceEntry {
                    id: Uuid::new_v4().to_string(),
                    title: "Software Engineering Project".into(),
                    amount: 1500.0,
                    transaction_type: TransactionType::Income,
                    category: "Development".into(),
                    date: Utc::now(),
                },
                FinanceEntry {
                    id: Uuid::new_v4().to_string(),
                    title: "Anytime Fitness Membership".into(),
                    amount: 45.0,
                    transaction_type: TransactionType::Expense,
                    category: "Health".into(),
                    date: Utc::now(),
                },
                FinanceEntry {
                    id: Uuid::new_v4().to_string(),
                    title: "Cloud Infrastructure & Domains".into(),
                    amount: 60.0,
                    transaction_type: TransactionType::Expense,
                    category: "Tech".into(),
                    date: Utc::now(),
                },
            ]),
            saving_goals: Mutex::new(vec![
                SavingGoal {
                    id: Uuid::new_v4().to_string(),
                    title: "Workstation Upgrades".into(),
                    target_amount: 2000.0,
                    current_amount: 1400.0,
                },
                SavingGoal {
                    id: Uuid::new_v4().to_string(),
                    title: "Emergency Fund".into(),
                    target_amount: 5000.0,
                    current_amount: 3200.0,
                },
            ]),
        }
    }
}

// ==================== TASKS COMMANDS ====================

#[tauri::command]
pub fn lifestyle_get_tasks(state: tauri::State<'_, LifestyleState>) -> Result<Vec<Task>, String> {
    let tasks = state.tasks.lock().map_err(|e| e.to_string())?;
    Ok(tasks.clone())
}

#[tauri::command]
pub fn lifestyle_create_task(
    title: String,
    description: Option<String>,
    category: String,
    priority: Priority,
    due_date: Option<String>,
    state: tauri::State<'_, LifestyleState>,
) -> Result<Task, String> {
    let mut tasks = state.tasks.lock().map_err(|e| e.to_string())?;
    let mut new_task = Task::new(title, category, priority);
    new_task.description = description;

    if let Some(d) = due_date {
        if let Ok(parsed) = chrono::DateTime::parse_from_rfc3339(&d) {
            new_task.due_date = Some(parsed.with_timezone(&Utc));
        }
    }

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
        Err("Task not found".into())
    }
}

#[tauri::command]
pub fn lifestyle_delete_task(
    task_id: String,
    state: tauri::State<'_, LifestyleState>,
) -> Result<(), String> {
    let mut tasks = state.tasks.lock().map_err(|e| e.to_string())?;
    let len_before = tasks.len();
    tasks.retain(|t| t.id != task_id);
    if tasks.len() < len_before {
        Ok(())
    } else {
        Err("Could not delete: task not found".into())
    }
}

// ==================== HABITS COMMANDS ====================

#[tauri::command]
pub fn lifestyle_get_habits(state: tauri::State<'_, LifestyleState>) -> Result<Vec<Habit>, String> {
    let habits = state.habits.lock().map_err(|e| e.to_string())?;
    let today = Local::now().format("%Y-%m-%d").to_string();

    let synced: Vec<Habit> = habits
        .iter()
        .map(|h| {
            let mut item = h.clone();
            item.completed_today = item.history.contains(&today);
            item
        })
        .collect();

    Ok(synced)
}

#[tauri::command]
pub fn lifestyle_create_habit(
    name: String,
    target_per_week: u32,
    state: tauri::State<'_, LifestyleState>,
) -> Result<Habit, String> {
    let mut habits = state.habits.lock().map_err(|e| e.to_string())?;
    let new_habit = Habit {
        id: Uuid::new_v4().to_string(),
        name,
        target_per_week: if target_per_week == 0 { 7 } else { target_per_week },
        streak: 0,
        completed_today: false,
        history: Vec::new(),
    };
    habits.push(new_habit.clone());
    Ok(new_habit)
}

#[tauri::command]
pub fn lifestyle_toggle_habit(
    habit_id: String,
    date: Option<String>,
    state: tauri::State<'_, LifestyleState>,
) -> Result<Habit, String> {
    let mut habits = state.habits.lock().map_err(|e| e.to_string())?;
    let target_date = date.unwrap_or_else(|| Local::now().format("%Y-%m-%d").to_string());

    if let Some(habit) = habits.iter_mut().find(|h| h.id == habit_id) {
        if let Some(idx) = habit.history.iter().position(|d| d == &target_date) {
            habit.history.remove(idx);
            if habit.streak > 0 {
                habit.streak -= 1;
            }
        } else {
            habit.history.push(target_date.clone());
            habit.streak += 1;
        }

        let today = Local::now().format("%Y-%m-%d").to_string();
        habit.completed_today = habit.history.contains(&today);
        Ok(habit.clone())
    } else {
        Err("Habit not found".into())
    }
}

#[tauri::command]
pub fn lifestyle_delete_habit(
    habit_id: String,
    state: tauri::State<'_, LifestyleState>,
) -> Result<(), String> {
    let mut habits = state.habits.lock().map_err(|e| e.to_string())?;
    let len_before = habits.len();
    habits.retain(|h| h.id != habit_id);
    if habits.len() < len_before {
        Ok(())
    } else {
        Err("Could not delete: habit not found".into())
    }
}

// ==================== SCHEDULE COMMANDS ====================

#[tauri::command]
pub fn lifestyle_get_schedule(
    state: tauri::State<'_, LifestyleState>,
) -> Result<Vec<ScheduleSlot>, String> {
    let schedule = state.schedule.lock().map_err(|e| e.to_string())?;
    Ok(schedule.clone())
}

#[tauri::command]
pub fn lifestyle_create_schedule_slot(
    day_of_week: u8,
    start_time: String,
    end_time: String,
    activity: String,
    category: String,
    state: tauri::State<'_, LifestyleState>,
) -> Result<ScheduleSlot, String> {
    let mut schedule = state.schedule.lock().map_err(|e| e.to_string())?;
    let new_slot = ScheduleSlot {
        id: Uuid::new_v4().to_string(),
        day_of_week: if day_of_week == 0 || day_of_week > 7 { 1 } else { day_of_week },
        start_time,
        end_time,
        activity,
        category,
    };
    schedule.push(new_slot.clone());
    Ok(new_slot)
}

#[tauri::command]
pub fn lifestyle_delete_schedule_slot(
    slot_id: String,
    state: tauri::State<'_, LifestyleState>,
) -> Result<(), String> {
    let mut schedule = state.schedule.lock().map_err(|e| e.to_string())?;
    let len_before = schedule.len();
    schedule.retain(|s| s.id != slot_id);
    if schedule.len() < len_before {
        Ok(())
    } else {
        Err("Could not delete: schedule slot not found".into())
    }
}

// ==================== FINANCES COMMANDS ====================

#[tauri::command]
pub fn lifestyle_get_finances(
    state: tauri::State<'_, LifestyleState>,
) -> Result<Vec<FinanceEntry>, String> {
    let entries = state.finance_entries.lock().map_err(|e| e.to_string())?;
    Ok(entries.clone())
}

#[tauri::command]
pub fn lifestyle_create_finance_entry(
    title: String,
    amount: f64,
    transaction_type: TransactionType,
    category: String,
    state: tauri::State<'_, LifestyleState>,
) -> Result<FinanceEntry, String> {
    let mut entries = state.finance_entries.lock().map_err(|e| e.to_string())?;
    let new_entry = FinanceEntry {
        id: Uuid::new_v4().to_string(),
        title,
        amount: amount.abs(),
        transaction_type,
        category,
        date: Utc::now(),
    };
    entries.push(new_entry.clone());
    Ok(new_entry)
}

#[tauri::command]
pub fn lifestyle_delete_finance_entry(
    entry_id: String,
    state: tauri::State<'_, LifestyleState>,
) -> Result<(), String> {
    let mut entries = state.finance_entries.lock().map_err(|e| e.to_string())?;
    let len_before = entries.len();
    entries.retain(|e| e.id != entry_id);
    if entries.len() < len_before {
        Ok(())
    } else {
        Err("Could not delete: transaction not found".into())
    }
}

#[tauri::command]
pub fn lifestyle_get_saving_goals(
    state: tauri::State<'_, LifestyleState>,
) -> Result<Vec<SavingGoal>, String> {
    let goals = state.saving_goals.lock().map_err(|e| e.to_string())?;
    Ok(goals.clone())
}

#[tauri::command]
pub fn lifestyle_create_saving_goal(
    title: String,
    target_amount: f64,
    state: tauri::State<'_, LifestyleState>,
) -> Result<SavingGoal, String> {
    let mut goals = state.saving_goals.lock().map_err(|e| e.to_string())?;
    let new_goal = SavingGoal {
        id: Uuid::new_v4().to_string(),
        title,
        target_amount: target_amount.abs(),
        current_amount: 0.0,
    };
    goals.push(new_goal.clone());
    Ok(new_goal)
}

#[tauri::command]
pub fn lifestyle_contribute_saving_goal(
    goal_id: String,
    amount: f64,
    state: tauri::State<'_, LifestyleState>,
) -> Result<SavingGoal, String> {
    let mut goals = state.saving_goals.lock().map_err(|e| e.to_string())?;
    if let Some(goal) = goals.iter_mut().find(|g| g.id == goal_id) {
        goal.current_amount += amount;
        if goal.current_amount < 0.0 {
            goal.current_amount = 0.0;
        }
        Ok(goal.clone())
    } else {
        Err("Saving goal not found".into())
    }
}

#[tauri::command]
pub fn lifestyle_delete_saving_goal(
    goal_id: String,
    state: tauri::State<'_, LifestyleState>,
) -> Result<(), String> {
    let mut goals = state.saving_goals.lock().map_err(|e| e.to_string())?;
    let len_before = goals.len();
    goals.retain(|g| g.id != goal_id);
    if goals.len() < len_before {
        Ok(())
    } else {
        Err("Could not delete: saving goal not found".into())
    }
}
