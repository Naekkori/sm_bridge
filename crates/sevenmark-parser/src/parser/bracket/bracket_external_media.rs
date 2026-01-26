use crate::ast::{AstNode, Location, NodeKind};
use crate::parser::ParserInput;
use crate::parser::parameter::parameter_core_parser;
use winnow::Result;
use winnow::combinator::{alt, delimited, opt};
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

/// Parse external media elements: [[#youtube ...]], [[#vimeo ...]], [[#nicovideo ...]], [[#spotify ...]], [[#discord ...]]
pub fn bracket_external_media_parser(parser_input: &mut ParserInput) -> Result<AstNode> {
    let start = parser_input.input.current_token_start();

    let (provider, parameters) = delimited(
        literal("[["),
        (external_media_provider_parser, opt(parameter_core_parser)),
        literal("]]"),
    )
    .parse_next(parser_input)?;

    let end = parser_input.input.previous_token_end();

    Ok(AstNode::new(
        Location { start, end },
        NodeKind::ExternalMedia {
            provider: provider.to_string(),
            parameters: parameters.unwrap_or_default(),
        },
    ))
}

/// Parse external media provider tag: #youtube, #vimeo, #nicovideo, #spotify, #discord
fn external_media_provider_parser<'a>(input: &mut ParserInput<'a>) -> Result<&'a str> {
    alt((
        literal("#youtube").map(|_| "youtube"),
        literal("#vimeo").map(|_| "vimeo"),
        literal("#nicovideo").map(|_| "nicovideo"),
        literal("#spotify").map(|_| "spotify"),
        literal("#discord").map(|_| "discord"),
    ))
    .parse_next(input)
}
