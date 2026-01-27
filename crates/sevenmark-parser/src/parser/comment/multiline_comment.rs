use crate::ast::{CommentElement, Element, Span};
use crate::parser::ParserInput;
use winnow::Result;
use winnow::combinator::delimited;
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::{literal, take_until};

/// Parse multiline comments delimited by /* and */
/// Takes all content between the delimiters
pub fn multiline_comment_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();

    let content =
        delimited(literal("/*"), take_until(0.., "*/"), literal("*/")).parse_next(parser_input)?;

    let end = parser_input.previous_token_end();

    Ok(Element::Comment(CommentElement {
        span: Span { start, end },
        value: content.to_string(),
    }))
}
