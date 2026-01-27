use serde::Serialize;

use super::{Element, Expression, Parameters, Span};

/// 리스트 요소 {{{#list ...}}}
#[derive(Debug, Clone, Serialize)]
pub struct ListElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub kind: String,
    pub parameters: Parameters,
    pub children: Vec<ListContentItem>,
}

/// 리스트 콘텐츠 아이템 (아이템 또는 조건부)
#[derive(Debug, Clone, Serialize)]
pub enum ListContentItem {
    Item(ListItemElement),
    Conditional(ConditionalListItems),
}

/// 리스트 아이템
#[derive(Debug, Clone, Serialize)]
pub struct ListItemElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub parameters: Parameters,
    pub children: Vec<Element>,
}

/// 조건부 리스트 아이템 ({{{#if condition :: [[item]]...}}})
#[derive(Debug, Clone, Serialize)]
pub struct ConditionalListItems {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub condition: Expression,
    pub items: Vec<ListItemElement>,
}
