use crate::ast::Element;
use crate::parser::ParserInput;
use crate::parser::escape::escape_parser;
use crate::parser::r#macro::macro_variable_parser;
use crate::parser::parameter::parameter_text::parameter_text_parser;
use crate::parser::token::{token_bracket_close_parser, token_bracket_open_parser};
use winnow::Result;
use winnow::combinator::{alt, repeat};
use winnow::prelude::*;

/// Parse the content within parameter value quotes
/// Handles both escape sequences and plain text content
/// The literal syntax prioritizes: escaping and text parsing
pub fn parameter_content_parser(parser_input: &mut ParserInput) -> Result<Vec<Element>> {
    repeat(
        1..,
        alt((
            escape_parser,
            parameter_text_parser,
            macro_variable_parser,
            token_bracket_open_parser,
            token_bracket_close_parser,
        )),
    )
    .parse_next(parser_input)
}
