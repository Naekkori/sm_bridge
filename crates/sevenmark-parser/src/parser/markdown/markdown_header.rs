use crate::ast::{AstNode, Location, NodeKind};
use crate::parser::ParserInput;
use crate::parser::element::element_parser;
use crate::parser::utils::with_depth;
use winnow::Result;
use winnow::ascii::line_ending;
use winnow::combinator::eof;
use winnow::combinator::{alt, opt, terminated};
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::{literal, take_while};

/// 헤더 파서 - # Header (1-6개의 # 지원, ! 폴딩 지원)
pub fn markdown_header_parser(parser_input: &mut ParserInput) -> Result<AstNode> {
    if parser_input.state.current_depth() > 0 {
        return Err(winnow::error::ContextError::new());
    }

    // Check if current position is at line start
    let current_pos = parser_input.input.current_token_start();
    if !parser_input.state.is_at_line_start(current_pos) {
        return Err(winnow::error::ContextError::new());
    }

    /*
    if parser_input.state.inside_header {
        return Err(winnow::error::ContextError::new());
    }
    */
    let start = parser_input.input.current_token_start();
    let (header_marks, is_folded, _, parsed_content) = (
        take_while(1..=6, '#'),
        opt(literal('!')),
        opt(literal(' ')),
        terminated(
            |input: &mut ParserInput| {
                input.state.set_header_context();
                let result = with_depth(input, element_parser);
                input.state.unset_header_context();
                result
            },
            alt((line_ending, eof)),
        ),
    )
        .parse_next(parser_input)?;

    let end = parser_input.input.previous_token_end();
    let header_level = header_marks.len();
    let is_folded = is_folded.is_some();
    let section_index = parser_input.state.next_section_index();

    Ok(AstNode::new(
        Location { start, end },
        NodeKind::Header {
            level: header_level,
            is_folded,
            section_index,
            children: parsed_content,
        },
    ))
}
