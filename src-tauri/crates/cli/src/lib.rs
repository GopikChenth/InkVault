//! InkVault CLI & MCP Library
//! ArcadeLabs · Private, Offline Document Suite

#![deny(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::panic,
    clippy::unimplemented,
    clippy::todo,
    clippy::unreachable
)]

pub mod engine;
pub mod mcp;

use std::env;
use std::process::ExitCode;

pub fn run_cli() -> ExitCode {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        print_help();
        return ExitCode::SUCCESS;
    }

    let command = args[1].as_str();
    match command {
        "mcp" | "--mcp" => {
            if let Err(e) = mcp::run_mcp_server() {
                eprintln!("MCP server error: {}", e);
                return ExitCode::FAILURE;
            }
            ExitCode::SUCCESS
        }
        "info" | "doc_info" => run_info(&args[2..]),
        "combine" | "merge" => run_combine(&args[2..]),
        "split" => run_split(&args[2..]),
        "extract" => run_extract(&args[2..]),
        "protect" | "doc_protect" | "encrypt" => run_protect(&args[2..]),
        "optimize" | "compress" => run_optimize(&args[2..]),
        "sanitize" => run_sanitize(&args[2..]),
        "redact" => run_redact(&args[2..]),
        "sign" => run_sign(&args[2..]),
        "-h" | "--help" | "help" => {
            print_help();
            ExitCode::SUCCESS
        }
        "-v" | "--version" | "version" => {
            println!("InkVault CLI v0.1.0 · ArcadeLabs");
            println!("Local-first, zero-telemetry document engine");
            ExitCode::SUCCESS
        }
        other => {
            eprintln!("Unknown command: '{}'. Run 'inkvault help' for usage.", other);
            ExitCode::FAILURE
        }
    }
}

pub fn print_help() {
    println!("{}", r#"
╔══════════════════════════════════════════════════════════════════════╗
║                InkVault CLI & MCP Server (ArcadeLabs)                ║
║             100% Offline · Zero Telemetry · Clean-Room Rust          ║
╚══════════════════════════════════════════════════════════════════════╝

USAGE:
  inkvault <COMMAND> [OPTIONS]
  inkvault-cli <COMMAND> [OPTIONS]

AI AGENT / MCP INTEGRATION:
  inkvault mcp
    Launch the JSON-RPC stdio Model Context Protocol (MCP) server.
    Configure with Claude Code:
      claude mcp add inkvault -- cargo run -p inkvault-cli --bin inkvault -- mcp
    Configure with Claude Desktop (claude_desktop_config.json):
      "mcpServers": {
        "inkvault": {
          "command": "cargo",
          "args": ["run", "-p", "inkvault-cli", "--bin", "inkvault", "--", "mcp"]
        }
      }

COMMANDS:
  info <file.pdf> [--json]
      Inspect PDF version, page count, security status, and metadata.

  combine <file1.pdf> <file2.pdf> ... --out <output.pdf>
      Merge multiple PDF files in order into a single document.
      Alias: 'merge'

  split <file.pdf> --out-dir <directory> [--every <N>]
      Split document into separate parts (default every 1 page).

  extract <file.pdf> --pages <1-3,5> --out <output.pdf>
      Extract specified 1-indexed page ranges into a new document.

  protect <file.pdf> --out <output.pdf> [OPTIONS]
      Encrypt PDF with native AES-256 standard security.
      Options:
        --user-password <pw>     Password required to open the document
        --owner-password <pw>    Password required to edit permissions
        --no-print               Revoke printing permission
        --no-copy                Revoke text copying permission
      Aliases: 'encrypt', 'doc_protect'

  optimize <file.pdf> --out <output.pdf> [--preset <lossless|balanced|extreme>]
      Compress streams and downsample embedded bitmaps.
      Alias: 'compress'

  sanitize <file.pdf> --out <output.pdf>
      Permanently strip metadata, javascript, and private annotations.

  redact <file.pdf> --out <output.pdf> --page <N> --rect <x0,y0,x1,y1> [--text <msg>]
      Permanently scrub underlying text glyphs, vectors, and pixels.
      Coordinates are in PDF points (bottom-left origin).

  sign <file.pdf> --out <output.pdf> --cert <cert.p12> --password <pw> [OPTIONS]
      PAdES B-B digital signing using a local PKCS #12 certificate.
      Options:
        --page <N>               Page for visible signature stamp (1-indexed)
        --rect <x0,y0,x1,y1>     Visible stamp box coordinates
        --reason <str>           Signing reason
        --location <str>         Signing location
        --contact <str>          Contact information

  help, --help, -h
      Show this help message.

  version, --version, -v
      Show version information.
"#);
}

fn get_arg_val<'a>(args: &'a [String], flag: &str) -> Option<&'a str> {
    for (i, arg) in args.iter().enumerate() {
        if arg == flag && i + 1 < args.len() {
            return Some(&args[i + 1]);
        }
    }
    None
}

