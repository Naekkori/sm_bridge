use sevenmark_parser::core::parse_document;
use sevenmark_transform::convert_ast_to_utf16_offset_json;
use std::fs;
use std::path::Path;

fn main() {
    let input_dir = "tc/codemirror/input";
    let expected_dir = "tc/codemirror/expected";

    // Create directories if they don't exist
    if !Path::new(input_dir).exists() {
        fs::create_dir_all(input_dir).expect("Failed to create input directory");
    }
    if !Path::new(expected_dir).exists() {
        fs::create_dir_all(expected_dir).expect("Failed to create expected directory");
    }

    // Process each input file
    if let Ok(entries) = fs::read_dir(input_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().is_some_and(|ext| ext == "txt") {
                let file_stem = path.file_stem().unwrap().to_str().unwrap();
                // Normalize CRLF to LF for consistent byte offsets across platforms
                let input_content = fs::read_to_string(&path)
                    .expect("Failed to read input file")
                    .replace("\r\n", "\n");

                let result = parse_document(&input_content);
                let json_output = convert_ast_to_utf16_offset_json(&result, &input_content);

                // Pretty print for readability
                let pretty: serde_json::Value = serde_json::from_str(&json_output).unwrap();
                let pretty_output = serde_json::to_string_pretty(&pretty).unwrap();

                let expected_path = format!("{}/{}.json", expected_dir, file_stem);
                fs::write(&expected_path, &pretty_output).expect("Failed to write expected file");

                println!("Generated: {}", expected_path);
            }
        }
    } else {
        println!("No input files found in {}", input_dir);
        println!("Create .txt files in {} first", input_dir);
    }
}
