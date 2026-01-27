use crate::ast::{Element, Span, TextStyleElement};
use crate::parser::ParserInput;
use crate::parser::element::element_parser;
use crate::parser::utils::with_depth;
use winnow::Result;
use winnow::combinator::delimited;
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

pub fn markdown_strikethrough_parser(parser_input: &mut ParserInput) -> Result<Element> {
    if parser_input.state.inside_strikethrough {
        return Err(winnow::error::ContextError::new());
    }
    let start = parser_input.current_token_start();
    let parsed_content = delimited(
        literal("~~"),
        |input: &mut ParserInput| {
            input.state.set_strikethrough_context();
            let result = with_depth(input, element_parser);
            input.state.unset_strikethrough_context();
            result
        },
        literal("~~"),
    )
    .parse_next(parser_input)?;
    let end = parser_input.previous_token_end();

    Ok(Element::Strikethrough(TextStyleElement {
        span: Span { start, end },
        children: parsed_content,
    }))
}
