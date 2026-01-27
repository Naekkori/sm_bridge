use crate::ast::{DefineElement, Element, Span};
use crate::parser::ParserInput;
use crate::parser::parameter::parameter_core_parser;
use winnow::Result;
use winnow::ascii::multispace0;
use winnow::combinator::delimited;
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

/// Parse styled elements enclosed in {{{ }}}
pub fn brace_define_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();

    let parameters = delimited(literal("{{{#define"), parameter_core_parser, literal("}}}"))
        .parse_next(parser_input)?;

    let end = parser_input.previous_token_end();

    // consume trailing whitespace to prevent unwanted line breaks
    multispace0.parse_next(parser_input)?;

    Ok(Element::Define(DefineElement {
        span: Span { start, end },
        parameters,
    }))
}
