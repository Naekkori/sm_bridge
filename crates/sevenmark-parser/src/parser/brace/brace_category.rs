use crate::ast::{CategoryElement, Element, Span};
use crate::parser::ParserInput;
use crate::parser::brace::category::category_content_parser;
use crate::parser::utils::with_depth;
use winnow::Result;
use winnow::ascii::multispace0;
use winnow::combinator::delimited;
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

pub fn brace_category_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();

    let (_, parsed_content) = delimited(
        literal("{{{#category"),
        (multispace0, |input: &mut ParserInput| {
            with_depth(input, category_content_parser)
        }),
        literal("}}}"),
    )
    .parse_next(parser_input)?;

    let end = parser_input.previous_token_end();

    // consume trailing whitespace to prevent unwanted line breaks
    multispace0.parse_next(parser_input)?;

    Ok(Element::Category(CategoryElement {
        span: Span { start, end },
        children: parsed_content,
    }))
}
