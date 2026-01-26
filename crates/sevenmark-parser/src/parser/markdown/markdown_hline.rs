use crate::ast::{AstNode, Location, NodeKind};
use crate::parser::ParserInput;
use winnow::Result;
use winnow::ascii::line_ending;
use winnow::combinator::eof;
use winnow::combinator::{alt, terminated};
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::take_while;

pub fn markdown_hline_parser(parser_input: &mut ParserInput) -> Result<AstNode> {
    let start = parser_input.input.current_token_start();
    terminated(take_while(3..=9, '-'), alt((line_ending, eof))).parse_next(parser_input)?;
    let end = parser_input.input.previous_token_end();

    Ok(AstNode::new(Location { start, end }, NodeKind::HLine))
}
