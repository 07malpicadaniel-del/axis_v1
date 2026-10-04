#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use axis_module_lifestyle::commands::LifestyleState;

fn main() {
    tauri::Builder::default()
        .manage(LifestyleState::default())
        .invoke_handler(tauri::generate_handler![
            axis_core::commands::check_core_status,
            axis_module_lifestyle::commands::lifestyle_get_tasks,
            axis_module_lifestyle::commands::lifestyle_create_task,
            axis_module_lifestyle::commands::lifestyle_update_task_status,
        ])
        .run(tauri::generate_context!())
        .expect("Error al ejecutar el núcleo de AXIS");
}
