use crate::ast::{Element, Span, TeXElement};
use crate::parser::ParserInput;
use crate::parser::parameter::parameter_core_parser;
use winnow::Result;
use winnow::ascii::multispace0;
use winnow::combinator::{delimited, opt};
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::{literal, take_until};

/// Parse TeX elements enclosed in {{{#tex }}}
pub fn brace_tex_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();

    let ((parameters, _), parsed_content) = delimited(
        literal("{{{#tex"),
        (
            (opt(parameter_core_parser), multispace0),
            take_until(0.., "}}}"),
        ),
        literal("}}}"),
    )
    .parse_next(parser_input)?;

    let end = parser_input.previous_token_end();

    let is_block = parameters
        .as_ref()
        .map(|p| p.contains_key("block"))
        .unwrap_or(false);

    Ok(Element::TeX(TeXElement {
        span: Span { start, end },
        is_block,
        value: parsed_content.to_string(),
    }))
}
