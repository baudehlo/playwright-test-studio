use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Test {
    pub id: String,
    pub name: String,
    pub description: String,
    pub script: String,
    #[serde(rename = "parentId", skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    pub variables: std::collections::HashMap<String, String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Screenshot {
    pub id: String,
    pub path: String,
    pub description: String,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HttpFailure {
    pub url: String,
    pub method: String,
    pub status: u32,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LogEntry {
    pub level: String,
    pub message: String,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Run {
    pub id: String,
    #[serde(rename = "testId")]
    pub test_id: String,
    pub status: String,
    #[serde(rename = "startedAt")]
    pub started_at: String,
    #[serde(rename = "completedAt", skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<String>,
    pub screenshots: Vec<Screenshot>,
    #[serde(rename = "httpFailures")]
    pub http_failures: Vec<HttpFailure>,
    pub log: Vec<LogEntry>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    #[serde(rename = "aiProvider")]
    pub ai_provider: String,
    #[serde(rename = "apiKey")]
    pub api_key: String,
    pub model: String,
    #[serde(rename = "baseUrl", skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
}

fn get_app_data_path(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().expect("Failed to get app data dir")
}

#[tauri::command]
pub fn get_app_data_dir(app: AppHandle) -> String {
    get_app_data_path(&app).to_string_lossy().to_string()
}

#[tauri::command]
pub fn get_tests(app: AppHandle) -> Vec<Test> {
    let path = get_app_data_path(&app).join("tests.json");
    if !path.exists() {
        return vec![];
    }
    let data = fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&data).unwrap_or_default()
}

#[tauri::command]
pub fn save_tests(app: AppHandle, tests: Vec<Test>) -> Result<(), String> {
    let dir = get_app_data_path(&app);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("tests.json");
    let data = serde_json::to_string_pretty(&tests).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_runs(app: AppHandle, test_id: String) -> Vec<Run> {
    let path = get_app_data_path(&app)
        .join("runs")
        .join(&test_id)
        .join("index.json");
    if !path.exists() {
        return vec![];
    }
    let data = fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&data).unwrap_or_default()
}

#[tauri::command]
pub fn get_run(app: AppHandle, test_id: String, run_id: String) -> Option<Run> {
    let path = get_app_data_path(&app)
        .join("runs")
        .join(&test_id)
        .join(&run_id)
        .join("run.json");
    if !path.exists() {
        return None;
    }
    let data = fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&data).ok()
}

#[tauri::command]
pub fn save_run(app: AppHandle, test_id: String, run: Run) -> Result<(), String> {
    let run_dir = get_app_data_path(&app)
        .join("runs")
        .join(&test_id)
        .join(&run.id);
    fs::create_dir_all(&run_dir).map_err(|e| e.to_string())?;

    let run_path = run_dir.join("run.json");
    let data = serde_json::to_string_pretty(&run).map_err(|e| e.to_string())?;
    fs::write(run_path, data).map_err(|e| e.to_string())?;

    // Update index
    let mut runs = get_runs(app.clone(), test_id.clone());
    let idx = runs.iter().position(|r| r.id == run.id);
    match idx {
        Some(i) => runs[i] = run,
        None => runs.insert(0, run),
    }
    // Keep only the most recent 50 runs per test in the quick-access index.
    // Older run data remains on disk but won't appear in the run history panel.
    // This bounds the index file size and memory usage in the UI.
    const MAX_RUNS_IN_INDEX: usize = 50;
    runs.truncate(MAX_RUNS_IN_INDEX);

    let index_path = get_app_data_path(&app)
        .join("runs")
        .join(&test_id)
        .join("index.json");
    let index_data = serde_json::to_string_pretty(&runs).map_err(|e| e.to_string())?;
    fs::write(index_path, index_data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_screenshot_data(
    app: AppHandle,
    test_id: String,
    run_id: String,
    filename: String,
) -> Result<Vec<u8>, String> {
    let path = get_app_data_path(&app)
        .join("runs")
        .join(&test_id)
        .join(&run_id)
        .join("screenshots")
        .join(&filename);
    fs::read(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Settings {
    let path = get_app_data_path(&app).join("settings.json");
    if !path.exists() {
        return Settings {
            ai_provider: "openai".to_string(),
            api_key: String::new(),
            model: "gpt-4o".to_string(),
            base_url: None,
        };
    }
    let data = fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&data).unwrap_or(Settings {
        ai_provider: "openai".to_string(),
        api_key: String::new(),
        model: "gpt-4o".to_string(),
        base_url: None,
    })
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    let dir = get_app_data_path(&app);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("settings.json");
    let data = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn copy_runner_to_app_dir(app: AppHandle, app_data_dir: String) -> Result<(), String> {
    let dest_dir = PathBuf::from(&app_data_dir);
    fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;
    let dest = dest_dir.join("runner.js");
    if dest.exists() {
        return Ok(());
    }
    // Try to find bundled runner.js
    let resource_path = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("runner.js");
    if resource_path.exists() {
        fs::copy(&resource_path, &dest).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn run_test(
    app: AppHandle,
    test: Test,
    settings: Settings,
    app_data_dir: String,
) -> Result<String, String> {
    let run_id = uuid::Uuid::new_v4().to_string();
    let run_dir = PathBuf::from(&app_data_dir)
        .join("runs")
        .join(&test.id)
        .join(&run_id);
    let screenshots_dir = run_dir.join("screenshots");
    fs::create_dir_all(&screenshots_dir).map_err(|e| e.to_string())?;

    // Build ancestor chain so the runner can provide context from parent tests.
    // Walk up the parentId chain (stopping on cycles) and collect in execution order.
    let all_tests = get_tests(app.clone());
    let mut parent_tests: Vec<Test> = Vec::new();
    let mut visited: std::collections::HashSet<String> = std::collections::HashSet::new();
    visited.insert(test.id.clone());
    let mut current_parent_id = test.parent_id.clone();
    while let Some(ref pid) = current_parent_id {
        if visited.contains(pid) {
            break; // guard against cycles
        }
        visited.insert(pid.clone());
        if let Some(parent) = all_tests.iter().find(|t| &t.id == pid) {
            parent_tests.insert(0, parent.clone());
            current_parent_id = parent.parent_id.clone();
        } else {
            break;
        }
    }

    let config = serde_json::json!({
        "test": test,
        "parentTests": parent_tests,
        "settings": settings,
        "runDir": run_dir.to_string_lossy(),
        "screenshotsDir": screenshots_dir.to_string_lossy(),
        "runId": run_id,
    });
    let config_str = serde_json::to_string(&config).map_err(|e| e.to_string())?;

    let runner_path = PathBuf::from(&app_data_dir).join("runner.js");

    let app_handle = app.clone();
    let run_id_clone = run_id.clone();
    let test_id = test.id.clone();

    std::thread::spawn(move || {
        let result = std::process::Command::new("node")
            .arg(&runner_path)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn();

        match result {
            Err(e) => {
                let _ = app_handle.emit(
                    "run-event",
                    serde_json::json!({
                        "type": "error",
                        "message": format!("Failed to start runner: {}", e),
                        "timestamp": chrono::Utc::now().to_rfc3339(),
                        "runId": run_id_clone,
                    }),
                );
            }
            Ok(mut child) => {
                // Write config to stdin
                if let Some(stdin) = child.stdin.take() {
                    use std::io::Write;
                    let mut stdin = stdin;
                    let _ = stdin.write_all(config_str.as_bytes());
                    drop(stdin);
                }

                // Read stdout line by line and emit events
                if let Some(stdout) = child.stdout.take() {
                    use std::io::BufRead;
                    let reader = std::io::BufReader::new(stdout);
                    for line in reader.lines() {
                        match line {
                            Ok(l) if !l.trim().is_empty() => {
                                if let Ok(event) = serde_json::from_str::<serde_json::Value>(&l) {
                                    let _ = app_handle.emit("run-event", event);
                                }
                            }
                            _ => {}
                        }
                    }
                }

                let _ = child.wait();

                // Load and save final run from run.json if it exists
                let run_json_path = run_dir.join("run.json");
                if run_json_path.exists() {
                    if let Ok(data) = fs::read_to_string(&run_json_path) {
                        if let Ok(run) = serde_json::from_str::<Run>(&data) {
                            let _ = save_run(app_handle.clone(), test_id.clone(), run);
                        }
                    }
                }
            }
        }
    });

    Ok(run_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_app_data_dir,
            get_tests,
            save_tests,
            get_runs,
            get_run,
            save_run,
            get_screenshot_data,
            get_settings,
            save_settings,
            copy_runner_to_app_dir,
            run_test,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
