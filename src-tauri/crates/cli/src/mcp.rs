//! Model Context Protocol (MCP) stdio server implementation for InkVault.
//!
//! Exposes native PDF manipulation tools to AI agents (Claude Code, Cursor, Windsurf, Claude Desktop, Antigravity)
//! over standard input/output using JSON-RPC 2.0.

#![deny(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::panic,
    clippy::unimplemented,
    clippy::todo,
    clippy::unreachable
)]

use std::io::{self, BufRead, Write};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::engine;

#[derive(Deserialize, Debug)]
struct JsonRpcRequest {
    #[allow(dead_code)]
    jsonrpc: Option<String>,
    id: Option<Value>,
    method: String,
    params: Option<Value>,
}

#[derive(Serialize, Debug)]
struct JsonRpcResponse {
    jsonrpc: &'static str,
    id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<JsonRpcError>,
}

#[derive(Serialize, Debug)]
struct JsonRpcError {
    code: i32,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<Value>,
}

pub fn run_mcp_server() -> io::Result<()> {
    eprintln!("[inkvault-mcp] ArcadeLabs InkVault MCP Server running (stdio mode)...");
    eprintln!("[inkvault-mcp] Ready for JSON-RPC 2.0 communication from AI host.");

    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut reader = stdin.lock();
    let mut writer = stdout.lock();

    let mut line_buffer = String::new();

    loop {
        line_buffer.clear();
        let bytes_read = reader.read_line(&mut line_buffer)?;
        if bytes_read == 0 {
            // EOF reached
            break;
        }

        let trimmed = line_buffer.trim();
        if trimmed.is_empty() {
            continue;
        }

        let request: JsonRpcRequest = match serde_json::from_str(trimmed) {
            Ok(req) => req,
            Err(e) => {
                let err_resp = JsonRpcResponse {
                    jsonrpc: "2.0",
                    id: Value::Null,
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32700,
                        message: format!("Parse error: {}", e),
                        data: None,
                    }),
                };
                send_response(&mut writer, &err_resp)?;
                continue;
            }
        };

        // If the message is a notification (no id), handle and don't send response
        if request.id.is_none() {
            if request.method == "notifications/initialized" {
                eprintln!("[inkvault-mcp] Client handshake initialized successfully.");
            }
            continue;
        }

        let req_id = request.id.unwrap_or(Value::Null);

        match request.method.as_str() {
            "initialize" => {
                let result = json!({
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {}
                    },
                    "serverInfo": {
                        "name": "inkvault-mcp",
                        "version": "0.1.0"
                    }
                });
                send_result(&mut writer, req_id, result)?;
            }
            "ping" => {
                send_result(&mut writer, req_id, json!({}))?;
            }
            "tools/list" => {
                let tools = get_tools_list();
                send_result(&mut writer, req_id, json!({ "tools": tools }))?;
            }
            "tools/call" => {
                let call_result = handle_tool_call(request.params.as_ref());
                send_result(&mut writer, req_id, call_result)?;
            }
            other => {
                let err_resp = JsonRpcResponse {
                    jsonrpc: "2.0",
                    id: req_id,
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32601,
                        message: format!("Method not found: {}", other),
                        data: None,
                    }),
                };
                send_response(&mut writer, &err_resp)?;
            }
        }
    }

    eprintln!("[inkvault-mcp] Server terminated gracefully.");
    Ok(())
}

fn send_result<W: Write>(writer: &mut W, id: Value, result: Value) -> io::Result<()> {
    let resp = JsonRpcResponse {
        jsonrpc: "2.0",
        id,
        result: Some(result),
        error: None,
    };
    send_response(writer, &resp)
}

fn send_response<W: Write>(writer: &mut W, response: &JsonRpcResponse) -> io::Result<()> {
    let json_str = match serde_json::to_string(response) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[inkvault-mcp] Failed to serialize JSON-RPC response: {}", e);
            return Ok(());
        }
    };
    writer.write_all(json_str.as_bytes())?;
    writer.write_all(b"\n")?;
    writer.flush()?;
    Ok(())
}