fn has_flag(args: &[String], flag: &str) -> bool {
    args.iter().any(|a| a == flag)
}

fn run_info(args: &[String]) -> ExitCode {
    if args.is_empty() {
        eprintln!("Usage: inkvault info <file.pdf> [--json]");
        return ExitCode::FAILURE;
    }

    let file_path = &args[0];
    let is_json = has_flag(args, "--json");

    match engine::get_doc_info(file_path) {
        Ok(info) => {
            if is_json {
                match serde_json::to_string_pretty(&info) {
                    Ok(s) => println!("{}", s),
                    Err(e) => eprintln!("Serialization error: {}", e),
                }
            } else {
                println!("File:         {}", info.path);
                println!("Pages:        {}", info.page_count);
                println!("Version:      PDF {}", info.version);
                println!("Size:         {:.2} MB ({} bytes)", info.file_size_bytes as f64 / 1_048_576.0, info.file_size_bytes);
                println!("Encrypted:    {}", if info.is_encrypted { "Yes (Security Handler active)" } else { "No" });
                if let Some(ref t) = info.title { println!("Title:        {}", t); }
                if let Some(ref a) = info.author { println!("Author:       {}", a); }
                if let Some(ref s) = info.subject { println!("Subject:      {}", s); }
                if let Some(ref k) = info.keywords { println!("Keywords:     {}", k); }
                if let Some(ref c) = info.creator { println!("Creator:      {}", c); }
                if let Some(ref p) = info.producer { println!("Producer:     {}", p); }
            }
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("Error inspecting PDF: {}", e);
            ExitCode::FAILURE
        }
    }
}

fn run_combine(args: &[String]) -> ExitCode {
    let mut inputs = Vec::new();
    let mut out = None;

    let mut i = 0;
    while i < args.len() {
        if args[i] == "--out" || args[i] == "-o" {
            if i + 1 < args.len() {
                out = Some(&args[i + 1]);
                i += 2;
                continue;
            }
        } else if !args[i].starts_with('-') {
            inputs.push(args[i].clone());
        }
        i += 1;
    }

    let Some(out_path) = out else {
        eprintln!("Usage: inkvault combine <file1.pdf> <file2.pdf> ... --out <output.pdf>");
        return ExitCode::FAILURE;
    };

    if inputs.is_empty() {
        eprintln!("Error: At least one input PDF must be provided.");
        return ExitCode::FAILURE;
    }

    match engine::combine_pdfs(&inputs, out_path) {
        Ok(pages) => {
            println!("✓ Successfully combined {} files into '{}' (total {} pages).", inputs.len(), out_path, pages);
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("Error combining PDFs: {}", e);
            ExitCode::FAILURE
        }
    }
}

fn run_split(args: &[String]) -> ExitCode {
    if args.is_empty() {
        eprintln!("Usage: inkvault split <file.pdf> --out-dir <directory> [--every <N>]");
        return ExitCode::FAILURE;
    }

    let input = &args[0];
    let out_dir = match get_arg_val(args, "--out-dir") {
        Some(d) => d,
        None => {
            eprintln!("Error: --out-dir <directory> is required.");
            return ExitCode::FAILURE;
        }
    };

    let every: usize = get_arg_val(args, "--every")
        .and_then(|v| v.parse().ok())
        .unwrap_or(1);

    match engine::split_pdf_cmd(input, out_dir, every) {
        Ok(files) => {
            println!("✓ Successfully split '{}' into {} parts in '{}':", input, files.len(), out_dir);
            for f in files {
                println!("  - {}", f);
            }
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("Error splitting PDF: {}", e);
            ExitCode::FAILURE
        }
    }
}

