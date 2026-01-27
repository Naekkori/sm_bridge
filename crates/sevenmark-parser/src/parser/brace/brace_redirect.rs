use crate::ast::{Element, RedirectElement, Span};
use crate::parser::ParserInput;
use crate::parser::brace::redirect::redirect_content_parser;
use crate::parser::parameter::parameter_core_parser;
use crate::parser::utils::with_depth;
use winnow::Result;
use winnow::ascii::multispace0;
use winnow::combinator::{delimited, opt};
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

pub fn brace_redirect_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();

    let ((parameters, _), parsed_content) = delimited(
        literal("{{{#redirect"),
        (
            (opt(parameter_core_parser), multispace0),
            |input: &mut ParserInput| with_depth(input, redirect_content_parser),
        ),
        literal("}}}"),
    )
    .parse_next(parser_input)?;

    let end = parser_input.previous_token_end();

    Ok(Element::Redirect(RedirectElement {
        span: Span { start, end },
        parameters: parameters.unwrap_or_default(),
        children: parsed_content,
    }))
}
