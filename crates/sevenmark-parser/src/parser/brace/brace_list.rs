use crate::ast::{Element, ListElement, Span};
use crate::parser::ParserInput;
use crate::parser::brace::list::list_core_parser;
use crate::parser::parameter::parameter_core_parser;
use winnow::Result;
use winnow::combinator::{delimited, opt};
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

pub fn brace_list_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();

    let (parameters, parsed_content) = delimited(
        literal("{{{#list"),
        (opt(parameter_core_parser), list_core_parser),
        literal("}}}"),
    )
    .parse_next(parser_input)?;

    let end = parser_input.previous_token_end();

    let parameters = parameters.unwrap_or_default();

    let kind = ["1", "a", "A", "i", "I"]
        .iter()
        .find(|&&k| parameters.contains_key(k))
        .map(|&k| k.to_string())
        .unwrap_or_default();

    Ok(Element::List(ListElement {
        span: Span { start, end },
        kind,
        parameters,
        children: parsed_content,
    }))
}
