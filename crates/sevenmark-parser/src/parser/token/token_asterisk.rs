use crate::ast::{Element, Span, TextElement};
use crate::parser::ParserInput;
use winnow::Result;
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

pub fn token_asterisk_parser(parser_input: &mut ParserInput) -> Result<Element> {
    // Bold context에서 **을 만나면 실패 (delimiter로 사용되어야 함)
    if parser_input.state.inside_bold && parser_input.input.starts_with("**") {
        return Err(winnow::error::ContextError::new());
    }
    // Italic context에서 *을 만나면 실패 (delimiter로 사용되어야 함)
    if parser_input.state.inside_italic && parser_input.input.starts_with("*") {
        return Err(winnow::error::ContextError::new());
    }

    let start = parser_input.current_token_start();
    literal("*").parse_next(parser_input)?;
    let end = parser_input.previous_token_end();

    Ok(Element::Text(TextElement {
        span: Span { start, end },
        value: "*".to_string(),
    }))
}
