use sevenmark_parser::ast::Element;

/// Extract plain text content from a slice of Elements
pub fn extract_plain_text(elements: &[Element]) -> String {
    elements
        .iter()
        .filter_map(|element| match element {
            Element::Text(text) => Some(text.value.as_str()),
            Element::Escape(escape) => Some(escape.value.as_str()),
            _ => None,
        })
        .collect::<String>()
}
