use serde::Serialize;

use super::{Element, Expression, Parameters, Span};

/// 테이블 요소 {{{#table ...}}}
#[derive(Debug, Clone, Serialize)]
pub struct TableElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub parameters: Parameters,
    pub children: Vec<TableRowItem>,
}

/// 테이블 행 콘텐츠 아이템 (행 또는 조건부)
#[derive(Debug, Clone, Serialize)]
pub enum TableRowItem {
    Row(TableRowElement),
    Conditional(ConditionalTableRows),
}

/// 테이블 행
#[derive(Debug, Clone, Serialize)]
pub struct TableRowElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub parameters: Parameters,
    pub children: Vec<TableCellItem>,
}

/// 테이블 셀 콘텐츠 아이템 (셀 또는 조건부)
#[derive(Debug, Clone, Serialize)]
pub enum TableCellItem {
    Cell(TableCellElement),
    Conditional(ConditionalTableCells),
}

/// 테이블 셀
#[derive(Debug, Clone, Serialize)]
pub struct TableCellElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub parameters: Parameters,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub x: Vec<Element>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub y: Vec<Element>,
    pub children: Vec<Element>,
}

/// 조건부 테이블 행 ({{{#if condition :: [[row]]...}}})
#[derive(Debug, Clone, Serialize)]
pub struct ConditionalTableRows {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub condition: Expression,
    pub rows: Vec<TableRowElement>,
}

/// 조건부 테이블 셀 ({{{#if condition :: [[cell]]...}}})
#[derive(Debug, Clone, Serialize)]
pub struct ConditionalTableCells {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub condition: Expression,
    pub cells: Vec<TableCellElement>,
}
