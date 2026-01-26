use crate::ast::AstNode;
use crate::parser::ParserInput;
use crate::parser::brace::brace_literal_parser;
use crate::parser::brace::literal::literal_text::literal_text_parser;
use crate::parser::escape::escape_parser;
use crate::parser::token::{
    token_brace_close_parser, token_brace_open_parser, token_newline_parser,
};
use winnow::Result;
use winnow::combinator::{alt, repeat};
use winnow::prelude::*;

/// Parse content within literal braces
/// Priority in literal syntax: escaping, brace_literal (for recursion), text parsing
pub fn literal_content_parser(parser_input: &mut ParserInput) -> Result<Vec<AstNode>> {
    repeat(
        1..,
        alt((
            escape_parser,
            brace_literal_parser,
            // literal text
            literal_text_parser,
            // Token
            token_newline_parser,
            token_brace_open_parser,
            token_brace_close_parser,
        )),
    )
    .parse_next(parser_input)
}
