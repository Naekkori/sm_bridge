use sevenmark_parser::core::parse_document;
use std::fs;
use std::path::Path;

fn main() {
    let categories = [
        "brace", "comment", "complex", "escape", "fold", "if", "macro", "markdown",
    ];

    for category in categories {
        let input_dir = format!("tc/{}/input", category);
        let expected_dir = format!("tc/{}/expected", category);

        // Create expected directory if it doesn't exist
        if !Path::new(&expected_dir).exists() {
            fs::create_dir_all(&expected_dir).expect("Failed to create expected directory");
        }

        // Process each input file
        if let Ok(entries) = fs::read_dir(&input_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().is_some_and(|ext| ext == "txt") {
                    let file_stem = path.file_stem().unwrap().to_str().unwrap();
                    // Normalize CRLF to LF for consistent byte offsets across platforms
                    let input_content = fs::read_to_string(&path)
                        .expect("Failed to read input file")
                        .replace("\r\n", "\n");

                    let result = parse_document(&input_content);
                    let json_output = serde_json::to_string_pretty(&result).unwrap();

                    let expected_path = format!("{}/{}.json", expected_dir, file_stem);
                    fs::write(&expected_path, &json_output).expect("Failed to write expected file");

                    println!("Generated: {}", expected_path);
                }
            }
        }
    }
}
