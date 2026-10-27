use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::Arc;

use inkvault_cos::{Document, SaveOptions, write_full, write_incremental};
use inkvault_organize::{combine, extract_pages};
use inkvault_optimize::{optimize, Settings, ImageSettings, Compression};
use inkvault_crypt::{Algorithm, NewEncryption};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PDFInputPayload {
    pub name: String,
    pub path: Option<String>,
    pub bytes: Option<Vec<u8>>,
}

impl PDFInputPayload {
    pub fn get_bytes(&self) -> Result<Vec<u8>, String> {
        if let Some(ref b) = self.bytes {
            if !b.is_empty() {
                return Ok(b.clone());
            }
        }
        if let Some(ref p) = self.path {
            return fs::read(p).map_err(|e| format!("Failed to read file '{}': {}", p, e));
        }
        Err(format!("No bytes or valid file path provided for '{}'", self.name))
    }
}

/// Combine multiple PDF files into one bound document
pub fn native_merge_pdfs(items: Vec<PDFInputPayload>) -> Result<Vec<u8>, String> {
    if items.is_empty() {
        return Err("No PDF files provided for merging".to_string());
    }

    let mut docs = Vec::new();
    for item in &items {
        let bytes = item.get_bytes()?;
        let doc = Document::open(Arc::new(bytes))
            .map_err(|e| format!("Failed to parse PDF '{}': {:?}", item.name, e))?;
        docs.push(doc);
    }

    let sources: Vec<(&str, &Document)> = items
        .iter()
        .zip(docs.iter())
        .map(|(item, doc)| (item.name.as_str(), doc))
        .collect();

    let merged_doc = combine(&sources)
        .map_err(|e| format!("Native merge failed: {:?}", e))?;

    let output_bytes = write_full(&merged_doc, &SaveOptions::default())
        .map_err(|e| format!("Failed to serialize merged PDF: {:?}", e))?;

    Ok(output_bytes)
}

/// Extract chosen pages from a document (0-indexed page numbers)
pub fn native_split_pdf(item: PDFInputPayload, page_indices: Vec<usize>) -> Result<Vec<u8>, String> {
    let bytes = item.get_bytes()?;
    let doc = Document::open(Arc::new(bytes))
        .map_err(|e| format!("Failed to parse PDF: {:?}", e))?;

    let extracted_doc = extract_pages(&doc, &page_indices)
        .map_err(|e| format!("Failed to extract pages: {:?}", e))?;

    let output_bytes = write_full(&extracted_doc, &SaveOptions::default())
        .map_err(|e| format!("Failed to serialize split PDF: {:?}", e))?;

    Ok(output_bytes)
}

/// Apply real Standard Security AES-256 encryption with user/owner passwords and permission bitmasks
pub fn native_protect_pdf(
    item: PDFInputPayload,
    user_password: Option<String>,
    owner_password: Option<String>,
    allow_print: bool,
    allow_copy: bool,
) -> Result<Vec<u8>, String> {
    let bytes = item.get_bytes()?;
    let mut doc = Document::open(Arc::new(bytes))
        .map_err(|e| format!("Failed to parse PDF: {:?}", e))?;

    let user_pw = user_password.unwrap_or_default();
    let owner_pw = owner_password.unwrap_or_else(|| {
        if user_pw.is_empty() {
            "ArcadeLabsAdmin".to_string()
        } else {
            format!("{}_owner", user_pw)
        }
    });

    let mut perms: i32 = -4; // Default full
    if !allow_print {
        perms &= !(1 << 2);
    }
    if !allow_copy {
        perms &= !(1 << 4);
    }

    let mut seed = [0u8; 32];
    getrandom::fill(&mut seed)
        .map_err(|e| format!("Failed to generate secure cryptographic seed: {e}"))?;

    let params = NewEncryption {
        algorithm: Algorithm::Aes256,
        user_password: &user_pw,
        owner_password: &owner_pw,
        permissions: perms,
        encrypt_metadata: true,
        seed,
    };

    doc.set_encryption(&params)
        .map_err(|e| format!("Failed to apply AES-256 encryption: {:?}", e))?;

    let output_bytes = write_full(&doc, &SaveOptions::default())
        .map_err(|e| format!("Failed to serialize protected PDF: {:?}", e))?;

    Ok(output_bytes)
}

