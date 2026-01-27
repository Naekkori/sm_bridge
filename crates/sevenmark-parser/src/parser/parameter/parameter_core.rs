use crate::ast::{Parameter, Parameters, Span};
use crate::parser::ParserInput;
use crate::parser::parameter::parameter_content::parameter_content_parser;
use std::collections::BTreeMap;
use winnow::Result;
use winnow::ascii::{alphanumeric1, multispace0};
use winnow::combinator::{delimited, opt, preceded, repeat, terminated};
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

/// Parse a single parameter in the format #key="value" (spaces around = allowed)
/// The value part is optional - if not provided, an empty Vec is used
fn parameter_parser(parser_input: &mut ParserInput) -> Result<(String, Parameter)> {
    let start = parser_input.current_token_start();

    // Parse: whitespace, #key, optional ="value", whitespace
    let (_, key, value_opt, _) = (
        multispace0,
        preceded(literal('#'), alphanumeric1),
        opt(preceded(
            delimited(multispace0, literal('='), multispace0),
            delimited(literal('"'), parameter_content_parser, literal('"')),
        )),
        multispace0,
    )
        .parse_next(parser_input)?;

    let end = parser_input.previous_token_end();

    let key_string = key.to_string();
    let value = value_opt.unwrap_or_else(Vec::new);

    let parameter = Parameter {
        span: Span { start, end },
        key: key_string.clone(),
        value,
    };

    Ok((key_string, parameter))
}

/// Parse multiple parameters and collect them into a BTreeMap
/// Terminated by an optional "||" followed by whitespace
/// Returns a Parameters map where keys are parameter names and values are SevenMarkElement vectors
pub fn parameter_core_parser(parser_input: &mut ParserInput) -> Result<Parameters> {
    terminated(
        // Parse one or more parameters and directly collect into BTreeMap
        repeat(1.., parameter_parser)
            .map(|pairs: Vec<_>| pairs.into_iter().collect::<BTreeMap<_, _>>()),
        // End marker: optional "||" followed by whitespace
        preceded(opt(literal("||")), multispace0),
    )
    .parse_next(parser_input)
}
