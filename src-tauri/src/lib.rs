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
fn pick_document_file() -> Result<Option<String>, String> {
    let mut chosen_path: Option<String> = None;

    // 1. On Linux, try zenity then kdialog
    #[cfg(target_os = "linux")]
    {
        let zenity_out = Command::new("zenity")
            .args([
                "--file-selection",
                "--title=Select Document",
                "--file-filter=Supported Documents (*.pdf *.epub *.cbz *.cbr *.cbn) | *.pdf *.epub *.cbz *.cbr *.cbn *.PDF *.EPUB *.CBZ *.CBR *.CBN",
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
                .args(["--getopenfilename", ".", "*.pdf *.epub *.cbz *.cbr *.cbn|Supported Documents"])
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
        let script = r#"POSIX path of (choose file of type {"pdf", "epub", "cbz", "cbr", "cbn"} with prompt "Select Document")"#;
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

    // 3. On Windows, try PowerShell OpenFileDialog
    #[cfg(target_os = "windows")]
    {
        let ps_cmd = r#"[System.Reflection.Assembly]::LoadWithPartialName('System.windows.forms') | Out-Null; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.Filter = 'Documents (*.pdf;*.epub;*.cbz;*.cbr;*.cbn)|*.pdf;*.epub;*.cbz;*.cbr;*.cbn|All Files (*.*)|*.*'; $f.Title = 'Select Document'; if ($f.ShowDialog() -eq 'OK') { Write-Output $f.FileName }"#;
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

    Ok(chosen_path)
}

#[tauri::command]
fn read_file_bytes(path: String) -> Result<Response, String> {
    fs::read(&path).map(Response::new).map_err(|e| e.to_string())
}

pub mod pdf_engine;
use pdf_engine::PDFInputPayload;
use tauri::ipc::Response;

#[tauri::command]
fn native_merge(items: Vec<PDFInputPayload>) -> Result<Response, String> {
    pdf_engine::native_merge_pdfs(items).map(Response::new)
}

#[tauri::command]
fn native_split(item: PDFInputPayload, page_indices: Vec<usize>) -> Result<Response, String> {
    pdf_engine::native_split_pdf(item, page_indices).map(Response::new)
}

#[tauri::command]
fn native_protect(
    item: PDFInputPayload,
    user_password: Option<String>,
    owner_password: Option<String>,
    allow_print: bool,
    allow_copy: bool,
) -> Result<Response, String> {
    pdf_engine::native_protect_pdf(item, user_password, owner_password, allow_print, allow_copy).map(Response::new)
}

#[tauri::command]
fn native_compress(item: PDFInputPayload, preset: String) -> Result<Response, String> {
    pdf_engine::native_compress_pdf(item, &preset).map(Response::new)
}

#[tauri::command]
fn native_sanitize(item: PDFInputPayload) -> Result<Response, String> {
    pdf_engine::native_sanitize_pdf(item).map(Response::new)
}

#[tauri::command]
fn native_sign(
    item: PDFInputPayload,
    cert_payload: PDFInputPayload,
    cert_password: String,
    page: usize,
    rect: Option<[f64; 4]>,
    reason: Option<String>,
    location: Option<String>,
    contact: Option<String>,
) -> Result<Response, String> {
    pdf_engine::native_sign_pdf(
        item,
        cert_payload,
        &cert_password,
        page,
        rect,
        reason,
        location,
        contact,
    ).map(Response::new)
}

#[tauri::command]
fn native_redact(
    item: PDFInputPayload,
    page: usize,
    rects: Vec<[f64; 4]>,
    overlay_text: Option<String>,
) -> Result<Response, String> {
    pdf_engine::native_redact_pdf(item, page, rects, overlay_text).map(Response::new)
}

#[tauri::command]
fn native_create_forms(
    item: PDFInputPayload,
    fields: Vec<pdf_engine::FormFieldPayload>,
) -> Result<Response, String> {
    pdf_engine::native_create_form_fields(item, fields).map(Response::new)
}

#[tauri::command]
fn native_watermark(
    item: PDFInputPayload,
    wm: pdf_engine::WatermarkPayload,
) -> Result<Response, String> {
    pdf_engine::native_watermark_pdf(item, wm).map(Response::new)
}

#[tauri::command]
fn native_header_footer(
    item: PDFInputPayload,
    payload: pdf_engine::HeaderFooterPayload,
) -> Result<Response, String> {
    pdf_engine::native_add_header_footer_pdf(item, payload).map(Response::new)
}

#[tauri::command]
fn native_organize(
    item: PDFInputPayload,
    actions: Vec<pdf_engine::PageOrganizeAction>,
) -> Result<Response, String> {
    pdf_engine::native_organize_pdf(item, actions).map(Response::new)
}

#[tauri::command]
fn native_flatten(
    item: PDFInputPayload,
    pages: Option<Vec<usize>>,
    flatten_annotations: bool,
    flatten_forms: bool,
    incremental: Option<bool>,
) -> Result<Response, String> {
    pdf_engine::native_flatten_pdf(item, pages, flatten_annotations, flatten_forms, incremental).map(Response::new)
}

#[tauri::command]
fn native_save_document(
    item: PDFInputPayload,
    incremental: bool,
) -> Result<Response, String> {
    pdf_engine::native_save_document_pdf(item, incremental).map(Response::new)
}

#[tauri::command]
fn native_detect_form_fields(
    item: PDFInputPayload,
    page: usize,
) -> Result<Vec<pdf_engine::FormFieldPayload>, String> {
    pdf_engine::native_detect_form_fields_pdf(item, page)
}

#[tauri::command]
fn native_recalculate_form(
    item: PDFInputPayload,
    incremental: Option<bool>,
) -> Result<Response, String> {
    pdf_engine::native_recalculate_form_pdf(item, incremental).map(Response::new)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(err) = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            pick_study_folder,
            scan_subject_folder,
            pick_document_file,
            read_file_bytes,
            native_merge,
            native_split,
            native_protect,
            native_compress,
            native_sanitize,
            native_sign,
            native_redact,
            native_create_forms,
            native_watermark,
            native_header_footer,
            native_organize,
            native_flatten,
            native_save_document,
            native_detect_form_fields,
            native_recalculate_form
        ])
        .run(tauri::generate_context!())
    {
        eprintln!("Error while running tauri application: {err}");
    }
}
