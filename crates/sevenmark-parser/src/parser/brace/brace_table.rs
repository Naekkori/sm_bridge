use crate::ast::{Element, Span, TableElement};
use crate::parser::ParserInput;
use crate::parser::brace::table::table_core_parser;
use crate::parser::parameter::parameter_core_parser;
use winnow::Result;
use winnow::combinator::{delimited, opt};
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

pub fn brace_table_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();

    let (parameters, parsed_content) = delimited(
        literal("{{{#table"),
        (opt(parameter_core_parser), table_core_parser),
        literal("}}}"),
    )
    .parse_next(parser_input)?;

    let end = parser_input.previous_token_end();

    Ok(Element::Table(TableElement {
        span: Span { start, end },
        parameters: parameters.unwrap_or_default(),
        children: parsed_content,
    }))
}
