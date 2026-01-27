use serde::Serialize;
use sevenmark_parser::ast::{Element, Span};

/// UTF-16 code unit offset position (0-based)
/// Designed for CodeMirror 6 compatibility
#[derive(Debug, Clone, Serialize)]
pub struct Utf16Position {
    pub start: u32, // 0-based UTF-16 code unit offset
    pub end: u32,   // 0-based UTF-16 code unit offset
}

/// UTF-8 byte offset to UTF-16 code unit offset converter
///
/// CodeMirror 6 uses absolute UTF-16 code unit offsets for positions.
/// This converter provides O(1) lookups after O(n) preprocessing.
pub struct Utf16OffsetConverter {
    /// Maps byte position to UTF-16 code unit position
    /// Index: byte offset, Value: UTF-16 offset at that byte
    byte_to_utf16: Vec<u32>,
}

impl Utf16OffsetConverter {
    /// Creates a new converter with O(n) preprocessing
    ///
    /// Builds a lookup table mapping each byte position to its
    /// corresponding UTF-16 code unit position.
    pub fn new(input: &str) -> Self {
        let mut map = vec![0u32; input.len() + 1];
        let mut utf16_pos = 0u32;

        for (byte_pos, ch) in input.char_indices() {
            map[byte_pos] = utf16_pos;
            utf16_pos += ch.len_utf16() as u32;
        }
        map[input.len()] = utf16_pos;

        Self { byte_to_utf16: map }
    }

    /// Converts a byte offset to UTF-16 code unit offset in O(1)
    pub fn convert(&self, byte_offset: usize) -> u32 {
        self.byte_to_utf16
            .get(byte_offset)
            .copied()
            .unwrap_or(*self.byte_to_utf16.last().unwrap_or(&0))
    }

    /// Converts a Span to UTF-16 position
    pub fn convert_span(&self, span: &Span) -> Utf16Position {
        Utf16Position {
            start: self.convert(span.start),
            end: self.convert(span.end),
        }
    }

    /// Converts SevenMark AST elements to JSON with UTF-16 positions
    pub fn convert_elements(&self, elements: &[Element]) -> serde_json::Value {
        let mut json = serde_json::to_value(elements).unwrap_or(serde_json::Value::Null);
        self.convert_spans_in_json(&mut json);
        json
    }

    /// Recursively transforms span fields in JSON values
    fn convert_spans_in_json(&self, value: &mut serde_json::Value) {
        match value {
            serde_json::Value::Object(map) => {
                // Check for span field and convert it
                if let Some(span_value) = map.get("span")
                    && let Ok(span) = serde_json::from_value::<Span>(span_value.clone())
                {
                    let utf16_span = self.convert_span(&span);
                    map.insert(
                        "span".to_string(),
                        serde_json::to_value(utf16_span).unwrap(),
                    );
                }

                // Recursively process all other fields
                for (_, v) in map.iter_mut() {
                    self.convert_spans_in_json(v);
                }
            }
            serde_json::Value::Array(arr) => {
                for item in arr.iter_mut() {
                    self.convert_spans_in_json(item);
                }
            }
            _ => {}
        }
    }
}

/// Converts SevenMark AST to JSON with UTF-16 absolute offsets
///
/// Main entry point for converting parsed SevenMark elements to JSON format
/// with 0-based UTF-16 code unit offsets (for CodeMirror 6 compatibility).
///
/// # Arguments
/// * `elements` - The parsed SevenMark AST elements
/// * `input` - The original input string used for offset calculation
///
/// # Returns
/// JSON string with 0-based UTF-16 code unit offsets
pub fn convert_ast_to_utf16_offset_json(elements: &[Element], input: &str) -> String {
    let converter = Utf16OffsetConverter::new(input);
    let result = converter.convert_elements(elements);
    serde_json::to_string(&result).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ascii() {
        let input = "hello\nworld";
        let converter = Utf16OffsetConverter::new(input);

        assert_eq!(converter.convert(0), 0); // 'h'
        assert_eq!(converter.convert(5), 5); // '\n'
        assert_eq!(converter.convert(6), 6); // 'w'
        assert_eq!(converter.convert(11), 11); // end
    }

    #[test]
    fn test_korean() {
        // "한국어" = 9 bytes UTF-8, 3 UTF-16 code units
        let input = "한국어";
        let converter = Utf16OffsetConverter::new(input);

        assert_eq!(converter.convert(0), 0); // '한' start
        assert_eq!(converter.convert(3), 1); // '국' start
        assert_eq!(converter.convert(6), 2); // '어' start
        assert_eq!(converter.convert(9), 3); // end
    }

    #[test]
    fn test_emoji() {
        // "a🚀b" = 1 + 4 + 1 = 6 bytes UTF-8
        // UTF-16: 1 + 2 (surrogate pair) + 1 = 4 code units
        let input = "a🚀b";
        let converter = Utf16OffsetConverter::new(input);

        assert_eq!(converter.convert(0), 0); // 'a'
        assert_eq!(converter.convert(1), 1); // '🚀' start
        assert_eq!(converter.convert(5), 3); // 'b'
        assert_eq!(converter.convert(6), 4); // end
    }

    #[test]
    fn test_mixed() {
        // "한\n글" = 3 + 1 + 3 = 7 bytes, 1 + 1 + 1 = 3 UTF-16 units
        let input = "한\n글";
        let converter = Utf16OffsetConverter::new(input);

        assert_eq!(converter.convert(0), 0); // '한'
        assert_eq!(converter.convert(3), 1); // '\n'
        assert_eq!(converter.convert(4), 2); // '글'
        assert_eq!(converter.convert(7), 3); // end
    }

    #[test]
    fn test_empty() {
        let input = "";
        let converter = Utf16OffsetConverter::new(input);
        assert_eq!(converter.convert(0), 0);
    }

    #[test]
    fn test_boundary() {
        let input = "abc";
        let converter = Utf16OffsetConverter::new(input);
        // Out of bounds returns last valid position
        assert_eq!(converter.convert(100), 3);
    }

    #[test]
    fn test_complex() {
        // "Hello, 세계! 🌍"
        // UTF-8: 7 + 6 + 2 + 4 = 19 bytes
        // UTF-16: 7 + 2 + 2 + 2 = 13 units
        let input = "Hello, 세계! 🌍";
        let converter = Utf16OffsetConverter::new(input);

        assert_eq!(converter.convert(0), 0); // 'H'
        assert_eq!(converter.convert(7), 7); // '세' start
        assert_eq!(converter.convert(13), 9); // '!' start
        assert_eq!(converter.convert(15), 11); // '🌍' start
        assert_eq!(converter.convert(19), 13); // end
    }
}
