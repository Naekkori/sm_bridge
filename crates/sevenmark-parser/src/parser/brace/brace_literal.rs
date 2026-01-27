use crate::ast::{Element, LiteralElement, Span};
use crate::parser::ParserInput;
use crate::parser::brace::literal::literal_content_parser;
use crate::parser::utils::with_depth_and_trim;
use winnow::Result;
use winnow::ascii::multispace0;
use winnow::combinator::delimited;
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

/// Parse literal elements enclosed in {{{ }}}
pub fn brace_literal_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();

    let (_, parsed_content) = delimited(
        literal("{{{"),
        (multispace0, |input: &mut ParserInput| {
            with_depth_and_trim(input, literal_content_parser)
        }),
        (multispace0, literal("}}}")),
    )
    .parse_next(parser_input)?;

    let end = parser_input.previous_token_end();

    Ok(Element::Literal(LiteralElement {
        span: Span { start, end },
        children: parsed_content,
    }))
}
