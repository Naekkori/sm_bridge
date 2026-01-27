use crate::ast::{Element, FootnoteRefElement, Span};
use crate::parser::ParserInput;
use winnow::Result;
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

pub fn macro_footnote_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();
    literal("[fn]").parse_next(parser_input)?;
    let end = parser_input.previous_token_end();

    Ok(Element::FootnoteRef(FootnoteRefElement {
        span: Span { start, end },
    }))
}
