//! Core PDF engine operations for InkVault CLI & MCP server.
//!
//! Enforces the "Never panic, never lose work" standard with atomic file writes,
//! defensive input validation, and typed error propagation.

#![deny(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::panic,
    clippy::unimplemented,
    clippy::todo,
    clippy::unreachable
)]

use std::fs;
use std::path::Path;
use std::sync::Arc;
use serde::{Deserialize, Serialize};

use inkvault_cos::{Document, SaveOptions, write_full};
use inkvault_organize::{combine, extract_pages, SplitBy, split};
use inkvault_optimize::{optimize, Settings, ImageSettings, Compression};
use inkvault_crypt::{Algorithm, NewEncryption};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DocInfo {
    pub path: String,
    pub page_count: usize,
    pub version: String,
    pub file_size_bytes: u64,
    pub is_encrypted: bool,
    pub title: Option<String>,
    pub author: Option<String>,
    pub subject: Option<String>,
    pub keywords: Option<String>,
    pub creator: Option<String>,
    pub producer: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OptimizationStats {
    pub original_size_bytes: u64,
    pub optimized_size_bytes: u64,
    pub saved_bytes: u64,
    pub reduction_percent: f64,
}

/// Atomically write bytes to destination path to avoid half-written corruptions.
pub fn atomic_write(dest_path: &str, data: &[u8]) -> Result<(), String> {
    let dest = Path::new(dest_path);
    if let Some(parent) = dest.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory '{}': {}", parent.display(), e))?;
        }
    }

    let temp_name = format!(
        ".{}.tmp.{}",
        dest.file_name().and_then(|n| n.to_str()).unwrap_or("inkvault_out"),
        std::process::id()
    );
    let temp_path = dest.parent().unwrap_or_else(|| Path::new(".")).join(temp_name);

    fs::write(&temp_path, data)
        .map_err(|e| format!("Failed to write temporary buffer '{}': {}", temp_path.display(), e))?;

    if let Err(e) = fs::rename(&temp_path, dest) {
        // Fallback in case moving across filesystems
        if let Err(copy_err) = fs::copy(&temp_path, dest) {
            let _ = fs::remove_file(&temp_path);
            return Err(format!("Failed to commit file to '{}': {} (rename: {})", dest.display(), copy_err, e));
        }
        let _ = fs::remove_file(&temp_path);
    }

    Ok(())
}