fn run_extract(args: &[String]) -> ExitCode {
    if args.is_empty() {
        eprintln!("Usage: inkvault extract <file.pdf> --pages <1-3,5> --out <output.pdf>");
        return ExitCode::FAILURE;
    }

    let input = &args[0];
    let pages = match get_arg_val(args, "--pages") {
        Some(p) => p,
        None => {
            eprintln!("Error: --pages <ranges> is required (e.g. --pages 1-3,5).");
            return ExitCode::FAILURE;
        }
    };
    let out = match get_arg_val(args, "--out") {
        Some(o) => o,
        None => {
            eprintln!("Error: --out <output.pdf> is required.");
            return ExitCode::FAILURE;
        }
    };

    match engine::extract_pages_cmd(input, out, pages) {
        Ok(count) => {
            println!("✓ Successfully extracted {} pages from '{}' to '{}'.", count, input, out);
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("Error extracting pages: {}", e);
            ExitCode::FAILURE
        }
    }
}

fn run_protect(args: &[String]) -> ExitCode {
    if args.is_empty() {
        eprintln!("Usage: inkvault protect <file.pdf> --out <output.pdf> [--user-password <pw>] [--owner-password <pw>] [--no-print] [--no-copy]");
        return ExitCode::FAILURE;
    }

    let input = &args[0];
    let out = match get_arg_val(args, "--out") {
        Some(o) => o,
        None => {
            eprintln!("Error: --out <output.pdf> is required.");
            return ExitCode::FAILURE;
        }
    };

    let user_pw = get_arg_val(args, "--user-password");
    let owner_pw = get_arg_val(args, "--owner-password");
    let allow_print = !has_flag(args, "--no-print");
    let allow_copy = !has_flag(args, "--no-copy");

    match engine::protect_pdf(input, out, user_pw, owner_pw, allow_print, allow_copy) {
        Ok(_) => {
            println!("✓ Successfully encrypted '{}' with AES-256 -> '{}'.", input, out);
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("Error protecting PDF: {}", e);
            ExitCode::FAILURE
        }
    }
}

fn run_optimize(args: &[String]) -> ExitCode {
    if args.is_empty() {
        eprintln!("Usage: inkvault optimize <file.pdf> --out <output.pdf> [--preset <lossless|balanced|extreme>]");
        return ExitCode::FAILURE;
    }

    let input = &args[0];
    let out = match get_arg_val(args, "--out") {
        Some(o) => o,
        None => {
            eprintln!("Error: --out <output.pdf> is required.");
            return ExitCode::FAILURE;
        }
    };
    let preset = get_arg_val(args, "--preset").unwrap_or("balanced");

    match engine::optimize_pdf(input, out, preset) {
        Ok(stats) => {
            println!("✓ Successfully optimized '{}' -> '{}':", input, out);
            println!("  Original:   {:.2} MB", stats.original_size_bytes as f64 / 1_048_576.0);
            println!("  Optimized:  {:.2} MB", stats.optimized_size_bytes as f64 / 1_048_576.0);
            println!("  Saved:      {:.1}% ({:.2} MB)", stats.reduction_percent, stats.saved_bytes as f64 / 1_048_576.0);
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("Error optimizing PDF: {}", e);
            ExitCode::FAILURE
        }
    }
}

fn run_sanitize(args: &[String]) -> ExitCode {
    if args.is_empty() {
        eprintln!("Usage: inkvault sanitize <file.pdf> --out <output.pdf>");
        return ExitCode::FAILURE;
    }

    let input = &args[0];
    let out = match get_arg_val(args, "--out") {
        Some(o) => o,
        None => {
            eprintln!("Error: --out <output.pdf> is required.");
            return ExitCode::FAILURE;
        }
    };

    match engine::sanitize_pdf(input, out) {
        Ok(_) => {
            println!("✓ Successfully sanitized '{}' (metadata, javascript, and private annotations stripped) -> '{}'.", input, out);
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("Error sanitizing PDF: {}", e);
            ExitCode::FAILURE
        }
    }
}

