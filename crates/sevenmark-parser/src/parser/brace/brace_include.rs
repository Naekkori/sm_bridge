use crate::ast::{Element, IncludeElement, Span};
use crate::parser::ParserInput;
use crate::parser::brace::include::include_content_parser;
use crate::parser::parameter::parameter_core_parser;
use crate::parser::utils::with_depth;
use winnow::Result;
use winnow::ascii::multispace0;
use winnow::combinator::{delimited, opt};
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

pub fn brace_include_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();

    let ((parameters, _), parsed_content) = delimited(
        literal("{{{#include"),
        (
            (opt(parameter_core_parser), multispace0),
            |input: &mut ParserInput| with_depth(input, include_content_parser),
        ),
        literal("}}}"),
    )
    .parse_next(parser_input)?;

    let end = parser_input.previous_token_end();

    // consume trailing whitespace to prevent unwanted line breaks
    multispace0.parse_next(parser_input)?;

    Ok(Element::Include(IncludeElement {
        span: Span { start, end },
        parameters: parameters.unwrap_or_default(),
        children: parsed_content,
    }))
}
