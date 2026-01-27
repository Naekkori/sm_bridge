use crate::ast::{Element, MediaElement, Span};
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

/// Parse media elements enclosed in [[ ]] with parameters
pub fn bracket_media_parser(parser_input: &mut ParserInput) -> Result<Element> {
    // MediaElement 중첩 방지
    if parser_input.state.inside_media_element {
        return Err(winnow::error::ContextError::new());
    }

    let start = parser_input.current_token_start();

    let (parameters, parsed_content) = delimited(
        literal("[["),
        (opt(parameter_core_parser), |input: &mut ParserInput| {
            opt(|inner_input: &mut ParserInput| {
                inner_input.state.set_media_element_context();
                let result = with_depth_and_trim(inner_input, element_parser);
                inner_input.state.unset_media_element_context();
                result
            })
            .parse_next(input)
        }),
        (multispace0, literal("]]")),
    )
    .parse_next(parser_input)?;

    let end = parser_input.previous_token_end();

    Ok(Element::Media(MediaElement {
        span: Span { start, end },
        parameters: parameters.unwrap_or_default(),
        children: parsed_content.unwrap_or_default(),
        resolved_info: None,
    }))
}