fn run_redact(args: &[String]) -> ExitCode {
    if args.is_empty() {
        eprintln!("Usage: inkvault redact <file.pdf> --out <output.pdf> --page <N> --rect <x0,y0,x1,y1> [--text <label>]");
        return ExitCode::FAILURE;
    }

    let input = &args[0];
    let out = match get_arg_val(args, "--out") {
        Some(o) => o,
        None => {
            eprintln!("Error: --out <output.pdf> is required.");
            return ExitCode::FAILURE;
        }
    };
    let page: usize = match get_arg_val(args, "--page").and_then(|p| p.parse().ok()) {
        Some(p) => p,
        None => {
            eprintln!("Error: --page <N> (1-indexed) is required.");
            return ExitCode::FAILURE;
        }
    };
    let rect_str = match get_arg_val(args, "--rect") {
        Some(r) => r,
        None => {
            eprintln!("Error: --rect <x0,y0,x1,y1> is required.");
            return ExitCode::FAILURE;
        }
    };

    let parts: Vec<&str> = rect_str.split(',').collect();
    if parts.len() != 4 {
        eprintln!("Error: --rect must contain 4 comma-separated numbers: x0,y0,x1,y1");
        return ExitCode::FAILURE;
    }

    let mut rect = [0.0; 4];
    for (i, p) in parts.iter().enumerate() {
        match p.trim().parse::<f64>() {
            Ok(v) => rect[i] = v,
            Err(_) => {
                eprintln!("Error: Invalid coordinate number '{}' in rect", p);
                return ExitCode::FAILURE;
            }
        }
    }

    let text = get_arg_val(args, "--text");

    match engine::redact_pdf(input, out, page, &[rect], text) {
        Ok(_) => {
            println!("✓ Successfully redacted coordinates {:?} on page {} of '{}' -> '{}'.", rect, page, input, out);
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("Error redacting PDF: {}", e);
            ExitCode::FAILURE
        }
    }
}

fn run_sign(args: &[String]) -> ExitCode {
    if args.is_empty() {
        eprintln!("Usage: inkvault sign <file.pdf> --out <output.pdf> --cert <cert.p12> --password <pw> [OPTIONS]");
        return ExitCode::FAILURE;
    }

    let input = &args[0];
    let out = match get_arg_val(args, "--out") {
        Some(o) => o,
        None => {
            eprintln!("Error: --out <output.pdf> is required.");
            return ExitCode::FAILURE;
        }
    };
    let cert = match get_arg_val(args, "--cert") {
        Some(c) => c,
        None => {
            eprintln!("Error: --cert <cert.p12> is required.");
            return ExitCode::FAILURE;
        }
    };
    let password = match get_arg_val(args, "--password") {
        Some(p) => p,
        None => {
            eprintln!("Error: --password <passphrase> is required.");
            return ExitCode::FAILURE;
        }
    };

    let page: Option<usize> = get_arg_val(args, "--page").and_then(|p| p.parse().ok());
    let rect = get_arg_val(args, "--rect").and_then(|r| {
        let parts: Vec<&str> = r.split(',').collect();
        if parts.len() == 4 {
            let mut coords = [0.0; 4];
            for (i, p) in parts.iter().enumerate() {
                coords[i] = p.trim().parse::<f64>().ok()?;
            }
            Some(coords)
        } else {
            None
        }
    });

    let reason = get_arg_val(args, "--reason");
    let location = get_arg_val(args, "--location");
    let contact = get_arg_val(args, "--contact");

    match engine::sign_pdf(input, out, cert, password, page, rect, reason, location, contact) {
        Ok(_) => {
            println!("✓ Successfully digitally signed '{}' with certificate '{}' (PAdES B-B) -> '{}'.", input, cert, out);
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("Error signing PDF: {}", e);
            ExitCode::FAILURE
        }
    }
}
