use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub variables: std::collections::HashMap<String, String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub browsers: Option<Vec<String>>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Test {
    pub id: String,
    pub name: String,
    pub description: String,
    pub script: String,
    #[serde(rename = "parentId", skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    #[serde(rename = "collectionId", skip_serializing_if = "Option::is_none")]
    pub collection_id: Option<String>,
    pub variables: std::collections::HashMap<String, String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub browsers: Option<Vec<String>>,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub browser: Option<String>,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub browsers: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowState {
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
}

fn get_app_data_path(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().expect("Failed to get app data dir")
}

fn load_window_state_from_disk(app: &AppHandle) -> Option<WindowState> {
    let path = get_app_data_path(app).join("window-state.json");
    if !path.exists() {
        return None;
    }
    let data = fs::read_to_string(&path).ok()?;
    serde_json::from_str(&data).ok()
}

fn save_window_state_to_disk(app: &AppHandle, state: &WindowState) -> Result<(), String> {
    let dir = get_app_data_path(app);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("window-state.json");
    let data = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())
}

fn is_window_state_visible_on_monitor(state: &WindowState, monitor: &tauri::Monitor) -> bool {
    let window_left = i64::from(state.x);
    let window_top = i64::from(state.y);
    let window_right = window_left + i64::from(state.width);
    let window_bottom = window_top + i64::from(state.height);

    let monitor_left = i64::from(monitor.position().x);
    let monitor_top = i64::from(monitor.position().y);
    let monitor_right = monitor_left + i64::from(monitor.size().width);
    let monitor_bottom = monitor_top + i64::from(monitor.size().height);

    let overlap_width = std::cmp::min(window_right, monitor_right) - std::cmp::max(window_left, monitor_left);
    let overlap_height = std::cmp::min(window_bottom, monitor_bottom) - std::cmp::max(window_top, monitor_top);

    overlap_width >= 80 && overlap_height >= 80
}

#[tauri::command]
fn get_app_data_dir(app: AppHandle) -> String {
    get_app_data_path(&app).to_string_lossy().to_string()
}

#[tauri::command]
fn get_tests(app: AppHandle) -> Vec<Test> {
    let path = get_app_data_path(&app).join("tests.json");
    if !path.exists() {
        return vec![];
    }
    let data = fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&data).unwrap_or_default()
}

