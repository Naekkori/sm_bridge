use sevenmark_parser::core::parse_document;
use sevenmark_transform::convert_ast_to_line_column_json;
use std::fs;
use std::path::Path;

fn main() {
    let input_dir = "tc/monaco/input";
    let expected_dir = "tc/monaco/expected";

    // Create expected directory if it doesn't exist
    if !Path::new(expected_dir).exists() {
        fs::create_dir_all(expected_dir).expect("Failed to create expected directory");
    }

    // Process each input file
    if let Ok(entries) = fs::read_dir(input_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().is_some_and(|ext| ext == "txt") {
                let file_stem = path.file_stem().unwrap().to_str().unwrap();
                // Normalize CRLF to LF for consistent positions across platforms
                let input_content = fs::read_to_string(&path)
                    .expect("Failed to read input file")
                    .replace("\r\n", "\n");

                let result = parse_document(&input_content);
                let monaco_json = convert_ast_to_line_column_json(&result, &input_content);

                let expected_path = format!("{}/{}.json", expected_dir, file_stem);
                fs::write(&expected_path, &monaco_json).expect("Failed to write expected file");

                println!("Generated: {}", expected_path);
            }
        }
    }
}
