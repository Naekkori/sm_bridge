use super::utils::parse_uuid;
use crate::ast::{Element, MentionElement, MentionType, Span};
use crate::parser::ParserInput;
use winnow::Result;
use winnow::combinator::delimited;
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

/// 토론/문서 멘션 파서 (<#uuid>)
pub fn mention_discussion_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();

    let uuid = delimited(literal("<#"), parse_uuid, literal(">")).parse_next(parser_input)?;

    let end = parser_input.previous_token_end();

    Ok(Element::Mention(MentionElement {
        span: Span { start, end },
        kind: MentionType::Discussion,
        id: uuid,
    }))
}
