fn main() {
    let attributes = tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "get_bob_status",
            "wake_bob_daemon",
            "sync_bob_ecosystem",
            "ask_bob_agent",
            "check_core_status",
            "lifestyle_get_tasks",
            "lifestyle_create_task",
            "lifestyle_update_task_status",
            "lifestyle_delete_task",
            "lifestyle_get_habits",
            "lifestyle_create_habit",
            "lifestyle_toggle_habit",
            "lifestyle_delete_habit",
            "lifestyle_get_schedule",
            "lifestyle_create_schedule_slot",
            "lifestyle_delete_schedule_slot",
            "lifestyle_get_finances",
            "lifestyle_create_finance_entry",
            "lifestyle_delete_finance_entry",
            "lifestyle_get_saving_goals",
            "lifestyle_create_saving_goal",
            "lifestyle_contribute_saving_goal",
            "lifestyle_delete_saving_goal",
            "library_get_items",
            "library_create_item",
            "library_update_item",
            "library_delete_item",
            "repos_get_list",
            "repos_add_repo",
            "repos_delete_repo",
            "repos_get_details",
            "repos_commit_and_push",
            "aurora_health",
            "aurora_launch_hunt",
            "aurora_get_telarana",
            "aurora_get_subgrafo",
            "aurora_list_gatekeeper",
            "aurora_approve_order",
            "aurora_reject_order",
            "aurora_trigger_opt_out",
            "aurora_get_pulse_status",
            "aurora_run_dpo_consolidation",
        ]),
    );

    if let Err(err) = tauri_build::try_build(attributes) {
        eprintln!("Error generando manifiestos ACL de Tauri v2: {err}");
        std::process::exit(1);
    }
}
