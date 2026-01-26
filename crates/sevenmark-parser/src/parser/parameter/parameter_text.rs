use crate::ast::{AstNode, Location, NodeKind};
use crate::parser::ParserInput;
use winnow::Result;
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::take_while;

/// Parse plain text content within parameter values
/// Reads all characters except for quotes ("), (\[), (\]) and backslashes (\)
/// which are handled by escape sequences or mark the end of parameter values
pub fn parameter_text_parser(parser_input: &mut ParserInput) -> Result<AstNode> {
    let start = parser_input.input.current_token_start();
    // Take all characters except quotes and backslashes
    let parsed_content =
        take_while(1.., |c: char| !matches!(c, '"' | '\\' | '[' | ']')).parse_next(parser_input)?;
    let end = parser_input.input.previous_token_end();

    Ok(AstNode::new(
        Location { start, end },
        NodeKind::Text {
            value: parsed_content.to_string(),
        },
    ))
}