#[tauri::command]
fn save_tests(app: AppHandle, tests: Vec<Test>) -> Result<(), String> {
    let dir = get_app_data_path(&app);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("tests.json");
    let data = serde_json::to_string_pretty(&tests).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_runs(app: AppHandle, test_id: String) -> Vec<Run> {
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
fn get_run(app: AppHandle, test_id: String, run_id: String) -> Option<Run> {
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
fn save_run(app: AppHandle, test_id: String, run: Run) -> Result<(), String> {
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
fn get_screenshot_data(
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
fn get_settings(app: AppHandle) -> Settings {
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
fn save_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    let dir = get_app_data_path(&app);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("settings.json");
    let data = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_window_state(app: AppHandle) -> Option<WindowState> {
    load_window_state_from_disk(&app)
}

#[tauri::command]
fn save_window_state(app: AppHandle, state: WindowState) -> Result<(), String> {
    save_window_state_to_disk(&app, &state)
}

#[tauri::command]
fn clear_window_state(app: AppHandle) -> Result<(), String> {
    let path = get_app_data_path(&app).join("window-state.json");
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn get_collections(app: AppHandle) -> Vec<Collection> {
    let path = get_app_data_path(&app).join("collections.json");
    if !path.exists() {
        return vec![];
    }
    let data = fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&data).unwrap_or_default()
}

#[tauri::command]
fn save_collections(app: AppHandle, collections: Vec<Collection>) -> Result<(), String> {
    let dir = get_app_data_path(&app);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("collections.json");
    let data = serde_json::to_string_pretty(&collections).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_global_variables(app: AppHandle) -> std::collections::HashMap<String, String> {
    let path = get_app_data_path(&app).join("global-variables.json");
    if !path.exists() {
        return std::collections::HashMap::new();
    }
    let data = fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&data).unwrap_or_default()
}

#[tauri::command]
fn save_global_variables(
    app: AppHandle,
    variables: std::collections::HashMap<String, String>,
) -> Result<(), String> {
    let dir = get_app_data_path(&app);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("global-variables.json");
    let data = serde_json::to_string_pretty(&variables).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn copy_runner_to_app_dir(app: AppHandle, app_data_dir: String) -> Result<(), String> {
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

fn resolve_runner_entry(app: &AppHandle, app_data_dir: &str) -> Result<PathBuf, String> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    // Development path: keep runner in its package so ESM imports resolve via runner/node_modules.
    let dev_runner_dir = manifest_dir.join("..").join("runner");
    let dev_runner_entry = dev_runner_dir.join("dist").join("runner.js");
    if dev_runner_entry.exists() && dev_runner_dir.join("node_modules").exists() {
        return Ok(dev_runner_entry);
    }

    // Production path: bundled resource. Run from resource dir so adjacent node_modules can be resolved if bundled.
    if let Ok(resource_dir) = app.path().resource_dir() {
        let resource_runner = resource_dir.join("runner.js");
        if resource_runner.exists() {
            return Ok(resource_runner);
        }
    }

    // Last fallback: app-data runner copied by legacy flow.
    let app_data_runner = PathBuf::from(app_data_dir).join("runner.js");
    if app_data_runner.exists() {
        return Ok(app_data_runner);
    }

    Err(format!(
        "runner.js was not found in expected locations. Checked: {}, bundled resource dir, and {}. Run 'npm run bundle-runner' from the project root and retry.",
        dev_runner_entry.to_string_lossy(),
        app_data_runner.to_string_lossy()
    ))
}

fn get_playwright_cache_dir() -> Option<PathBuf> {
    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").ok()?;
        Some(PathBuf::from(home).join(".cache").join("ms-playwright"))
    }
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").ok()?;
        Some(
            PathBuf::from(home)
                .join("Library")
                .join("Caches")
                .join("ms-playwright"),
        )
    }
    #[cfg(target_os = "windows")]
    {
        let local_app_data = std::env::var("LOCALAPPDATA").ok()?;
        Some(PathBuf::from(local_app_data).join("ms-playwright"))
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        None
    }
}

#[tauri::command]
fn get_installed_browsers() -> Vec<String> {
    // Chromium is always included — @playwright/mcp defaults to Chromium and it
    // is bundled with the Playwright install.
    let mut installed = vec!["chromium".to_string()];

    if let Some(dir) = get_playwright_cache_dir() {
        for browser in &["firefox", "webkit"] {
            let prefix = format!("{}-", browser);
            let found = fs::read_dir(&dir)
                .ok()
                .map(|entries| {
                    entries.flatten().any(|entry| {
                        entry
                            .file_name()
                            .to_str()
                            .map(|n| n.starts_with(&prefix))
                            .unwrap_or(false)
                    })
                })
                .unwrap_or(false);
            if found {
                installed.push(browser.to_string());
            }
        }
    }

    installed
}

#[tauri::command]
fn run_test(
    app: AppHandle,
    test: Test,
    settings: Settings,
    app_data_dir: String,
    browser: Option<String>,
) -> Result<String, String> {
    let runner_path = resolve_runner_entry(&app, &app_data_dir)?;

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

    // Browser state policy:
    // - Root runs start clean (reset profile)
    // - Descendant runs preserve profile so chain runs can continue statefully
    let chain_root_test_id = parent_tests
        .first()
        .map(|t| t.id.clone())
        .unwrap_or_else(|| test.id.clone());
    let storage_policy = if parent_tests.is_empty() {
        "reset"
    } else {
        "preserve"
    };

    let profile_dir = PathBuf::from(&app_data_dir)
        .join("browser-profiles")
        .join(&chain_root_test_id);

    if storage_policy == "reset" && profile_dir.exists() {
        fs::remove_dir_all(&profile_dir).map_err(|e| {
            format!(
                "Failed to clear browser profile for chain root '{}': {}",
                chain_root_test_id, e
            )
        })?;
    }

    fs::create_dir_all(&profile_dir).map_err(|e| {
        format!(
            "Failed to prepare browser profile for chain root '{}': {}",
            chain_root_test_id, e
        )
    })?;

    let config = serde_json::json!({
        "test": test,
        "parentTests": parent_tests,
        "settings": settings,
        "runDir": run_dir.to_string_lossy(),
        "screenshotsDir": screenshots_dir.to_string_lossy(),
        "runId": run_id,
        "storagePolicy": storage_policy,
        "chainRootTestId": chain_root_test_id,
        "profileDir": profile_dir.to_string_lossy(),
        "browser": browser,
    });
    let config_str = serde_json::to_string(&config).map_err(|e| e.to_string())?;

    let app_handle = app.clone();
    let run_id_clone = run_id.clone();
    let test_id = test.id.clone();
    let browser_clone = browser.clone();

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

                let saw_terminal_event = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
                let stderr_lines: std::sync::Arc<std::sync::Mutex<Vec<String>>> =
                    std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));

                // Read stderr in parallel so failures are visible in the UI.
                let stderr_handle = if let Some(stderr) = child.stderr.take() {
                    let app_handle = app_handle.clone();
                    let run_id_for_stderr = run_id_clone.clone();
                    let stderr_lines = stderr_lines.clone();
                    Some(std::thread::spawn(move || {
                        use std::io::BufRead;
                        let reader = std::io::BufReader::new(stderr);
                        for line in reader.lines() {
                            if let Ok(l) = line {
                                let trimmed = l.trim();
                                if trimmed.is_empty() {
                                    continue;
                                }

                                if let Ok(mut lines) = stderr_lines.lock() {
                                    lines.push(trimmed.to_string());
                                }

                                let _ = app_handle.emit(
                                    "run-event",
                                    serde_json::json!({
                                        "type": "log",
                                        "level": "error",
                                        "message": format!("runner stderr: {}", trimmed),
                                        "timestamp": chrono::Utc::now().to_rfc3339(),
                                        "runId": run_id_for_stderr.clone(),
                                    }),
                                );
                            }
                        }
                    }))
                } else {
                    None
                };

                // Read stdout line by line and emit events
                if let Some(stdout) = child.stdout.take() {
                    use std::io::BufRead;
                    let reader = std::io::BufReader::new(stdout);
                    for line in reader.lines() {
                        match line {
                            Ok(l) if !l.trim().is_empty() => {
                                if let Ok(event) = serde_json::from_str::<serde_json::Value>(&l) {
                                    if let Some(event_type) = event.get("type").and_then(|v| v.as_str()) {
                                        if event_type == "complete" || event_type == "error" {
                                            saw_terminal_event.store(true, std::sync::atomic::Ordering::Relaxed);
                                        }
                                    }
                                    let _ = app_handle.emit("run-event", event);
                                } else {
                                    let _ = app_handle.emit(
                                        "run-event",
                                        serde_json::json!({
                                            "type": "log",
                                            "level": "warn",
                                            "message": format!("runner stdout: {}", l),
                                            "timestamp": chrono::Utc::now().to_rfc3339(),
                                            "runId": run_id_clone.clone(),
                                        }),
                                    );
                                }
                            }
                            _ => {}
                        }
                    }
                }

                let wait_result = child.wait();

                if let Some(handle) = stderr_handle {
                    let _ = handle.join();
                }

                let no_terminal_event = !saw_terminal_event.load(std::sync::atomic::Ordering::Relaxed);
                if no_terminal_event {
                    let stderr_summary = stderr_lines
                        .lock()
                        .ok()
                        .and_then(|lines| {
                            if lines.is_empty() {
                                None
                            } else {
                                Some(lines.join(" | "))
                            }
                        });
                    let wait_msg = match wait_result {
                        Ok(status) => format!("Runner exited with status: {}", status),
                        Err(e) => format!("Failed to wait for runner process: {}", e),
                    };
                    let message = match stderr_summary {
                        Some(summary) => format!("{}; stderr: {}", wait_msg, summary),
                        None => wait_msg,
                    };

                    let _ = app_handle.emit(
                        "run-event",
                        serde_json::json!({
                            "type": "error",
                            "message": message,
                            "timestamp": chrono::Utc::now().to_rfc3339(),
                            "runId": run_id_clone,
                        }),
                    );

                    // Persist a fallback failed run so terminal failures still
                    // appear in run history and logs are accessible.
                    let fallback_run = Run {
                        id: run_id_clone.clone(),
                        test_id: test_id.clone(),
                        browser: browser_clone.clone(),
                        status: "failure".to_string(),
                        started_at: chrono::Utc::now().to_rfc3339(),
                        completed_at: Some(chrono::Utc::now().to_rfc3339()),
                        screenshots: Vec::new(),
                        http_failures: Vec::new(),
                        log: vec![LogEntry {
                            level: "error".to_string(),
                            message: message.clone(),
                            timestamp: chrono::Utc::now().to_rfc3339(),
                        }],
                        error: Some(message),
                    };
                    let _ = save_run(app_handle.clone(), test_id.clone(), fallback_run);
                }

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
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let app_handle = app.handle().clone();

                if let Some(state) = load_window_state_from_disk(&app_handle) {
                    let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize::new(
                        state.width,
                        state.height,
                    )));

                    let apply_saved_position = window
                        .available_monitors()
                        .map(|monitors| {
                            monitors.is_empty()
                                || monitors
                                    .iter()
                                    .any(|m| is_window_state_visible_on_monitor(&state, m))
                        })
                        .unwrap_or(true);

                    if apply_saved_position {
                        let _ = window.set_position(tauri::Position::Physical(
                            tauri::PhysicalPosition::new(state.x, state.y),
                        ));
                    } else {
                        let _ = window.center();
                    }
                } else if let (Ok(size), Ok(position)) = (window.inner_size(), window.outer_position()) {
                    let _ = save_window_state_to_disk(
                        &app_handle,
                        &WindowState {
                            width: size.width,
                            height: size.height,
                            x: position.x,
                            y: position.y,
                        },
                    );
                }

                let window_for_events = window.clone();
                window.on_window_event(move |event| {
                    match event {
                        tauri::WindowEvent::Resized(size) => {
                            if let Ok(position) = window_for_events.outer_position() {
                                let _ = save_window_state_to_disk(
                                    &app_handle,
                                    &WindowState {
                                        width: size.width,
                                        height: size.height,
                                        x: position.x,
                                        y: position.y,
                                    },
                                );
                            }
                        }
                        tauri::WindowEvent::Moved(position) => {
                            if let Ok(size) = window_for_events.inner_size() {
                                let _ = save_window_state_to_disk(
                                    &app_handle,
                                    &WindowState {
                                        width: size.width,
                                        height: size.height,
                                        x: position.x,
                                        y: position.y,
                                    },
                                );
                            }
                        }
                        _ => {}
                    }
                });
            }

            Ok(())
        })
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
            get_window_state,
            save_window_state,
            clear_window_state,
            get_collections,
            save_collections,
            get_global_variables,
            save_global_variables,
            copy_runner_to_app_dir,
            run_test,
            get_installed_browsers,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
