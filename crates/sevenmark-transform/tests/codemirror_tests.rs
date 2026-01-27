use sevenmark_parser::core::parse_document;
use sevenmark_transform::convert_ast_to_utf16_offset_json;
use std::fs;

fn codemirror_parse_file_content(content: &str) -> Result<String, Box<dyn std::error::Error>> {
    let result = parse_document(content);
    let json_output = convert_ast_to_utf16_offset_json(&result, content);

    // Pretty print for comparison
    let pretty: serde_json::Value = serde_json::from_str(&json_output)?;
    Ok(serde_json::to_string_pretty(&pretty)?)
}

fn run_codemirror_test(test_name: &str) -> Result<(), Box<dyn std::error::Error>> {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let input_path = format!(
        "{}/../../tc/codemirror/input/{}.txt",
        manifest_dir, test_name
    );
    let expected_path = format!(
        "{}/../../tc/codemirror/expected/{}.json",
        manifest_dir, test_name
    );

    // Normalize CRLF to LF for consistent byte offsets across platforms
    let input_content = fs::read_to_string(&input_path)?.replace("\r\n", "\n");

    let actual_output = codemirror_parse_file_content(&input_content)?;
    let expected_output = fs::read_to_string(&expected_path)?.replace("\r\n", "\n");

    assert_eq!(
        actual_output.trim(),
        expected_output.trim(),
        "Mismatch for test: {}",
        test_name
    );

    Ok(())
}

#[test]
fn test_codemirror_basic_text() {
    run_codemirror_test("basic_text").expect("CodeMirror basic text test failed");
}

#[test]
fn test_codemirror_utf8_text() {
    run_codemirror_test("utf8_text").expect("CodeMirror UTF-8 text test failed");
}

#[test]
fn test_codemirror_markdown_elements() {
    run_codemirror_test("markdown_elements").expect("CodeMirror markdown elements test failed");
}

#[test]
fn test_codemirror_complex_elements() {
    run_codemirror_test("complex_elements").expect("CodeMirror complex elements test failed");
}

#[test]
fn test_codemirror_edge_cases() {
    run_codemirror_test("edge_cases").expect("CodeMirror edge cases test failed");
}