fn get_tools_list() -> Value {
    json!([
        {
            "name": "doc_info",
            "description": "Inspect a PDF file and extract page count, PDF version, security status, and metadata (Title, Author, Subject, etc.).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Absolute or relative path to the input PDF file"
                    }
                },
                "required": ["path"]
            }
        },
        {
            "name": "combine",
            "description": "Merge multiple PDF files in order into a single unified output document.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "inputs": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "List of PDF file paths to combine in order"
                    },
                    "out": {
                        "type": "string",
                        "description": "Path to the destination merged PDF file"
                    }
                },
                "required": ["inputs", "out"]
            }
        },
        {
            "name": "split",
            "description": "Split a PDF file into separate documents saved in an output directory.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to the source PDF file"
                    },
                    "out_dir": {
                        "type": "string",
                        "description": "Destination directory where split files will be written"
                    },
                    "every": {
                        "type": "integer",
                        "description": "Number of pages per split file (default 1)"
                    }
                },
                "required": ["path", "out_dir"]
            }
        },
        {
            "name": "extract_pages",
            "description": "Extract specified pages or ranges (e.g. '1-3, 5, 8-10') from a PDF into a new document.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to the source PDF file"
                    },
                    "out": {
                        "type": "string",
                        "description": "Destination path for the extracted PDF"
                    },
                    "pages": {
                        "type": "string",
                        "description": "1-indexed page ranges to extract (e.g. '1-3, 5, 7-10')"
                    }
                },
                "required": ["path", "out", "pages"]
            }
        },
        {
            "name": "doc_protect",
            "description": "Encrypt a PDF with native AES-256 standard security, setting user/owner passwords and print/copy permissions.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to the source PDF file"
                    },
                    "out": {
                        "type": "string",
                        "description": "Destination path for the encrypted PDF"
                    },
                    "user_password": {
                        "type": "string",
                        "description": "User / Open password required to view the document"
                    },
                    "owner_password": {
                        "type": "string",
                        "description": "Owner / Master password required to edit permissions"
                    },
                    "allow_print": {
                        "type": "boolean",
                        "description": "Whether to permit printing (default true)"
                    },
                    "allow_copy": {
                        "type": "boolean",
                        "description": "Whether to permit content copying (default true)"
                    }
                },
                "required": ["path", "out"]
            }
        },
        {
            "name": "optimize",
            "description": "Optimize and compress a PDF file using stream recompression, bicubic image downsampling, and unencoded stream cleanup.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to the source PDF file"
                    },
                    "out": {
                        "type": "string",
                        "description": "Destination path for the optimized PDF"
                    },
                    "preset": {
                        "type": "string",
                        "enum": ["lossless", "balanced", "extreme"],
                        "description": "Optimization preset (default 'balanced')"
                    }
                },
                "required": ["path", "out"]
            }
        },
        {
            "name": "sanitize",
            "description": "Sanitize a PDF file by permanently stripping hidden metadata, private annotations, and embedded scripts.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to the source PDF file"
                    },
                    "out": {
                        "type": "string",
                        "description": "Destination path for the sanitized PDF"
                    }
                },
                "required": ["path", "out"]
            }
        },
        {
            "name": "redact",
            "description": "Permanently redact and strip underlying text glyphs, vector paths, and pixels within coordinate bounds on a page.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to the source PDF file"
                    },
                    "out": {
                        "type": "string",
                        "description": "Destination path for the redacted PDF"
                    },
                    "page": {
                        "type": "integer",
                        "description": "1-indexed page number containing the area to redact"
                    },
                    "rect": {
                        "type": "array",
                        "items": { "type": "number" },
                        "description": "[x0, y0, x1, y1] coordinates in PDF points (bottom-left origin)"
                    },
                    "text": {
                        "type": "string",
                        "description": "Optional overlay text label (e.g. '[REDACTED]')"
                    }
                },
                "required": ["path", "out", "page", "rect"]
            }
        },
        {
            "name": "sign",
            "description": "Digitally sign a PDF document adhering to PAdES B-B with a PKCS #12 certificate (.p12 / .pfx).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to the source PDF file"
                    },
                    "out": {
                        "type": "string",
                        "description": "Destination path for the signed PDF"
                    },
                    "cert_path": {
                        "type": "string",
                        "description": "Path to the PKCS #12 certificate file (.p12 / .pfx)"
                    },
                    "password": {
                        "type": "string",
                        "description": "Certificate passphrase"
                    },
                    "page": {
                        "type": "integer",
                        "description": "1-indexed page number for visible signature stamp (optional)"
                    },
                    "rect": {
                        "type": "array",
                        "items": { "type": "number" },
                        "description": "[x0, y0, x1, y1] stamp box in points (optional)"
                    },
                    "reason": {
                        "type": "string",
                        "description": "Reason for signing"
                    },
                    "location": {
                        "type": "string",
                        "description": "Signing location"
                    },
                    "contact": {
                        "type": "string",
                        "description": "Signer contact information"
                    }
                },
                "required": ["path", "out", "cert_path", "password"]
            }
        }
    ])
}