/// Compress PDF using real bicubic downsampling, JPEG/Flate stream recompression, and object stream compaction
pub fn native_compress_pdf(item: PDFInputPayload, preset: &str) -> Result<Vec<u8>, String> {
    let bytes = item.get_bytes()?;
    let mut doc = Document::open(Arc::new(bytes))
        .map_err(|e| format!("Failed to parse PDF: {:?}", e))?;

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
            // Lossless: no downsampling, just stream recompression and unencoded Flate cleanup
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

    let output_bytes = write_full(&doc, &SaveOptions::default())
        .map_err(|e| format!("Failed to serialize compressed PDF: {:?}", e))?;

    Ok(output_bytes)
}

/// Sanitize document: strips hidden metadata, private annotations, and javascript
pub fn native_sanitize_pdf(item: PDFInputPayload) -> Result<Vec<u8>, String> {
    let bytes = item.get_bytes()?;
    let mut doc = Document::open(Arc::new(bytes))
        .map_err(|e| format!("Failed to parse PDF: {:?}", e))?;

    inkvault_redact::sanitize::sanitize(&mut doc)
        .map_err(|e| format!("Failed to sanitize PDF: {:?}", e))?;

    let output_bytes = write_full(&doc, &SaveOptions::default())
        .map_err(|e| format!("Failed to serialize sanitized PDF: {:?}", e))?;

    Ok(output_bytes)
}

fn current_date_tuple() -> (i64, u32, u32) {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    let secs_day = 86400;
    let mut days_left = now / secs_day;

    let mut year = 1970;
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
    (year, month as u32, day as u32)
}

fn current_pdf_date() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    let secs_day = 86400;
    let rem_secs = now % secs_day;
    let hours = rem_secs / 3600;
    let mins = (rem_secs % 3600) / 60;
    let secs = rem_secs % 60;

    let (year, month, day) = current_date_tuple();
    format!("D:{:04}{:02}{:02}{:02}{:02}{:02}Z", year, month, day, hours, mins, secs)
}

/// PAdES B-B digital signing with PKCS #12 (.p12/.pfx) certificate and optional visual signature appearance
pub fn native_sign_pdf(
    item: PDFInputPayload,
    cert_payload: PDFInputPayload,
    cert_password: &str,
    page: usize,
    rect: Option<[f64; 4]>,
    reason: Option<String>,
    location: Option<String>,
    contact: Option<String>,
) -> Result<Vec<u8>, String> {
    let doc_bytes = item.get_bytes()?;
    let cert_bytes = cert_payload.get_bytes()?;
    let doc = Document::open(Arc::new(doc_bytes))
        .map_err(|e| format!("Failed to parse PDF: {:?}", e))?;

    let digital_id = inkvault_sign::pkcs12::open(&cert_bytes, cert_password)
        .map_err(|e| format!("Failed to unlock PKCS #12 certificate: {:?}", e))?;

    let opts = inkvault_sign::SignOptions {
        page,
        rect,
        reason,
        location,
        contact,
        date: current_pdf_date(),
        appearance: inkvault_sign::Appearance::default(),
        ..Default::default()
    };

    let signed_bytes = inkvault_sign::sign(&doc, &digital_id, &opts)
        .map_err(|e| format!("PAdES digital signing failed: {:?}", e))?;

    Ok(signed_bytes)
}

/// True stream redaction: permanently strips glyphs, vector paths, and pixel data from streams
pub fn native_redact_pdf(
    item: PDFInputPayload,
    page: usize,
    rects: Vec<[f64; 4]>,
    overlay_text: Option<String>,
) -> Result<Vec<u8>, String> {
    if rects.is_empty() {
        return Err("No redaction areas specified".to_string());
    }

    let bytes = item.get_bytes()?;
    let mut doc = Document::open(Arc::new(bytes))
        .map_err(|e| format!("Failed to parse PDF: {:?}", e))?;

    let overlay = overlay_text.unwrap_or_default();
    for r in &rects {
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
            author: "InkVault".to_string(),
        };

        inkvault_annot::add_annotation(&mut doc, &new_annot, &inkvault_annot::Meta::default())
            .map_err(|e| format!("Failed to mark redaction area: {:?}", e))?;
    }

    // Apply true stream redaction: removes glyphs, paths, and image pixels permanently
    inkvault_redact::apply(&mut doc, Some(&[page]))
        .map_err(|e| format!("Stream redaction failed: {:?}", e))?;

    let output_bytes = write_full(&doc, &SaveOptions::default())
        .map_err(|e| format!("Failed to serialize redacted PDF: {:?}", e))?;

    Ok(output_bytes)
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FormFieldPayload {
    pub page: usize,
    pub rect: [f64; 4],
    pub kind: String,
    pub name: Option<String>,
    pub options: Option<Vec<String>>,
    pub default_value: Option<String>,
}

