use crate::ast::{
    ConditionalTableCells, ConditionalTableRows, Expression, Span, TableCellElement, TableCellItem,
    TableRowElement, TableRowItem,
};
use crate::parser::ParserInput;
use crate::parser::element::element_parser;
use crate::parser::expr::expr_condition::condition_parser;
use crate::parser::parameter::parameter_core_parser;
use crate::parser::utils::with_depth_and_trim;
use winnow::Result;
use winnow::ascii::multispace0;
use winnow::combinator::{alt, delimited, opt, repeat};
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

/// 테이블 내용 파서 - Vec<TableRowItem> 반환
pub fn table_core_parser(parser_input: &mut ParserInput) -> Result<Vec<TableRowItem>> {
    repeat(1.., table_row_child_parser).parse_next(parser_input)
}

/// 테이블 행 아이템 파서 (행 또는 조건부)
fn table_row_child_parser(parser_input: &mut ParserInput) -> Result<TableRowItem> {
    alt((
        table_row_parser.map(TableRowItem::Row),
        table_row_conditional_parser.map(TableRowItem::Conditional),
    ))
    .parse_next(parser_input)
}

/// 테이블 행 레벨 조건부 파서 (전용 파서 - content가 테이블 row임)
/// {{{#if condition :: [[row1]] [[row2]] ... }}}
fn table_row_conditional_parser(parser_input: &mut ParserInput) -> Result<ConditionalTableRows> {
    let start = parser_input.current_token_start();

    // {{{#if 시작
    let _ = (multispace0, literal("{{{#if")).parse_next(parser_input)?;

    // 조건식 파싱 (condition_parser는 선택적 :: 종결자를 처리함)
    let condition: Expression = condition_parser.parse_next(parser_input)?;

    // 테이블 행들 파싱 (0개 이상의 행)
    let rows: Vec<TableRowElement> = repeat(0.., table_row_parser).parse_next(parser_input)?;

    // }}} 종료
    let _ = (multispace0, literal("}}}"), multispace0).parse_next(parser_input)?;

    let end = parser_input.previous_token_end();

    Ok(ConditionalTableRows {
        span: Span { start, end },
        condition,
        rows,
    })
}

/// 테이블 행 파서 - TableRowElement 반환
fn table_row_parser(parser_input: &mut ParserInput) -> Result<TableRowElement> {
    let start = parser_input.current_token_start();

    let (_, (parameters, parsed_content), _) = (
        multispace0,
        delimited(
            literal("[["),
            (
                opt(parameter_core_parser),
                repeat(1.., table_cell_child_parser),
            ),
            literal("]]"),
        ),
        multispace0,
    )
        .parse_next(parser_input)?;

    let end = parser_input.previous_token_end();

    Ok(TableRowElement {
        span: Span { start, end },
        parameters: parameters.unwrap_or_default(),
        children: parsed_content,
    })
}

/// 테이블 셀 아이템 파서 (셀 또는 조건부)
fn table_cell_child_parser(parser_input: &mut ParserInput) -> Result<TableCellItem> {
    alt((
        table_cell_parser.map(TableCellItem::Cell),
        table_cell_conditional_parser.map(TableCellItem::Conditional),
    ))
    .parse_next(parser_input)
}

/// 테이블 셀 레벨 조건부 파서 (전용 파서 - content가 테이블 cell임)
/// {{{#if condition :: [[cell1]] [[cell2]] ... }}}
fn table_cell_conditional_parser(parser_input: &mut ParserInput) -> Result<ConditionalTableCells> {
    let start = parser_input.current_token_start();

    // {{{#if 시작
    let _ = (multispace0, literal("{{{#if")).parse_next(parser_input)?;

    // 조건식 파싱
    let condition: Expression = condition_parser.parse_next(parser_input)?;

    // 테이블 셀들 파싱 (0개 이상의 셀)
    let cells: Vec<TableCellElement> = repeat(0.., table_cell_parser).parse_next(parser_input)?;

    // }}} 종료
    let _ = (multispace0, literal("}}}"), multispace0).parse_next(parser_input)?;

    let end = parser_input.previous_token_end();

    Ok(ConditionalTableCells {
        span: Span { start, end },
        condition,
        cells,
    })
}

/// 테이블 셀 파서 - TableCellElement 반환
fn table_cell_parser(parser_input: &mut ParserInput) -> Result<TableCellElement> {
    let start = parser_input.current_token_start();

    let (_, ((parameters, _), parsed_content), _) = (
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

    let end = parser_input.previous_token_end();

    let parameters = parameters.unwrap_or_default();

    // x, y
    let x = parameters
        .get("x")
        .map(|p| p.value.clone())
        .unwrap_or_else(Vec::new);
    let y = parameters
        .get("y")
        .map(|p| p.value.clone())
        .unwrap_or_else(Vec::new);

    Ok(TableCellElement {
        span: Span { start, end },
        parameters,
        x,
        y,
        children: parsed_content,
    })
}
