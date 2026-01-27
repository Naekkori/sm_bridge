use serde::Serialize;

use super::{Element, Expression, MentionType, Parameters, ResolvedMediaInfo, Span};

// === Leaf nodes (span only) ===

/// Null 매크로 [null]
#[derive(Debug, Clone, Serialize)]
pub struct NullElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
}

/// 각주 위치 [fn]
#[derive(Debug, Clone, Serialize)]
pub struct FootnoteRefElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
}

/// 현재 시간 [now]
#[derive(Debug, Clone, Serialize)]
pub struct TimeNowElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
}

/// 소프트 브레이크 (줄바꿈)
#[derive(Debug, Clone, Serialize)]
pub struct SoftBreakElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
}

/// 하드 브레이크 [br]
#[derive(Debug, Clone, Serialize)]
pub struct HardBreakElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
}

/// 수평선 ----
#[derive(Debug, Clone, Serialize)]
pub struct HLineElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
}

// === Text-carrying leaf nodes ===

/// 텍스트 요소
#[derive(Debug, Clone, Serialize)]
pub struct TextElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub value: String,
}

/// 주석 요소
#[derive(Debug, Clone, Serialize)]
pub struct CommentElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub value: String,
}

/// 이스케이프 요소
#[derive(Debug, Clone, Serialize)]
pub struct EscapeElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub value: String,
}

/// 에러 요소 (파싱 실패한 내용)
#[derive(Debug, Clone, Serialize)]
pub struct ErrorElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub value: String,
}

// === Inline containers ===

/// 텍스트 스타일 (Bold, Italic, Strikethrough, Underline, Superscript, Subscript 공유)
#[derive(Debug, Clone, Serialize)]
pub struct TextStyleElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub children: Vec<Element>,
}

// === Block elements ===

/// 리터럴 {{{ content }}}
#[derive(Debug, Clone, Serialize)]
pub struct LiteralElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub children: Vec<Element>,
}

/// 변수 정의 {{{#define #varname="value" ...}}}
#[derive(Debug, Clone, Serialize)]
pub struct DefineElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub parameters: Parameters,
}

/// 스타일 적용 {{{#style="..." content}}}
#[derive(Debug, Clone, Serialize)]
pub struct StyledElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub parameters: Parameters,
    pub children: Vec<Element>,
}

/// 인용 블록 {{{#blockquote ...}}}
#[derive(Debug, Clone, Serialize)]
pub struct BlockQuoteElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub parameters: Parameters,
    pub children: Vec<Element>,
}

/// 루비 텍스트 {{{#ruby ...}}}
#[derive(Debug, Clone, Serialize)]
pub struct RubyElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub parameters: Parameters,
    pub children: Vec<Element>,
}

/// 각주 {{{#footnote ...}}}
#[derive(Debug, Clone, Serialize)]
pub struct FootnoteElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub footnote_index: usize,
    pub parameters: Parameters,
    pub children: Vec<Element>,
}

/// 코드 블록 {{{#code ...}}}
#[derive(Debug, Clone, Serialize)]
pub struct CodeElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub parameters: Parameters,
    pub value: String,
}

/// TeX 수식 $ ... $ 또는 $$ ... $$
#[derive(Debug, Clone, Serialize)]
pub struct TeXElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub is_block: bool,
    pub value: String,
}

/// 폴드 내부 요소
#[derive(Debug, Clone, Serialize)]
pub struct FoldInnerElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub parameters: Parameters,
    pub children: Vec<Element>,
}

/// 폴드/접기 {{{#fold ...}}}
#[derive(Debug, Clone, Serialize)]
pub struct FoldElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub parameters: Parameters,
    pub summary: FoldInnerElement,
    pub details: FoldInnerElement,
}

// === Wiki elements ===

/// 포함 {{{#include ...}}}
#[derive(Debug, Clone, Serialize)]
pub struct IncludeElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub parameters: Parameters,
    pub children: Vec<Element>,
}

/// 카테고리 {{{#category ...}}}
#[derive(Debug, Clone, Serialize)]
pub struct CategoryElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub children: Vec<Element>,
}

/// 리다이렉트 {{{#redirect ...}}}
#[derive(Debug, Clone, Serialize)]
pub struct RedirectElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub parameters: Parameters,
    pub children: Vec<Element>,
}

// === Media ===

/// 미디어 [[...]]
#[derive(Debug, Clone, Serialize)]
pub struct MediaElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub parameters: Parameters,
    pub children: Vec<Element>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resolved_info: Option<ResolvedMediaInfo>,
}

/// 외부 미디어 [[#youtube ...]], [[#vimeo ...]], [[#nicovideo ...]], [[#spotify ...]]
#[derive(Debug, Clone, Serialize)]
pub struct ExternalMediaElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub provider: String,
    pub parameters: Parameters,
}

// === Macros ===

/// 나이 계산 [age(...)]
#[derive(Debug, Clone, Serialize)]
pub struct AgeElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub date: String,
}

/// 변수 참조 [var(...)]
#[derive(Debug, Clone, Serialize)]
pub struct VariableElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub name: String,
}

/// 멘션 <@uuid> 또는 <#uuid>
#[derive(Debug, Clone, Serialize)]
pub struct MentionElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub kind: MentionType,
    pub id: String,
}

// === Headers ===

/// 헤더 = Title =
#[derive(Debug, Clone, Serialize)]
pub struct HeaderElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub level: usize,
    pub is_folded: bool,
    pub section_index: usize,
    pub children: Vec<Element>,
}

// === Conditional ===

/// If 조건문 {{{#if condition :: content}}}
#[derive(Debug, Clone, Serialize)]
pub struct IfElement {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub condition: Expression,
    pub children: Vec<Element>,
}
