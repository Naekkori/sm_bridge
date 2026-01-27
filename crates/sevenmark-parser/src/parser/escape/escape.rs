use crate::ast::{Element, EscapeElement, Span};
use crate::parser::ParserInput;
use winnow::Result;
use winnow::combinator::preceded;
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::{any, literal};

pub fn escape_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();
    let parsed_content = preceded(literal("\\"), any).parse_next(parser_input)?;
    let end = parser_input.previous_token_end();

    Ok(Element::Escape(EscapeElement {
        span: Span { start, end },
        value: parsed_content.to_string(),
    }))
}
