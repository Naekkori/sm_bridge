use sevenmark_parser::ast::{AstNode, NodeKind};

/// Extract plain text content from a slice of AstNodes
pub fn extract_plain_text(elements: &[AstNode]) -> String {
    elements
        .iter()
        .filter_map(|element| match &element.kind {
            NodeKind::Text { value } => Some(value.as_str()),
            NodeKind::Escape { value } => Some(value.as_str()),
            _ => None,
        })
        .collect::<String>()
}
