use crate::ast::{AstNode, Location, NodeKind};
use crate::parser::ParserInput;
use crate::parser::parameter::parameter_core_parser;
use winnow::Result;
use winnow::ascii::multispace0;
use winnow::combinator::{delimited, opt};
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::{literal, take_until};

pub fn brace_code_parser(parser_input: &mut ParserInput) -> Result<AstNode> {
    let start = parser_input.input.current_token_start();

    let ((parameters, _), parsed_content) = delimited(
        literal("{{{#code"),
        (
            (opt(parameter_core_parser), multispace0),
            take_until(0.., "}}}"),
        ),
        literal("}}}"),
    )
    .parse_next(parser_input)?;

    let end = parser_input.input.previous_token_end();

    Ok(AstNode::new(
        Location { start, end },
        NodeKind::Code {
            parameters: parameters.unwrap_or_default(),
            value: parsed_content.to_string(),
        },
    ))
}
