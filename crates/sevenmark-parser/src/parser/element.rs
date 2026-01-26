use super::escape::escape_parser;
use super::markdown::{
    markdown_bold_parser, markdown_header_parser, markdown_hline_parser, markdown_italic_parser,
    markdown_strikethrough_parser, markdown_subscript_parser, markdown_superscript_parser,
    markdown_underline_parser,
};
use super::mention::{mention_discussion_parser, mention_user_parser};
use super::text::text_parser;
use super::token::*;

use crate::ast::AstNode;
use crate::parser::ParserInput;
use crate::parser::brace::{
    brace_blockquote_parser, brace_category_parser, brace_code_parser, brace_define_parser,
    brace_fold_parser, brace_footnote_parser, brace_if_parser, brace_include_parser,
    brace_list_parser, brace_literal_parser, brace_ruby_parser, brace_style_parser,
    brace_table_parser, brace_tex_parser,
};
use crate::parser::bracket::{bracket_external_media_parser, bracket_media_parser};
use crate::parser::comment::{inline_comment_parser, multiline_comment_parser};
use crate::parser::r#macro::{
    macro_age_parser, macro_footnote_parser, macro_newline_parser, macro_now_parser,
    macro_null_parser, macro_variable_parser,
};
use winnow::Result;
use winnow::combinator::{alt, dispatch, peek, repeat};
use winnow::prelude::*;
use winnow::token::any;

pub fn element_parser(parser_input: &mut ParserInput) -> Result<Vec<AstNode>> {
    repeat(
        1..,
        dispatch! {peek(any);
            '\\' => alt((escape_parser, token_backslash_parser)),
            '/' => alt((multiline_comment_parser, inline_comment_parser, token_slash)),
            '{' => alt((
                brace_include_parser,
                brace_category_parser,
                brace_if_parser,
                brace_table_parser,
                brace_list_parser,
                brace_fold_parser,
                brace_footnote_parser,
                brace_blockquote_parser,
                brace_ruby_parser,
                brace_code_parser,
                brace_tex_parser,
                brace_define_parser,
                brace_style_parser,
                brace_literal_parser,
                token_brace_open_parser,
            )),
            '}' => token_brace_close_parser,
            '[' => alt((
                bracket_external_media_parser,
                bracket_media_parser,
                macro_now_parser,
                macro_newline_parser,
                macro_variable_parser,
                macro_age_parser,
                macro_footnote_parser,
                macro_null_parser,
                token_bracket_open_parser,
            )),
            ']' => token_bracket_close_parser,
            '<' => alt((mention_discussion_parser, mention_user_parser, token_angle_bracket_parser)),
            '#' => alt((markdown_header_parser, text_parser)),
            '-' => alt((markdown_hline_parser, text_parser)),
            '*' => alt((markdown_bold_parser, markdown_italic_parser, token_asterisk_parser)),
            '_' => alt((markdown_underline_parser, token_underscore_parser)),
            '~' => alt((markdown_strikethrough_parser, token_tilde_parser)),
            '^' => alt((markdown_superscript_parser, token_caret_parser)),
            ',' => alt((markdown_subscript_parser, token_comma_parser)),
            '\n' => token_newline_parser,
            _ => text_parser,
        },
    )
    .parse_next(parser_input)
}
