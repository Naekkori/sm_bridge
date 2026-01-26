use crate::ast::{AstNode, Location, NodeKind};
use crate::parser::ParserInput;
use crate::parser::brace::fold::fold_core_parser;
use crate::parser::parameter::parameter_core_parser;
use winnow::Result;
use winnow::combinator::{delimited, opt};
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

pub fn brace_fold_parser(parser_input: &mut ParserInput) -> Result<AstNode> {
    let start = parser_input.input.current_token_start();

    let (parameters, parsed_content) = delimited(
        literal("{{{#fold"),
        (opt(parameter_core_parser), fold_core_parser),
        literal("}}}"),
    )
    .parse_next(parser_input)?;

    let end = parser_input.input.previous_token_end();

    Ok(AstNode::new(
        Location { start, end },
        NodeKind::Fold {
            parameters: parameters.unwrap_or_default(),
            children: (Box::new(parsed_content.0), Box::new(parsed_content.1)),
        },
    ))
}
