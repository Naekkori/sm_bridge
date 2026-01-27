use crate::ast::{Element, Span, TextElement};
use crate::parser::ParserInput;
use winnow::Result;
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::take_while;

pub fn include_text_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();
    let parsed_content =
        take_while(1.., |c: char| !matches!(c, '{' | '}' | '\\')).parse_next(parser_input)?;
    let end = parser_input.previous_token_end();

    Ok(Element::Text(TextElement {
        span: Span { start, end },
        value: parsed_content.to_string(),
    }))
}
