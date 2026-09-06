use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Serialize, Deserialize, Clone)]
pub struct ScannedFile {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub bytes: Vec<u8>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct FolderScanResult {
    pub folder_name: String,
    pub folder_path: String,
    pub files: Vec<ScannedFile>,
}

fn collect_supported_files(root: &Path, dir: &Path, files: &mut Vec<ScannedFile>) {
    if let Ok(entries) = fs::read_dir(dir) {
        let mut entry_list: Vec<_> = entries.flatten().collect();
        entry_list.sort_by_key(|e| e.path());
        for entry in entry_list {
            let p = entry.path();
            if p.is_dir() {
                if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                    if !name.starts_with('.') {
                        collect_supported_files(root, &p, files);
                    }
                }
            } else if p.is_file() {
                if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
                    let ext_lower = ext.to_lowercase();
                    if ext_lower == "pdf"
                        || ext_lower == "epub"
                        || ext_lower == "cbz"
                        || ext_lower == "cbr"
                        || ext_lower == "cbn"
                    {
                        if let Ok(metadata) = fs::metadata(&p) {
                            let rel_path = p.strip_prefix(root).ok().and_then(|rp| rp.to_str());
                            let display_name = match rel_path {
                                Some(rp) if !rp.is_empty() => rp.to_string(),
                                _ => p
                                    .file_name()
                                    .and_then(|n| n.to_str())
                                    .unwrap_or("document.pdf")
                                    .to_string(),
                            };
                            let size = metadata.len();
                            files.push(ScannedFile {
                                name: display_name,
                                path: p.to_string_lossy().to_string(),
                                size,
                                bytes: Vec::new(),
                            });
                        }
                    }
                }
            }
        }
    }
}

#[tauri::command]
fn pick_study_folder() -> Result<Option<FolderScanResult>, String> {
    let mut chosen_path: Option<String> = None;

    // 1. On Linux, try zenity then kdialog
    #[cfg(target_os = "linux")]
    {
        let zenity_out = Command::new("zenity")
            .args([
                "--file-selection",
                "--directory",
                "--title=Select Study Subject Folder",
            ])
            .output();

        if let Ok(out) = zenity_out {
            if out.status.success() {
                let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !s.is_empty() {
                    chosen_path = Some(s);
                }
            }
        }

        if chosen_path.is_none() {
            let kdialog_out = Command::new("kdialog")
                .args(["--getexistingdirectory", "."])
                .output();
            if let Ok(out) = kdialog_out {
                if out.status.success() {
                    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    if !s.is_empty() {
                        chosen_path = Some(s);
                    }
                }
            }
        }
    }

    // 2. On macOS, try AppleScript
    #[cfg(target_os = "macos")]
    {
        let script = r#"POSIX path of (choose folder with prompt "Select Study Subject Folder")"#;
        let osascript_out = Command::new("osascript").args(["-e", script]).output();
        if let Ok(out) = osascript_out {
            if out.status.success() {
                let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !s.is_empty() {
                    chosen_path = Some(s);
                }
            }
        }
    }

    // 3. On Windows, try PowerShell FolderBrowserDialog
    #[cfg(target_os = "windows")]
    {
        let ps_cmd = r#"[System.Reflection.Assembly]::LoadWithPartialName('System.windows.forms') | Out-Null; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Select Study Subject Folder'; if ($f.ShowDialog() -eq 'OK') { Write-Output $f.SelectedPath }"#;
        let ps_out = Command::new("powershell")
            .args(["-NoProfile", "-Command", ps_cmd])
            .output();
        if let Ok(out) = ps_out {
            if out.status.success() {
                let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !s.is_empty() {
                    chosen_path = Some(s);
                }
            }
        }
    }

    let folder_str = match chosen_path {
        Some(p) => p,
        None => return Ok(None),
    };

    let path = Path::new(&folder_str);
    if !path.exists() || !path.is_dir() {
        return Ok(None);
    }

    let folder_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Study Subject")
        .to_string();

    let mut files = Vec::new();
    collect_supported_files(path, path, &mut files);

    Ok(Some(FolderScanResult {
        folder_name,
        folder_path: folder_str,
        files,
    }))
}

#[tauri::command]
fn scan_subject_folder(folder_path: String) -> Result<Option<FolderScanResult>, String> {
    let path = Path::new(&folder_path);
    if !path.exists() || !path.is_dir() {
        return Ok(None);
    }

    let folder_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Study Subject")
        .to_string();

    let mut files = Vec::new();
    collect_supported_files(path, path, &mut files);

    Ok(Some(FolderScanResult {
        folder_name,
        folder_path,
        files,
    }))
}

#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            pick_study_folder,
            scan_subject_folder,
            read_file_bytes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
