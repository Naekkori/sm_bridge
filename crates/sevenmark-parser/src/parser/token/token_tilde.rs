use crate::ast::{AstNode, Location, NodeKind};
use crate::parser::ParserInput;
use winnow::Result;
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

pub fn token_tilde_parser(parser_input: &mut ParserInput) -> Result<AstNode> {
    if parser_input.state.inside_strikethrough && parser_input.input.starts_with("~~") {
        return Err(winnow::error::ContextError::new());
    }

    let start = parser_input.input.current_token_start();
    literal("~").parse_next(parser_input)?;
    let end = parser_input.input.previous_token_end();

    Ok(AstNode::new(
        Location { start, end },
        NodeKind::Text {
            value: "~".to_string(),
        },
    ))
}
