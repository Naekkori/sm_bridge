pub mod utf16_offset_converter;

pub use utf16_offset_converter::*;

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

/// Parse sevenmark to AST with UTF-16 absolute offsets (for CodeMirror 6)
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn parse_sevenmark_to_codemirror(input: &str) -> String {
    use sevenmark_parser::core::parse_document;

    let elements = parse_document(input);
    convert_ast_to_utf16_offset_json(&elements, input)
}

/// Parse sevenmark to AST with byte offsets (for section editing)
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn parse_sevenmark(input: &str) -> String {
    use sevenmark_parser::core::parse_document;

    let elements = parse_document(input);
    serde_json::to_string(&elements).unwrap_or_default()
}
