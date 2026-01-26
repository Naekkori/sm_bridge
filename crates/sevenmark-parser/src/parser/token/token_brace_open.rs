use crate::ast::{AstNode, Location, NodeKind};
use crate::parser::ParserInput;
use winnow::Result;
use winnow::combinator::{not, preceded};
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

pub fn token_brace_open_parser(parser_input: &mut ParserInput) -> Result<AstNode> {
    let start = parser_input.input.current_token_start();
    preceded(not(literal("{{{")), literal("{")).parse_next(parser_input)?;
    let end = parser_input.input.previous_token_end();

    Ok(AstNode::new(
        Location { start, end },
        NodeKind::Text {
            value: "{".to_string(),
        },
    ))
}
