use crate::ast::{Element, HardBreakElement, Span};
use crate::parser::ParserInput;
use winnow::Result;
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

pub fn macro_newline_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();
    literal("[br]").parse_next(parser_input)?;
    let end = parser_input.previous_token_end();

    Ok(Element::HardBreak(HardBreakElement {
        span: Span { start, end },
    }))
}
