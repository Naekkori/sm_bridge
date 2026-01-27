use super::category_text::category_text_parser;

use crate::ast::Element;
use crate::parser::ParserInput;
use crate::parser::escape::escape_parser;
use crate::parser::token::{token_brace_close_parser, token_brace_open_parser};
use winnow::Result;
use winnow::combinator::{alt, repeat};
use winnow::prelude::*;

pub fn category_content_parser(parser_input: &mut ParserInput) -> Result<Vec<Element>> {
    repeat(
        1..,
        alt((
            escape_parser,
            // category text
            category_text_parser,
            // Token
            token_brace_open_parser,
            token_brace_close_parser,
        )),
    )
    .parse_next(parser_input)
}
