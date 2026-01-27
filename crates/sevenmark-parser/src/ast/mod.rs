//! AST (Abstract Syntax Tree) definitions for SevenMark
//!
//! This module contains all AST element definitions organized into submodules:
//! - `span`: Span and Parameter types
//! - `expression`: Expression AST for conditionals
//! - `elements`: Individual element structs
//! - `table`: Table-related structures
//! - `list`: List-related structures
//! - `traversable`: Traversable trait and implementation

mod elements;
mod expression;
mod list;
mod span;
mod table;
mod traversable;

// Re-export all public types
pub use elements::*;
pub use expression::*;
pub use list::*;
pub use span::*;
pub use table::*;
pub use traversable::*;

use serde::Serialize;

// === Helper types ===

/// 멘션 타입
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub enum MentionType {
    /// 토론/문서 멘션 (<#uuid>)
    Discussion,
    /// 사용자 멘션 (<@uuid>)
    User,
}

/// 파일 resolve 결과 (DB에서 실제 URL을 가져옴)
#[derive(Debug, Clone, Serialize, Default)]
pub struct ResolvedFile {
    pub url: String,
    pub is_valid: bool,
    /// 이미지 너비 (CLS 개선용)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<u32>,
    /// 이미지 높이 (CLS 개선용)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<u32>,
}

/// 문서/카테고리 resolve 결과 (title만 저장, URL은 렌더러에서 조립)
#[derive(Debug, Clone, Serialize, Default)]
pub struct ResolvedDoc {
    pub title: String,
    pub is_valid: bool,
}

/// MediaElement resolve 결과
/// file, document, category, url 각각 독립적으로 처리
/// href 우선순위: url > document > category
#[derive(Debug, Clone, Serialize, Default)]
pub struct ResolvedMediaInfo {
    /// #file 참조 결과 (이미지 표시용, DB에서 실제 URL)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file: Option<ResolvedFile>,
    /// #document 참조 결과 (title만, URL은 렌더러에서 조립)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub document: Option<ResolvedDoc>,
    /// #category 참조 결과 (title만, URL은 렌더러에서 조립)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<ResolvedDoc>,
    /// #url 외부 링크
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

/// 메인 SevenMark AST Element enum
#[derive(Debug, Clone, Serialize)]
pub enum Element {
    // Basic text elements
    Text(TextElement),
    Comment(CommentElement),
    Escape(EscapeElement),
    Error(ErrorElement),

    // Block elements
    Literal(LiteralElement),
    Define(DefineElement),
    Styled(StyledElement),
    Table(TableElement),
    List(ListElement),
    Fold(FoldElement),
    BlockQuote(BlockQuoteElement),
    Ruby(RubyElement),
    Footnote(FootnoteElement),
    Code(CodeElement),
    TeX(TeXElement),

    // Wiki elements
    Include(IncludeElement),
    Category(CategoryElement),
    Redirect(RedirectElement),

    // Media
    Media(MediaElement),
    ExternalMedia(ExternalMediaElement),

    // Macros (leaf nodes)
    Null(NullElement),
    FootnoteRef(FootnoteRefElement),
    TimeNow(TimeNowElement),
    Age(AgeElement),
    Variable(VariableElement),
    Mention(MentionElement),

    // Text styles
    Bold(TextStyleElement),
    Italic(TextStyleElement),
    Strikethrough(TextStyleElement),
    Underline(TextStyleElement),
    Superscript(TextStyleElement),
    Subscript(TextStyleElement),

    // Line elements
    SoftBreak(SoftBreakElement),
    HardBreak(HardBreakElement),
    HLine(HLineElement),
    Header(HeaderElement),

    // Conditional
    If(IfElement),
}

impl Element {
    /// Returns the span of this element
    pub fn span(&self) -> &Span {
        match self {
            Element::Text(e) => &e.span,
            Element::Comment(e) => &e.span,
            Element::Escape(e) => &e.span,
            Element::Error(e) => &e.span,
            Element::Literal(e) => &e.span,
            Element::Define(e) => &e.span,
            Element::Styled(e) => &e.span,
            Element::Table(e) => &e.span,
            Element::List(e) => &e.span,
            Element::Fold(e) => &e.span,
            Element::BlockQuote(e) => &e.span,
            Element::Ruby(e) => &e.span,
            Element::Footnote(e) => &e.span,
            Element::Code(e) => &e.span,
            Element::TeX(e) => &e.span,
            Element::Include(e) => &e.span,
            Element::Category(e) => &e.span,
            Element::Redirect(e) => &e.span,
            Element::Media(e) => &e.span,
            Element::ExternalMedia(e) => &e.span,
            Element::Null(e) => &e.span,
            Element::FootnoteRef(e) => &e.span,
            Element::TimeNow(e) => &e.span,
            Element::Age(e) => &e.span,
            Element::Variable(e) => &e.span,
            Element::Mention(e) => &e.span,
            Element::Bold(e)
            | Element::Italic(e)
            | Element::Strikethrough(e)
            | Element::Underline(e)
            | Element::Superscript(e)
            | Element::Subscript(e) => &e.span,
            Element::SoftBreak(e) => &e.span,
            Element::HardBreak(e) => &e.span,
            Element::HLine(e) => &e.span,
            Element::Header(e) => &e.span,
            Element::If(e) => &e.span,
        }
    }
}
