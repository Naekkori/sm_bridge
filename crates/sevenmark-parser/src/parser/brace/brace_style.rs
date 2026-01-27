use crate::ast::{Element, Span, StyledElement};
use crate::parser::ParserInput;
use crate::parser::element::element_parser;
use crate::parser::parameter::parameter_core_parser;
use crate::parser::utils::with_depth_and_trim;
use winnow::Result;
use winnow::ascii::multispace0;
use winnow::combinator::delimited;
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

/// Parse styled elements enclosed in {{{ }}}
pub fn brace_style_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();

    let (parameters, parsed_content) = delimited(
        literal("{{{"),
        (parameter_core_parser, |input: &mut ParserInput| {
            with_depth_and_trim(input, element_parser)
        }),
        (multispace0, literal("}}}")),
    )
    .parse_next(parser_input)?;

    let end = parser_input.previous_token_end();

    Ok(Element::Styled(StyledElement {
        span: Span { start, end },
        parameters,
        children: parsed_content,
    }))
}
