use crate::ast::{Element, RubyElement, Span};
use crate::parser::ParserInput;
use crate::parser::element::element_parser;
use crate::parser::parameter::parameter_core_parser;
use crate::parser::utils::with_depth_and_trim;
use winnow::Result;
use winnow::ascii::multispace0;
use winnow::combinator::{delimited, opt};
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

/// Parse ruby elements enclosed in {{{#ruby }}}
pub fn brace_ruby_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();

    let ((parameters, _), parsed_content) = delimited(
        literal("{{{#ruby"),
        (
            (opt(parameter_core_parser), multispace0),
            |input: &mut ParserInput| with_depth_and_trim(input, element_parser),
        ),
        (multispace0, literal("}}}")),
    )
    .parse_next(parser_input)?;

    let end = parser_input.previous_token_end();

    Ok(Element::Ruby(RubyElement {
        span: Span { start, end },
        parameters: parameters.unwrap_or_default(),
        children: parsed_content,
    }))
}