fn handle_tool_call(params: Option<&Value>) -> Value {
    let Some(params_val) = params else {
        return tool_error("Missing params for tools/call");
    };

    let name = match params_val.get("name").and_then(|n| n.as_str()) {
        Some(n) => n,
        None => return tool_error("Missing tool name in tools/call"),
    };

    let args = params_val.get("arguments").unwrap_or(&Value::Null);

    match name {
        "doc_info" => {
            let path = match args.get("path").and_then(|p| p.as_str()) {
                Some(p) => p,
                None => return tool_error("doc_info requires 'path' parameter"),
            };

            match engine::get_doc_info(path) {
                Ok(info) => match serde_json::to_string_pretty(&info) {
                    Ok(json_str) => tool_success(json_str),
                    Err(e) => tool_error(format!("Serialization error: {}", e)),
                },
                Err(e) => tool_error(e),
            }
        }
        "combine" => {
            let inputs: Vec<String> = match args.get("inputs").and_then(|i| i.as_array()) {
                Some(arr) => arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect(),
                None => return tool_error("combine requires 'inputs' array of file paths"),
            };
            let out = match args.get("out").and_then(|o| o.as_str()) {
                Some(o) => o,
                None => return tool_error("combine requires 'out' parameter"),
            };

            match engine::combine_pdfs(&inputs, out) {
                Ok(pages) => tool_success(format!(
                    "Successfully combined {} files into '{}' (total {} pages).",
                    inputs.len(),
                    out,
                    pages
                )),
                Err(e) => tool_error(e),
            }
        }
        "split" => {
            let path = match args.get("path").and_then(|p| p.as_str()) {
                Some(p) => p,
                None => return tool_error("split requires 'path' parameter"),
            };
            let out_dir = match args.get("out_dir").and_then(|o| o.as_str()) {
                Some(o) => o,
                None => return tool_error("split requires 'out_dir' parameter"),
            };
            let every = args.get("every").and_then(|e| e.as_u64()).unwrap_or(1) as usize;

            match engine::split_pdf_cmd(path, out_dir, every) {
                Ok(files) => tool_success(format!(
                    "Successfully split '{}' into {} files in directory '{}'.\nGenerated: {:?}",
                    path,
                    files.len(),
                    out_dir,
                    files
                )),
                Err(e) => tool_error(e),
            }
        }
        "extract_pages" => {
            let path = match args.get("path").and_then(|p| p.as_str()) {
                Some(p) => p,
                None => return tool_error("extract_pages requires 'path' parameter"),
            };
            let out = match args.get("out").and_then(|o| o.as_str()) {
                Some(o) => o,
                None => return tool_error("extract_pages requires 'out' parameter"),
            };
            let pages = match args.get("pages").and_then(|p| p.as_str()) {
                Some(p) => p,
                None => return tool_error("extract_pages requires 'pages' range string (e.g. '1-3, 5')"),
            };

            match engine::extract_pages_cmd(path, out, pages) {
                Ok(count) => tool_success(format!(
                    "Successfully extracted {} pages from '{}' to '{}'.",
                    count,
                    path,
                    out
                )),
                Err(e) => tool_error(e),
            }
        }
        "doc_protect" => {
            let path = match args.get("path").and_then(|p| p.as_str()) {
                Some(p) => p,
                None => return tool_error("doc_protect requires 'path' parameter"),
            };
            let out = match args.get("out").and_then(|o| o.as_str()) {
                Some(o) => o,
                None => return tool_error("doc_protect requires 'out' parameter"),
            };
            let user_pw = args.get("user_password").and_then(|p| p.as_str());
            let owner_pw = args.get("owner_password").and_then(|p| p.as_str());
            let allow_print = args.get("allow_print").and_then(|p| p.as_bool()).unwrap_or(true);
            let allow_copy = args.get("allow_copy").and_then(|p| p.as_bool()).unwrap_or(true);

            match engine::protect_pdf(path, out, user_pw, owner_pw, allow_print, allow_copy) {
                Ok(_) => tool_success(format!(
                    "Successfully encrypted '{}' with AES-256 and saved to '{}'.",
                    path, out
                )),
                Err(e) => tool_error(e),
            }
        }
        "optimize" => {
            let path = match args.get("path").and_then(|p| p.as_str()) {
                Some(p) => p,
                None => return tool_error("optimize requires 'path' parameter"),
            };
            let out = match args.get("out").and_then(|o| o.as_str()) {
                Some(o) => o,
                None => return tool_error("optimize requires 'out' parameter"),
            };
            let preset = args.get("preset").and_then(|p| p.as_str()).unwrap_or("balanced");

            match engine::optimize_pdf(path, out, preset) {
                Ok(stats) => tool_success(format!(
                    "Successfully optimized '{}' -> '{}'.\nOriginal: {:.2} MB, Optimized: {:.2} MB (saved {:.1}%).",
                    path,
                    out,
                    stats.original_size_bytes as f64 / 1_048_576.0,
                    stats.optimized_size_bytes as f64 / 1_048_576.0,
                    stats.reduction_percent
                )),
                Err(e) => tool_error(e),
            }
        }
        "sanitize" => {
            let path = match args.get("path").and_then(|p| p.as_str()) {
                Some(p) => p,
                None => return tool_error("sanitize requires 'path' parameter"),
            };
            let out = match args.get("out").and_then(|o| o.as_str()) {
                Some(o) => o,
                None => return tool_error("sanitize requires 'out' parameter"),
            };

            match engine::sanitize_pdf(path, out) {
                Ok(_) => tool_success(format!(
                    "Successfully sanitized '{}' (metadata, javascript, and private annotations stripped) -> '{}'.",
                    path, out
                )),
                Err(e) => tool_error(e),
            }
        }
        "redact" => {
            let path = match args.get("path").and_then(|p| p.as_str()) {
                Some(p) => p,
                None => return tool_error("redact requires 'path' parameter"),
            };
            let out = match args.get("out").and_then(|o| o.as_str()) {
                Some(o) => o,
                None => return tool_error("redact requires 'out' parameter"),
            };
            let page = match args.get("page").and_then(|p| p.as_u64()) {
                Some(p) => p as usize,
                None => return tool_error("redact requires 'page' number (1-indexed)"),
            };
            let rect_vals = match args.get("rect").and_then(|r| r.as_array()) {
                Some(arr) if arr.len() == 4 => {
                    let mut nums = [0.0; 4];
                    for (i, v) in arr.iter().enumerate() {
                        nums[i] = v.as_f64().unwrap_or(0.0);
                    }
                    nums
                }
                _ => return tool_error("redact requires 'rect' array of 4 numbers [x0, y0, x1, y1]"),
            };
            let text = args.get("text").and_then(|t| t.as_str());

            match engine::redact_pdf(path, out, page, &[rect_vals], text) {
                Ok(_) => tool_success(format!(
                    "Successfully redacted area {:?} on page {} of '{}' and saved to '{}'.",
                    rect_vals, page, path, out
                )),
                Err(e) => tool_error(e),
            }
        }
        "sign" => {
            let path = match args.get("path").and_then(|p| p.as_str()) {
                Some(p) => p,
                None => return tool_error("sign requires 'path' parameter"),
            };
            let out = match args.get("out").and_then(|o| o.as_str()) {
                Some(o) => o,
                None => return tool_error("sign requires 'out' parameter"),
            };
            let cert_path = match args.get("cert_path").and_then(|c| c.as_str()) {
                Some(c) => c,
                None => return tool_error("sign requires 'cert_path' parameter"),
            };
            let password = match args.get("password").and_then(|p| p.as_str()) {
                Some(p) => p,
                None => return tool_error("sign requires 'password' parameter"),
            };
            let page = args.get("page").and_then(|p| p.as_u64()).map(|p| p as usize);
            let rect = args.get("rect").and_then(|r| r.as_array()).and_then(|arr| {
                if arr.len() == 4 {
                    Some([
                        arr[0].as_f64().unwrap_or(0.0),
                        arr[1].as_f64().unwrap_or(0.0),
                        arr[2].as_f64().unwrap_or(0.0),
                        arr[3].as_f64().unwrap_or(0.0),
                    ])
                } else {
                    None
                }
            });
            let reason = args.get("reason").and_then(|r| r.as_str());
            let location = args.get("location").and_then(|l| l.as_str());
            let contact = args.get("contact").and_then(|c| c.as_str());

            match engine::sign_pdf(path, out, cert_path, password, page, rect, reason, location, contact) {
                Ok(_) => tool_success(format!(
                    "Successfully signed '{}' with certificate '{}' (PAdES B-B) and saved to '{}'.",
                    path, cert_path, out
                )),
                Err(e) => tool_error(e),
            }
        }
        unknown => tool_error(format!("Unknown tool: {}", unknown)),
    }
}

fn tool_success(text: impl Into<String>) -> Value {
    json!({
        "content": [
            {
                "type": "text",
                "text": text.into()
            }
        ],
        "isError": false
    })
}

fn tool_error(msg: impl Into<String>) -> Value {
    json!({
        "content": [
            {
                "type": "text",
                "text": format!("Error: {}", msg.into())
            }
        ],
        "isError": true
    })
}
