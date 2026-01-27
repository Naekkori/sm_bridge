use crate::ast::{Element, HLineElement, Span};
use crate::parser::ParserInput;
use winnow::Result;
use winnow::ascii::line_ending;
use winnow::combinator::eof;
use winnow::combinator::{alt, terminated};
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::take_while;

pub fn markdown_hline_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();
    terminated(take_while(3..=9, '-'), alt((line_ending, eof))).parse_next(parser_input)?;
    let end = parser_input.previous_token_end();

    Ok(Element::HLine(HLineElement {
        span: Span { start, end },
    }))
}
