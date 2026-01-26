use sevenmark_html::{RenderConfig, render_document};
use sevenmark_parser::core::parse_document;
use std::fs;
use std::time::Instant;

fn main() {
    let input_content = fs::read_to_string("ToParse.txt").expect("ToParse.txt file not found");
    let document_len = input_content.len();

    println!("Input ({} bytes):\n{}\n", document_len, "=".repeat(50));

    // Parse
    let parse_start = Instant::now();
    let ast = parse_document(&input_content);
    let parse_duration = parse_start.elapsed();
    println!("Parsed {} elements in {:?}", ast.len(), parse_duration);

    // Render
    let render_start = Instant::now();
    let config = RenderConfig {
        edit_url: Some("/edit/TestDocument"),
        file_base_url: Some("https://cdn.example.com/"),
        document_base_url: Some("/Document/"),
        category_base_url: Some("/Category/"),
    };
    let html = render_document(&ast, &config);
    let render_duration = render_start.elapsed();
    println!("Rendered {} bytes in {:?}", html.len(), render_duration);

    // Save
    fs::write("RenderResult.html", &html).ok();
    println!("\nResult saved to RenderResult.html");

    // Performance
    let total_duration = parse_duration + render_duration;
    println!(
        "Total: {:?} ({:.2} KB/s)",
        total_duration,
        document_len as f64 / 1024.0 / total_duration.as_secs_f64()
    );
}
