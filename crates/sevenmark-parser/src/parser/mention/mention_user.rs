use super::utils::parse_uuid;
use crate::ast::{AstNode, Location, MentionType, NodeKind};
use crate::parser::ParserInput;
use winnow::Result;
use winnow::combinator::delimited;
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

/// 사용자 멘션 파서 (<@uuid>)
pub fn mention_user_parser(parser_input: &mut ParserInput) -> Result<AstNode> {
    let start = parser_input.input.current_token_start();

    let uuid = delimited(literal("<@"), parse_uuid, literal(">")).parse_next(parser_input)?;

    let end = parser_input.input.previous_token_end();

    Ok(AstNode::new(
        Location { start, end },
        NodeKind::Mention {
            kind: MentionType::User,
            id: uuid,
        },
    ))
}
