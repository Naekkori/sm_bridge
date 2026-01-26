//! AST (Abstract Syntax Tree) definitions for SevenMark
//!
//! This module contains all AST element definitions organized into submodules:
//! - `location`: Location and Parameter types
//! - `expression`: Expression AST for conditionals
//! - `traversable`: Traversable trait and implementation
//!
//! All AST nodes use the unified `AstNode { location, kind: NodeKind }` pattern.

mod expression;
mod location;
mod traversable;

// Re-export all public types
pub use expression::*;
pub use location::*;
pub use traversable::*;

use serde::Serialize;

// === Helper types (formerly in elements.rs) ===

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

/// 모든 AST 노드의 기본 구조
/// - location: 소스 코드 위치 (항상 존재)
/// - kind: 노드 종류
#[derive(Debug, Clone, Serialize)]
pub struct AstNode {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub location: Location,
    pub kind: NodeKind,
}

impl AstNode {
    /// Creates a new AstNode with the given location and kind
    pub fn new(location: Location, kind: NodeKind) -> Self {
        Self { location, kind }
    }

    /// Returns the location of this node
    pub fn location(&self) -> &Location {
        &self.location
    }
}

/// 노드 종류
/// - 자식 있는 variant: `children` 필드
/// - 자식 없는 variant: unit variant (필드 없음)
/// - 텍스트 컨텐츠: `value` 필드
#[derive(Debug, Clone, Serialize)]
pub enum NodeKind {
    // === Basic text (leaf nodes) ===
    /// 일반 텍스트
    Text { value: String },
    /// 주석
    Comment { value: String },
    /// 이스케이프 시퀀스
    Escape { value: String },
    /// 파싱 에러
    Error { value: String },

    // === Block elements ===
    /// 리터럴 {{{ content }}}
    Literal { children: Vec<AstNode> },
    /// 변수 정의 {{{#define #varname="value" ...}}}
    Define { parameters: Parameters },
    /// 스타일 적용 {{{#style="..." content}}}
    Styled {
        parameters: Parameters,
        children: Vec<AstNode>,
    },
    /// 테이블 {{{#table ...}}}
    /// children은 TableRow 또는 ConditionalTableRows 노드
    Table {
        parameters: Parameters,
        children: Vec<AstNode>,
    },
    /// 테이블 행 (Table의 직접 자식)
    /// children은 TableCell 또는 ConditionalTableCells 노드
    TableRow {
        parameters: Parameters,
        children: Vec<AstNode>,
    },
    /// 테이블 셀 (TableRow의 직접 자식)
    TableCell {
        parameters: Parameters,
        #[serde(skip_serializing_if = "Vec::is_empty")]
        x: Vec<AstNode>,
        #[serde(skip_serializing_if = "Vec::is_empty")]
        y: Vec<AstNode>,
        children: Vec<AstNode>,
    },
    /// 조건부 테이블 행 ({{{#if condition :: [[row]]...}}})
    /// children은 TableRow 노드
    ConditionalTableRows {
        condition: Box<AstNode>,
        children: Vec<AstNode>,
    },
    /// 조건부 테이블 셀 ({{{#if condition :: [[cell]]...}}})
    /// children은 TableCell 노드
    ConditionalTableCells {
        condition: Box<AstNode>,
        children: Vec<AstNode>,
    },
    /// 리스트 {{{#list ...}}}
    /// children은 ListItem 또는 ConditionalListItems 노드
    List {
        kind: String,
        parameters: Parameters,
        children: Vec<AstNode>,
    },
    /// 리스트 아이템 (List의 직접 자식)
    ListItem {
        parameters: Parameters,
        children: Vec<AstNode>,
    },
    /// 조건부 리스트 아이템 ({{{#if condition :: [[item]]...}}})
    /// children은 ListItem 노드
    ConditionalListItems {
        condition: Box<AstNode>,
        children: Vec<AstNode>,
    },
    /// 폴드/접기 {{{#fold ...}}}
    /// content는 (AstNode, AstNode) 튜플, 각 kind = FoldInner
    Fold {
        parameters: Parameters,
        children: (Box<AstNode>, Box<AstNode>),
    },
    /// 폴드 내부 요소
    FoldInner {
        parameters: Parameters,
        children: Vec<AstNode>,
    },
    /// 인용 블록 {{{#blockquote ...}}}
    BlockQuote {
        parameters: Parameters,
        children: Vec<AstNode>,
    },
    /// 루비 텍스트 {{{#ruby ...}}}
    Ruby {
        parameters: Parameters,
        children: Vec<AstNode>,
    },
    /// 각주 {{{#footnote ...}}}
    Footnote {
        footnote_index: usize,
        parameters: Parameters,
        children: Vec<AstNode>,
    },
    /// 코드 블록 {{{#code ...}}}
    Code {
        parameters: Parameters,
        value: String,
    },
    /// TeX 수식 $ ... $ 또는 $$ ... $$
    TeX { is_block: bool, value: String },