/// Helper to generate ISO 32000 compliant PDF date string (e.g. D:20261009120000Z).
pub fn current_pdf_date() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    let secs_day = 86400;
    let days = now / secs_day;
    let rem_secs = now % secs_day;
    let hours = rem_secs / 3600;
    let mins = (rem_secs % 3600) / 60;
    let secs = rem_secs % 60;

    let mut year = 1970;
    let mut days_left = days;
    loop {
        let is_leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
        let days_in_year = if is_leap { 366 } else { 365 };
        if days_left < days_in_year {
            break;
        }
        days_left -= days_in_year;
        year += 1;
    }
    let is_leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    let month_days = [31, if is_leap { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut month = 1;
    for &md in &month_days {
        if days_left < md {
            break;
        }
        days_left -= md;
        month += 1;
    }
    let day = days_left + 1;
    format!("D:{:04}{:02}{:02}{:02}{:02}{:02}Z", year, month, day, hours, mins, secs)
}

/// Retrieve structured metadata and security information for a PDF file.
pub fn get_doc_info(path: &str) -> Result<DocInfo, String> {
    let file_bytes = fs::read(path).map_err(|e| format!("Failed to read file '{}': {}", path, e))?;
    let file_size_bytes = file_bytes.len() as u64;

    let doc = Document::open(Arc::new(file_bytes))
        .map_err(|e| format!("Failed to parse PDF '{}': {:?}", path, e))?;

    let page_count = inkvault_model::pages(&doc).len();
    let version = doc.version().to_string();
    let is_encrypted = doc.security().is_some();

    let title = inkvault_organize::info(&doc, "Title");
    let author = inkvault_organize::info(&doc, "Author");
    let subject = inkvault_organize::info(&doc, "Subject");
    let keywords = inkvault_organize::info(&doc, "Keywords");
    let creator = inkvault_organize::info(&doc, "Creator");
    let producer = inkvault_organize::info(&doc, "Producer");

    Ok(DocInfo {
        path: path.to_string(),
        page_count,
        version,
        file_size_bytes,
        is_encrypted,
        title,
        author,
        subject,
        keywords,
        creator,
        producer,
    })
}

/// Combine multiple PDF files into one ordered output PDF document.
pub fn combine_pdfs(inputs: &[String], output_path: &str) -> Result<usize, String> {
    if inputs.is_empty() {
        return Err("No input PDF files provided for combine".to_string());
    }

    let mut docs = Vec::with_capacity(inputs.len());
    for path in inputs {
        let bytes = fs::read(path)
            .map_err(|e| format!("Failed to read file '{}': {}", path, e))?;
        let doc = Document::open(Arc::new(bytes))
            .map_err(|e| format!("Failed to parse PDF '{}': {:?}", path, e))?;
        docs.push(doc);
    }

    let sources: Vec<(&str, &Document)> = inputs
        .iter()
        .zip(docs.iter())
        .map(|(p, d)| (p.as_str(), d))
        .collect();

    let merged_doc = combine(&sources)
        .map_err(|e| format!("Native combine operation failed: {:?}", e))?;

    let total_pages = inkvault_model::pages(&merged_doc).len();

    let output_bytes = write_full(&merged_doc, &SaveOptions::default())
        .map_err(|e| format!("Failed to serialize combined PDF: {:?}", e))?;

    atomic_write(output_path, &output_bytes)?;

    Ok(total_pages)
}

/// Parse human-readable 1-indexed page ranges (e.g., "1-3, 5, 8-10") into 0-indexed page indices.
pub fn parse_page_ranges(range_str: &str, total_pages: usize) -> Result<Vec<usize>, String> {
    let mut indices = Vec::new();
    let parts = range_str.split(',');

    for part in parts {
        let trimmed = part.trim();
        if trimmed.is_empty() {
            continue;
        }

        if let Some((start_str, end_str)) = trimmed.split_once('-') {
            let start: usize = start_str.trim().parse()
                .map_err(|_| format!("Invalid start page number '{}'", start_str))?;
            let end: usize = end_str.trim().parse()
                .map_err(|_| format!("Invalid end page number '{}'", end_str))?;

            if start == 0 || end == 0 {
                return Err("Page numbers must be 1-indexed (greater than 0)".to_string());
            }
            if start > end {
                return Err(format!("Invalid range '{}-{}': start cannot be greater than end", start, end));
            }

            for p in start..=end {
                if p > total_pages {
                    return Err(format!("Page {} exceeds document length of {} pages", p, total_pages));
                }
                indices.push(p - 1);
            }
        } else {
            let p: usize = trimmed.parse()
                .map_err(|_| format!("Invalid page number '{}'", trimmed))?;
            if p == 0 {
                return Err("Page numbers must be 1-indexed (greater than 0)".to_string());
            }
            if p > total_pages {
                return Err(format!("Page {} exceeds document length of {} pages", p, total_pages));
            }
            indices.push(p - 1);
        }
    }

    if indices.is_empty() {
        return Err("No valid pages specified".to_string());
    }

    Ok(indices)
}

/// Extract specific pages from a document and write to a new PDF.
pub fn extract_pages_cmd(input_path: &str, output_path: &str, page_spec: &str) -> Result<usize, String> {
    let bytes = fs::read(input_path)
        .map_err(|e| format!("Failed to read file '{}': {}", input_path, e))?;
    let doc = Document::open(Arc::new(bytes))
        .map_err(|e| format!("Failed to parse PDF '{}': {:?}", input_path, e))?;

    let total_pages = inkvault_model::pages(&doc).len();
    let indices = parse_page_ranges(page_spec, total_pages)?;

    let extracted = extract_pages(&doc, &indices)
        .map_err(|e| format!("Failed to extract pages: {:?}", e))?;

    let out_bytes = write_full(&extracted, &SaveOptions::default())
        .map_err(|e| format!("Failed to serialize extracted PDF: {:?}", e))?;

    atomic_write(output_path, &out_bytes)?;

    Ok(indices.len())
}

/// Split document into parts saved in an output directory.
pub fn split_pdf_cmd(input_path: &str, output_dir: &str, every: usize) -> Result<Vec<String>, String> {
    let bytes = fs::read(input_path)
        .map_err(|e| format!("Failed to read file '{}': {}", input_path, e))?;
    let doc = Document::open(Arc::new(bytes))
        .map_err(|e| format!("Failed to parse PDF '{}': {:?}", input_path, e))?;

    let n = every.max(1);
    let split_docs = split(&doc, &SplitBy::PageCount(n))
        .map_err(|e| format!("Failed to split document: {:?}", e))?;

    let out_dir_path = Path::new(output_dir);
    if !out_dir_path.exists() {
        fs::create_dir_all(out_dir_path)
            .map_err(|e| format!("Failed to create output directory '{}': {}", output_dir, e))?;
    }

    let file_stem = Path::new(input_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("document");

    let mut generated = Vec::with_capacity(split_docs.len());
    for (i, part_doc) in split_docs.iter().enumerate() {
        let part_filename = format!("{}_part_{:03}.pdf", file_stem, i + 1);
        let part_path = out_dir_path.join(part_filename);
        let part_path_str = part_path.to_string_lossy().to_string();

        let part_bytes = write_full(part_doc, &SaveOptions::default())
            .map_err(|e| format!("Failed to serialize part {}: {:?}", i + 1, e))?;

        atomic_write(&part_path_str, &part_bytes)?;
        generated.push(part_path_str);
    }

    Ok(generated)
}

/// Apply real Standard Security AES-256 encryption.
pub fn protect_pdf(
    input_path: &str,
    output_path: &str,
    user_password: Option<&str>,
    owner_password: Option<&str>,
    allow_print: bool,
    allow_copy: bool,
) -> Result<(), String> {
    let bytes = fs::read(input_path)
        .map_err(|e| format!("Failed to read file '{}': {}", input_path, e))?;
    let mut doc = Document::open(Arc::new(bytes))
        .map_err(|e| format!("Failed to parse PDF '{}': {:?}", input_path, e))?;

    let user_pw = user_password.unwrap_or_default();
    let default_owner = if user_pw.is_empty() {
        "ArcadeLabsAdmin".to_string()
    } else {
        format!("{}_owner", user_pw)
    };
    let owner_pw = owner_password.unwrap_or(&default_owner);

    let mut perms: i32 = -4; // Default full
    if !allow_print {
        perms &= !(1 << 2);
    }
    if !allow_copy {
        perms &= !(1 << 4);
    }

    let mut seed = [0u8; 32];
    for (i, b) in seed.iter_mut().enumerate() {
        *b = ((i * 37 + 101) % 256) as u8;
    }

    let params = NewEncryption {
        algorithm: Algorithm::Aes256,
        user_password: user_pw,
        owner_password: owner_pw,
        permissions: perms,
        encrypt_metadata: true,
        seed,
    };

    doc.set_encryption(&params)
        .map_err(|e| format!("Failed to set AES-256 encryption: {:?}", e))?;

    let out_bytes = write_full(&doc, &SaveOptions::default())
        .map_err(|e| format!("Failed to serialize protected PDF: {:?}", e))?;

    atomic_write(output_path, &out_bytes)?;

    Ok(())
}

/// Optimize and compress PDF using image downsampling, JPEG recompression, and unencoded stream cleanup.
pub fn optimize_pdf(input_path: &str, output_path: &str, preset: &str) -> Result<OptimizationStats, String> {
    let bytes = fs::read(input_path)
        .map_err(|e| format!("Failed to read file '{}': {}", input_path, e))?;
    let original_size = bytes.len() as u64;

    let mut doc = Document::open(Arc::new(bytes))
        .map_err(|e| format!("Failed to parse PDF '{}': {:?}", input_path, e))?;

    let mut settings = Settings::default();
    match preset {
        "extreme" => {
            settings.color = ImageSettings {
                downsample: true,
                target_ppi: 96.0,
                above_ppi: 144.0,
                compression: Compression::Jpeg(40),
            };
            settings.gray = ImageSettings {
                downsample: true,
                target_ppi: 96.0,
                above_ppi: 144.0,
                compression: Compression::Jpeg(40),
            };
            settings.discard_thumbnails = true;
            settings.discard_alternate_images = true;
            settings.flate_unencoded = true;
        }
        "balanced" => {
            settings.color = ImageSettings {
                downsample: true,
                target_ppi: 150.0,
                above_ppi: 225.0,
                compression: Compression::Jpeg(65),
            };
            settings.gray = ImageSettings {
                downsample: true,
                target_ppi: 150.0,
                above_ppi: 225.0,
                compression: Compression::Jpeg(65),
            };
            settings.discard_thumbnails = true;
            settings.discard_alternate_images = true;
            settings.flate_unencoded = true;
        }
        _ => {
            // Lossless
            settings.color.downsample = false;
            settings.color.compression = Compression::Flate;
            settings.gray.downsample = false;
            settings.gray.compression = Compression::Flate;
            settings.discard_thumbnails = true;
            settings.flate_unencoded = true;
        }
    }

    optimize(&mut doc, &settings)
        .map_err(|e| format!("Failed to optimize PDF: {:?}", e))?;

    let out_bytes = write_full(&doc, &SaveOptions::default())
        .map_err(|e| format!("Failed to serialize optimized PDF: {:?}", e))?;
    let optimized_size = out_bytes.len() as u64;

    atomic_write(output_path, &out_bytes)?;

    let saved_bytes = original_size.saturating_sub(optimized_size);
    let reduction_percent = if original_size > 0 {
        (saved_bytes as f64 / original_size as f64) * 100.0
    } else {
        0.0
    };

    Ok(OptimizationStats {
        original_size_bytes: original_size,
        optimized_size_bytes: optimized_size,
        saved_bytes,
        reduction_percent,
    })
}

/// Sanitize document: strip metadata, private annotations, and javascript.
pub fn sanitize_pdf(input_path: &str, output_path: &str) -> Result<(), String> {
    let bytes = fs::read(input_path)
        .map_err(|e| format!("Failed to read file '{}': {}", input_path, e))?;
    let mut doc = Document::open(Arc::new(bytes))
        .map_err(|e| format!("Failed to parse PDF '{}': {:?}", input_path, e))?;

    inkvault_redact::sanitize::sanitize(&mut doc)
        .map_err(|e| format!("Failed to sanitize PDF: {:?}", e))?;

    let out_bytes = write_full(&doc, &SaveOptions::default())
        .map_err(|e| format!("Failed to serialize sanitized PDF: {:?}", e))?;

    atomic_write(output_path, &out_bytes)?;

    Ok(())
}

/// True stream redaction: removes glyphs, paths, and image pixels permanently within specified rectangular bounds.
pub fn redact_pdf(
    input_path: &str,
    output_path: &str,
    page_1_indexed: usize,
    rects: &[[f64; 4]],
    overlay_text: Option<&str>,
) -> Result<(), String> {
    if rects.is_empty() {
        return Err("No redaction areas specified".to_string());
    }

    let bytes = fs::read(input_path)
        .map_err(|e| format!("Failed to read file '{}': {}", input_path, e))?;
    let mut doc = Document::open(Arc::new(bytes))
        .map_err(|e| format!("Failed to parse PDF '{}': {:?}", input_path, e))?;

    let total_pages = inkvault_model::pages(&doc).len();
    if page_1_indexed == 0 || page_1_indexed > total_pages {
        return Err(format!("Page {} is out of bounds (document has {} pages)", page_1_indexed, total_pages));
    }
    let page = page_1_indexed - 1;

    let overlay = overlay_text.unwrap_or_default().to_string();
    for r in rects {
        let quad = inkvault_annot::rect_quad(*r);
        let new_annot = inkvault_annot::NewAnnotation {
            page,
            shape: inkvault_annot::Shape::Redact {
                quads: vec![quad],
                overlay: overlay.clone(),
                look: inkvault_annot::OverlayLook::default(),
            },
            style: inkvault_annot::Style {
                color: [0.0, 0.0, 0.0],
                opacity: 1.0,
                width: 1.0,
                fill: Some([0.0, 0.0, 0.0]),
            },
            contents: String::new(),
            author: "InkVault CLI".to_string(),
        };

        inkvault_annot::add_annotation(&mut doc, &new_annot, &inkvault_annot::Meta::default())
            .map_err(|e| format!("Failed to mark redaction area: {:?}", e))?;
    }

    inkvault_redact::apply(&mut doc, Some(&[page]))
        .map_err(|e| format!("Stream redaction failed: {:?}", e))?;

    let out_bytes = write_full(&doc, &SaveOptions::default())
        .map_err(|e| format!("Failed to serialize redacted PDF: {:?}", e))?;

    atomic_write(output_path, &out_bytes)?;

    Ok(())
}

/// Sign document adhering to PAdES B-B with PKCS #12 (.p12/.pfx) certificate.
pub fn sign_pdf(
    input_path: &str,
    output_path: &str,
    cert_path: &str,
    cert_password: &str,
    page_1_indexed: Option<usize>,
    rect: Option<[f64; 4]>,
    reason: Option<&str>,
    location: Option<&str>,
    contact: Option<&str>,
) -> Result<(), String> {
    let doc_bytes = fs::read(input_path)
        .map_err(|e| format!("Failed to read PDF file '{}': {}", input_path, e))?;
    let cert_bytes = fs::read(cert_path)
        .map_err(|e| format!("Failed to read certificate file '{}': {}", cert_path, e))?;

    let doc = Document::open(Arc::new(doc_bytes))
        .map_err(|e| format!("Failed to parse PDF '{}': {:?}", input_path, e))?;

    let digital_id = inkvault_sign::pkcs12::open(&cert_bytes, cert_password)
        .map_err(|e| format!("Failed to unlock PKCS #12 certificate: {:?}", e))?;

    let page = page_1_indexed.map(|p| p.saturating_sub(1)).unwrap_or(0);

    let opts = inkvault_sign::SignOptions {
        page,
        rect,
        reason: reason.map(|s| s.to_string()),
        location: location.map(|s| s.to_string()),
        contact: contact.map(|s| s.to_string()),
        date: current_pdf_date(),
        appearance: inkvault_sign::Appearance::default(),
        ..Default::default()
    };

    let signed_bytes = inkvault_sign::sign(&doc, &digital_id, &opts)
        .map_err(|e| format!("PAdES digital signing failed: {:?}", e))?;

    atomic_write(output_path, &signed_bytes)?;

    Ok(())
}
