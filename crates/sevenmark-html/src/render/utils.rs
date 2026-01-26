//! Common rendering utilities

use sevenmark_parser::ast::{AstNode, NodeKind, Parameters};

/// Extract plain text from elements
pub fn extract_text(elements: &[AstNode]) -> String {
    let mut result = String::new();
    for el in elements {
        match &el.kind {
            NodeKind::Text { value } => result.push_str(value),
            NodeKind::Escape { value } => result.push_str(value),
            _ => {}
        }
    }
    result
}

/// Get parameter value as text
pub fn get_param(params: &Parameters, key: &str) -> Option<String> {
    params.get(key).map(|p| extract_text(&p.value))
}

/// Build inline style string from common style parameters
pub fn build_style(params: &Parameters) -> Option<String> {
    let mut styles = Vec::new();

    if let Some(style) = get_param(params, "style") {
        styles.push(style);
    }
    if let Some(size) = get_param(params, "size") {
        styles.push(format!("font-size:{}", size));
    }
    if let Some(color) = get_param(params, "color") {
        styles.push(format!("color:{}", color));
    }
    if let Some(bg) = get_param(params, "bgcolor") {
        styles.push(format!("background-color:{}", bg));
    }
    if let Some(opacity) = get_param(params, "opacity") {
        styles.push(format!("opacity:{}", opacity));
    }

    if styles.is_empty() {
        None
    } else {
        Some(styles.join(";"))
    }
}