    // === Wiki elements ===
    /// 포함 {{{#include ...}}}
    Include {
        parameters: Parameters,
        children: Vec<AstNode>,
    },
    /// 카테고리 {{{#category ...}}}
    Category { children: Vec<AstNode> },
    /// 리다이렉트 {{{#redirect ...}}}
    Redirect {
        parameters: Parameters,
        children: Vec<AstNode>,
    },

    // === Media ===
    /// 미디어 [[...]]
    Media {
        parameters: Parameters,
        children: Vec<AstNode>,
        #[serde(skip_serializing_if = "Option::is_none")]
        resolved_info: Option<ResolvedMediaInfo>,
    },
    /// 외부 미디어 [[#youtube ...]], [[#vimeo ...]], [[#nicovideo ...]], [[#spotify ...]]
    ExternalMedia {
        provider: String,
        parameters: Parameters,
    },

    // === Macros (leaf nodes) ===
    /// Null 매크로 [null]
    Null,
    /// 각주 위치 [fn]
    FootnoteRef,
    /// 현재 시간 [now]
    TimeNow,
    /// 나이 계산 [age(...)]
    Age { date: String },
    /// 변수 참조 [var(...)]
    Variable { name: String },
    /// 멘션 <@uuid> 또는 <#uuid>
    Mention { kind: MentionType, id: String },

    // === Text styles ===
    /// 볼드 **...**
    Bold { children: Vec<AstNode> },
    /// 이탤릭 *...*
    Italic { children: Vec<AstNode> },
    /// 취소선 ~~...~~
    Strikethrough { children: Vec<AstNode> },
    /// 밑줄 __...__
    Underline { children: Vec<AstNode> },
    /// 위첨자 ^...^
    Superscript { children: Vec<AstNode> },
    /// 아래첨자 ~...~
    Subscript { children: Vec<AstNode> },

    // === Line elements ===
    /// 소프트 브레이크 (줄바꿈)
    SoftBreak,
    /// 하드 브레이크 [br]
    HardBreak,
    /// 수평선 ----
    HLine,
    /// 헤더 = Title =
    Header {
        level: usize,
        is_folded: bool,
        section_index: usize,
        children: Vec<AstNode>,
    },

    // === Conditional ===
    /// If 조건문 {{{#if condition :: content}}}
    If {
        condition: Box<AstNode>,
        children: Vec<AstNode>,
    },

    // === Expression (조건식 노드) ===
    /// OR 연산 (||)
    ExprOr {
        operator: LogicalOperator,
        left: Box<AstNode>,
        right: Box<AstNode>,
    },
    /// AND 연산 (&&)
    ExprAnd {
        operator: LogicalOperator,
        left: Box<AstNode>,
        right: Box<AstNode>,
    },
    /// NOT 연산 (!)
    ExprNot {
        operator: LogicalOperator,
        children: Box<AstNode>,
    },
    /// 비교 연산 (==, !=, >, <, >=, <=)
    ExprComparison {
        left: Box<AstNode>,
        operator: ComparisonOperator,
        right: Box<AstNode>,
    },
    /// 함수 호출 (int, len, str)
    ExprFunctionCall {
        name: String,
        arguments: Vec<AstNode>,
    },
    /// 문자열 리터럴
    ExprStringLiteral { value: String },
    /// 숫자 리터럴
    ExprNumberLiteral { value: i64 },
    /// 불리언 리터럴
    ExprBoolLiteral { value: bool },
    /// Null 리터럴
    ExprNull,
    /// 괄호 그룹
    ExprGroup { children: Box<AstNode> },
}
