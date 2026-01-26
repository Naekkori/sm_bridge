use crate::ast::{AstNode, Location, NodeKind};
use crate::parser::ParserInput;
use winnow::Result;
use winnow::ascii::multispace1;
use winnow::combinator::{alt, not, peek};
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

pub fn token_newline_parser(parser_input: &mut ParserInput) -> Result<AstNode> {
    if parser_input.state.inside_header && parser_input.input.starts_with('\n') {
        return Err(winnow::error::ContextError::new());
    }

    // trim 컨텍스트에서 }}} 또는 ]] 앞 whitespace면 실패 (suffix가 처리하도록)
    if parser_input.state.is_trimming() {
        not((multispace1, peek(alt((literal("}}}"), literal("]]")))))).parse_next(parser_input)?;
    }

    let start = parser_input.input.current_token_start();
    literal("\n").parse_next(parser_input)?;
    let end = parser_input.input.previous_token_end();

    Ok(AstNode::new(Location { start, end }, NodeKind::SoftBreak))
}
