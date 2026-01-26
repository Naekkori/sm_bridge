use super::super::super::element::element_parser;
use super::super::super::parameter::parameter_core_parser;

use crate::ast::{AstNode, Location, NodeKind};
use crate::parser::ParserInput;
use crate::parser::utils::with_depth_and_trim;
use winnow::Result;
use winnow::ascii::multispace0;
use winnow::combinator::{delimited, opt};
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

/// Fold 내용 파서 - (AstNode, AstNode) 튜플 반환 (각 kind = FoldInner)
pub fn fold_core_parser(parser_input: &mut ParserInput) -> Result<(AstNode, AstNode)> {
    // 첫 번째 FoldInner
    let start_1 = parser_input.input.current_token_start();
    let (_, ((parameters_1, _), parsed_content_1), _) = (
        multispace0,
        delimited(
            literal("[["),
            (
                (opt(parameter_core_parser), multispace0),
                |input: &mut ParserInput| with_depth_and_trim(input, element_parser),
            ),
            (multispace0, literal("]]")),
        ),
        multispace0,
    )
        .parse_next(parser_input)?;
    let end_1 = parser_input.input.previous_token_end();

    // 두 번째 FoldInner
    let start_2 = parser_input.input.current_token_start();
    let (_, ((parameters_2, _), parsed_content_2), _) = (
        multispace0,
        delimited(
            literal("[["),
            (
                (opt(parameter_core_parser), multispace0),
                |input: &mut ParserInput| with_depth_and_trim(input, element_parser),
            ),
            (multispace0, literal("]]")),
        ),
        multispace0,
    )
        .parse_next(parser_input)?;
    let end_2 = parser_input.input.previous_token_end();

    let fold_inner_1 = AstNode::new(
        Location {
            start: start_1,
            end: end_1,
        },
        NodeKind::FoldInner {
            parameters: parameters_1.unwrap_or_default(),
            children: parsed_content_1,
        },
    );

    let fold_inner_2 = AstNode::new(
        Location {
            start: start_2,
            end: end_2,
        },
        NodeKind::FoldInner {
            parameters: parameters_2.unwrap_or_default(),
            children: parsed_content_2,
        },
    );

    Ok((fold_inner_1, fold_inner_2))
}
