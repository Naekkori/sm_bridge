use crate::ast::{Element, Span, TextElement};
use crate::parser::ParserInput;
use winnow::Result;
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

pub fn token_caret_parser(parser_input: &mut ParserInput) -> Result<Element> {
    if parser_input.state.inside_superscript && parser_input.input.starts_with("^^") {
        return Err(winnow::error::ContextError::new());
    }

    let start = parser_input.current_token_start();
    literal("^").parse_next(parser_input)?;
    let end = parser_input.previous_token_end();

    Ok(Element::Text(TextElement {
        span: Span { start, end },
        value: "^".to_string(),
    }))
}
