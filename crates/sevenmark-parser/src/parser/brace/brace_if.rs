use crate::ast::{Element, IfElement, Span};
use crate::parser::ParserInput;
use crate::parser::element::element_parser;
use crate::parser::expr::condition_parser;
use crate::parser::utils::with_depth_and_trim;
use winnow::Result;
use winnow::ascii::multispace0;
use winnow::combinator::delimited;
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

/// Parse if conditional elements: {{{#if condition :: content}}}
pub fn brace_if_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();

    let (condition, parsed_content) = delimited(
        literal("{{{#if"),
        (condition_parser, |input: &mut ParserInput| {
            with_depth_and_trim(input, element_parser)
        }),
        (multispace0, literal("}}}")),
    )
    .parse_next(parser_input)?;

    let end = parser_input.previous_token_end();

    Ok(Element::If(IfElement {
        span: Span { start, end },
        condition,
        children: parsed_content,
    }))
}
