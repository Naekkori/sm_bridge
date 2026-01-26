use sevenmark_parser::core::parse_document;
use sevenmark_transform::convert_ast_to_line_column_json;
use std::fs;
use std::time::Instant;

fn main() {
    let input_content = fs::read_to_string("ToParse.txt").expect("ToParse.txt file not found");
    let document_len = input_content.len();

    println!("Input ({} bytes):\n{}\n", document_len, "=".repeat(50));

    let start_time = Instant::now();
    let result = parse_document(&input_content);
    let duration = start_time.elapsed();

    println!("Parsed {} elements in {:?}", result.len(), duration);

    let json_output = serde_json::to_string_pretty(&result).unwrap();
    fs::write("ParseResult.json", &json_output).ok();

    let monaco_start = Instant::now();
    let monaco_json = convert_ast_to_line_column_json(&result, &input_content);
    let monaco_duration = monaco_start.elapsed();

    fs::write("ParseResult_Monaco.json", &monaco_json).ok();

    println!("\nResult saved to ParseResult.json");
    println!("Monaco result saved to ParseResult_Monaco.json");
    println!("Monaco conversion took: {:?}", monaco_duration);
    println!(
        "Performance: {:.2} KB/s",
        document_len as f64 / 1024.0 / duration.as_secs_f64()
    );
}
