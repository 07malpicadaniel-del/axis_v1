#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use axis_module_lifestyle::commands::LifestyleState;
use axis_module_library::commands::LibraryState;

fn main() {
    tauri::Builder::default()
        .manage(LifestyleState::default())
        .manage(LibraryState::default())
        .invoke_handler(tauri::generate_handler![
            axis_core::commands::check_core_status,
            // Lifestyle: Tasks
            axis_module_lifestyle::commands::lifestyle_get_tasks,
            axis_module_lifestyle::commands::lifestyle_create_task,
            axis_module_lifestyle::commands::lifestyle_update_task_status,
            axis_module_lifestyle::commands::lifestyle_delete_task,
            // Lifestyle: Habits
            axis_module_lifestyle::commands::lifestyle_get_habits,
            axis_module_lifestyle::commands::lifestyle_create_habit,
            axis_module_lifestyle::commands::lifestyle_toggle_habit,
            axis_module_lifestyle::commands::lifestyle_delete_habit,
            // Lifestyle: Schedule
            axis_module_lifestyle::commands::lifestyle_get_schedule,
            axis_module_lifestyle::commands::lifestyle_create_schedule_slot,
            axis_module_lifestyle::commands::lifestyle_delete_schedule_slot,
            // Lifestyle: Finances
            axis_module_lifestyle::commands::lifestyle_get_finances,
            axis_module_lifestyle::commands::lifestyle_create_finance_entry,
            axis_module_lifestyle::commands::lifestyle_delete_finance_entry,
            axis_module_lifestyle::commands::lifestyle_get_saving_goals,
            axis_module_lifestyle::commands::lifestyle_create_saving_goal,
            axis_module_lifestyle::commands::lifestyle_contribute_saving_goal,
            axis_module_lifestyle::commands::lifestyle_delete_saving_goal,
            // Library Commands
            axis_module_library::commands::library_get_items,
            axis_module_library::commands::library_create_item,
            axis_module_library::commands::library_update_item,
            axis_module_library::commands::library_delete_item,
        ])
        .run(tauri::generate_context!())
        .expect("Error al ejecutar el núcleo de AXIS");
}