/// AcroForm interactive form authoring: text fields, checkboxes, dropdowns, dates, and buttons
pub fn native_create_form_fields(
    item: PDFInputPayload,
    fields: Vec<FormFieldPayload>,
) -> Result<Vec<u8>, String> {
    if fields.is_empty() {
        return Err("No form fields specified".to_string());
    }

    let bytes = item.get_bytes()?;
    let mut doc = Document::open(Arc::new(bytes))
        .map_err(|e| format!("Failed to parse PDF: {:?}", e))?;

    for field in &fields {
        let new_field = match field.kind.as_str() {
            "multiline" => inkvault_forms::NewField::Text { multiline: true },
            "checkbox" => inkvault_forms::NewField::CheckBox,
            "dropdown" | "combo" => inkvault_forms::NewField::Combo {
                options: field.options.clone().unwrap_or_default(),
                editable: false,
            },
            "radio" => inkvault_forms::NewField::Radio {
                group: field.name.clone(),
                export: "Choice1".to_string(),
            },
            "date" => inkvault_forms::NewField::Date,
            "button" => inkvault_forms::NewField::Button {
                caption: field.name.clone().unwrap_or_else(|| "Button".to_string()),
            },
            _ => inkvault_forms::NewField::Text { multiline: false },
        };

        inkvault_forms::add_field(
            &mut doc,
            field.page,
            field.rect,
            &new_field,
            field.name.as_deref(),
        ).map_err(|e| format!("Failed to create form field '{:?}': {:?}", field.name, e))?;
    }

    let output_bytes = write_full(&doc, &SaveOptions::default())
        .map_err(|e| format!("Failed to serialize form PDF: {:?}", e))?;

    Ok(output_bytes)
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WatermarkPayload {
    pub text: String,
    pub pages: Option<Vec<usize>>, // None = all pages (0-indexed)
    pub font_size: Option<f64>,    // 0.0 or None = auto fit
    pub color_rgb: Option<[f64; 3]>, // [r, g, b] 0.0..1.0
    pub opacity: Option<f64>,      // 0.0..1.0
    pub rotation: Option<f64>,     // degrees (e.g. 45.0, -45.0)
    pub behind: Option<bool>,
    pub offset: Option<[f64; 2]>,
}

/// Native watermarking: applies standard marked-content artifact watermarks with precision graphics state
pub fn native_watermark_pdf(
    item: PDFInputPayload,
    wm: WatermarkPayload,
) -> Result<Vec<u8>, String> {
    let bytes = item.get_bytes()?;
    let mut doc = Document::open(Arc::new(bytes))
        .map_err(|e| format!("Failed to parse PDF: {:?}", e))?;

    let total_pages = inkvault_organize::page_count(&doc)
        .map_err(|e| format!("Failed to count pages: {:?}", e))?;

    let pages: Vec<usize> = wm.pages.unwrap_or_else(|| (0..total_pages).collect());
    if pages.is_empty() {
        return Err("No pages selected for watermarking".to_string());
    }

    let native_wm = inkvault_edit::Watermark {
        text: wm.text,
        source: None,
        scale: 0.5,
        font_size: wm.font_size.unwrap_or(0.0),
        color: wm.color_rgb.unwrap_or([0.88, 0.11, 0.28]),
        opacity: wm.opacity.unwrap_or(0.25).clamp(0.01, 1.0),
        rotation: wm.rotation.unwrap_or(45.0),
        behind: wm.behind.unwrap_or(false),
        offset: wm.offset.unwrap_or([0.0, 0.0]),
    };

    inkvault_edit::add_watermark(&mut doc, &pages, &native_wm, true)
        .map_err(|e| format!("Failed to apply native watermark: {:?}", e))?;

    let output_bytes = write_full(&doc, &SaveOptions::default())
        .map_err(|e| format!("Failed to serialize watermarked PDF: {:?}", e))?;

    Ok(output_bytes)
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HeaderFooterPayload {
    /// 6 slots: [header_left, header_center, header_right, footer_left, footer_center, footer_right]
    pub text: [String; 6],
    pub pages: Option<Vec<usize>>, // None = all pages (0-indexed)
    pub font_size: Option<f64>,    // default 8.0
    pub color_rgb: Option<[f64; 3]>, // [r, g, b] 0.0..1.0
    pub underline: Option<bool>,
    /// Margins in points: [top, bottom, left, right], default [36.0, 36.0, 72.0, 72.0]
    pub margins: Option<[f64; 4]>,
    pub start_number: Option<u32>, // default 1
    pub shrink: Option<bool>,      // default false
    pub replace: Option<bool>,     // default true
}

/// Native Header & Footer and Legal Bates Numbering with token expansion and margin control
pub fn native_add_header_footer_pdf(
    item: PDFInputPayload,
    payload: HeaderFooterPayload,
) -> Result<Vec<u8>, String> {
    let bytes = item.get_bytes()?;
    let mut doc = Document::open(Arc::new(bytes))
        .map_err(|e| format!("Failed to parse PDF: {:?}", e))?;

    let total_pages = inkvault_organize::page_count(&doc)
        .map_err(|e| format!("Failed to count pages: {:?}", e))?;

    let pages: Vec<usize> = payload.pages.unwrap_or_else(|| (0..total_pages).collect());
    if pages.is_empty() {
        return Err("No pages selected for header/footer".to_string());
    }

    let native_hf = inkvault_edit::HeaderFooter {
        text: payload.text,
        font_size: payload.font_size.unwrap_or(8.0).clamp(1.0, 200.0),
        color: payload.color_rgb.unwrap_or([0.0, 0.0, 0.0]),
        underline: payload.underline.unwrap_or(false),
        margins: payload.margins.unwrap_or([36.0, 36.0, 72.0, 72.0]),
        start_number: payload.start_number.unwrap_or(1),
        shrink: payload.shrink.unwrap_or(false),
    };

    let cx = inkvault_edit::Context {
        date: current_date_tuple(),
    };

    let replace = payload.replace.unwrap_or(true);

    inkvault_edit::add_header_footer(&mut doc, &pages, &native_hf, replace, &cx)
        .map_err(|e| format!("Failed to apply native header/footer: {:?}", e))?;

    let output_bytes = write_full(&doc, &SaveOptions::default())
        .map_err(|e| format!("Failed to serialize PDF with headers/footers: {:?}", e))?;

    Ok(output_bytes)
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PageOrganizeAction {
    pub page_index: usize, // 0-indexed original page
    pub rotation_delta: Option<i64>, // e.g. 90, 180, 270
}

/// Native page organization: reorders, rotates, and deletes pages atomically
pub fn native_organize_pdf(
    item: PDFInputPayload,
    new_page_order: Vec<PageOrganizeAction>,
) -> Result<Vec<u8>, String> {
    if new_page_order.is_empty() {
        return Err("A document must keep at least one page".to_string());
    }

    let bytes = item.get_bytes()?;
    let doc = Document::open(Arc::new(bytes))
        .map_err(|e| format!("Failed to parse PDF: {:?}", e))?;

    let indices: Vec<usize> = new_page_order.iter().map(|a| a.page_index).collect();

    // 1. Reorder / extract keeping only the selected pages in the new sequence
    let mut organized_doc = inkvault_organize::extract_pages(&doc, &indices)
        .map_err(|e| format!("Failed to organize pages: {:?}", e))?;

    // 2. Apply any per-page rotation deltas
    for (new_idx, action) in new_page_order.iter().enumerate() {
        if let Some(deg) = action.rotation_delta {
            if deg != 0 {
                inkvault_organize::rotate_pages(&mut organized_doc, &[new_idx], deg)
                    .map_err(|e| format!("Failed to rotate page {}: {:?}", new_idx + 1, e))?;
            }
        }
    }

    let output_bytes = write_full(&organized_doc, &SaveOptions::default())
        .map_err(|e| format!("Failed to serialize organized PDF: {:?}", e))?;

    Ok(output_bytes)
}

/// Helper to serialize document either incrementally (append-only fearless persistence) or full rewrite
pub fn save_document(doc: &Document, incremental: bool) -> Result<Vec<u8>, String> {
    if incremental {
        write_incremental(doc, &SaveOptions::default())
            .map_err(|e| format!("Incremental serialization failed: {:?}", e))
    } else {
        write_full(doc, &SaveOptions::default())
            .map_err(|e| format!("Serialization failed: {:?}", e))
    }
}

/// Explicit incremental or full document save
pub fn native_save_document_pdf(item: PDFInputPayload, incremental: bool) -> Result<Vec<u8>, String> {
    let bytes = item.get_bytes()?;
    let doc = Document::open(Arc::new(bytes))
        .map_err(|e| format!("Failed to parse PDF: {:?}", e))?;
    save_document(&doc, incremental)
}

/// Document Flattening: Bake interactive form fields and annotations into static PDF content streams
pub fn native_flatten_pdf(
    item: PDFInputPayload,
    pages: Option<Vec<usize>>,
    flatten_annotations: bool,
    flatten_forms: bool,
    incremental: Option<bool>,
) -> Result<Vec<u8>, String> {
    let bytes = item.get_bytes()?;
    let mut doc = Document::open(Arc::new(bytes))
        .map_err(|e| format!("Failed to parse PDF: {:?}", e))?;

    let total_pages = inkvault_organize::page_count(&doc)
        .map_err(|e| format!("Failed to count pages: {:?}", e))?;

    let pages_to_flatten: Vec<usize> = pages.unwrap_or_else(|| (0..total_pages).collect());
    if pages_to_flatten.is_empty() {
        return Err("No pages selected for flattening".to_string());
    }

    inkvault_edit::flatten(&mut doc, &pages_to_flatten, flatten_annotations, flatten_forms)
        .map_err(|e| format!("Document flattening failed: {:?}", e))?;

    save_document(&doc, incremental.unwrap_or(false))
}

/// Form Auto-Detection: Discover form fields, checkboxes, rules, and blanks from page contents and vector shapes
pub fn native_detect_form_fields_pdf(
    item: PDFInputPayload,
    page: usize,
) -> Result<Vec<FormFieldPayload>, String> {
    let bytes = item.get_bytes()?;
    let doc = Document::open(Arc::new(bytes))
        .map_err(|e| format!("Failed to parse PDF: {:?}", e))?;

    let total_pages = inkvault_organize::page_count(&doc)
        .map_err(|e| format!("Failed to count pages: {:?}", e))?;

    if page >= total_pages {
        return Err(format!("Page {} is out of range (total pages: {})", page + 1, total_pages));
    }

    // 1. Existing widgets and taken names
    let all_fields = inkvault_forms::fields(&doc);
    let mut existing_rects = Vec::new();
    let mut taken_names = Vec::new();
    for f in &all_fields {
        taken_names.push(f.name.clone());
        for w in &f.widgets {
            if w.page == Some(page) {
                existing_rects.push(w.rect);
            }
        }
    }

    // 2. Vector shapes (boxes and horizontal rules)
    let shapes = inkvault_forms::detect::page_shapes(&doc, page);

    // 3. Text lines mapped into words with bounding rects
    let lines = inkvault_edit::text_lines(&doc, page).unwrap_or_default();
    let mut words = Vec::new();
    for line in &lines {
        let parts: Vec<&str> = line.text.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }
        let total_chars: usize = parts.iter().map(|w| w.len()).sum();
        let total_w = (line.rect[2] - line.rect[0]).max(1.0);
        let mut cur_x = line.rect[0];
        for p in parts {
            let part_w = (p.len() as f64 / total_chars.max(1) as f64) * total_w * 0.9;
            words.push(inkvault_forms::detect::Word {
                text: p.to_string(),
                rect: [cur_x, line.rect[1], cur_x + part_w, line.rect[3]],
            });
            cur_x += part_w + 3.0;
        }
    }

    // 4. Run detection heuristics
    let candidates = inkvault_forms::detect::detect(&words, &shapes, &existing_rects, &taken_names);

    let payloads = candidates
        .into_iter()
        .map(|c| FormFieldPayload {
            page,
            rect: c.rect,
            kind: match c.kind {
                inkvault_forms::detect::Kind::CheckBox => "checkbox".to_string(),
                inkvault_forms::detect::Kind::Text => "text".to_string(),
            },
            name: Some(c.name),
            options: None,
            default_value: None,
        })
        .collect();

    Ok(payloads)
}

/// Form Recalculation: Evaluate all calculation scripts and update dependent field values
pub fn native_recalculate_form_pdf(
    item: PDFInputPayload,
    incremental: Option<bool>,
) -> Result<Vec<u8>, String> {
    let bytes = item.get_bytes()?;
    let mut doc = Document::open(Arc::new(bytes))
        .map_err(|e| format!("Failed to parse PDF: {:?}", e))?;

    inkvault_forms::recalculate(&mut doc)
        .map_err(|e| format!("Form recalculation failed: {:?}", e))?;

    save_document(&doc, incremental.unwrap_or(false))
}
