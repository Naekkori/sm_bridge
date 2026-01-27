use crate::ast::{CommentElement, Element, Span};
use crate::parser::ParserInput;
use winnow::Result;
use winnow::ascii::line_ending;
use winnow::combinator::{alt, eof, opt, terminated};
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::{literal, take_till};

/// Parse inline comments starting with "//"
/// Comments continue until end of line or end of file
pub fn inline_comment_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();

    let (_, content_opt) = (
        literal("//"),
        terminated(
            opt(take_till(0.., |c: char| c == '\n')),
            alt((line_ending, eof)),
        ),
    )
        .parse_next(parser_input)?;

    let end = parser_input.previous_token_end();
    let content = content_opt.unwrap_or("").to_string();

    Ok(Element::Comment(CommentElement {
        span: Span { start, end },
        value: content,
    }))
}
