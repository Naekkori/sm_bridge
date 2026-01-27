use serde::Serialize;

use super::{Element, Span};

/// 논리 연산자 종류
#[derive(Debug, Clone, Serialize, PartialEq)]
pub enum LogicalOperatorKind {
    Or,  // ||
    And, // &&
    Not, // !
}

/// 논리 연산자 (위치 정보 포함)
#[derive(Debug, Clone, Serialize)]
pub struct LogicalOperator {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub kind: LogicalOperatorKind,
}

/// 비교 연산자 종류
#[derive(Debug, Clone, Serialize, PartialEq)]
pub enum ComparisonOperatorKind {
    Equal,        // ==
    NotEqual,     // !=
    GreaterThan,  // >
    LessThan,     // <
    GreaterEqual, // >=
    LessEqual,    // <=
}

/// 비교 연산자 (위치 정보 포함)
#[derive(Debug, Clone, Serialize)]
pub struct ComparisonOperator {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub kind: ComparisonOperatorKind,
}

/// 조건식 Expression AST
#[derive(Debug, Clone, Serialize)]
pub enum Expression {
    /// 논리 OR 연산 (||)
    Or {
        #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
        span: Span,
        operator: LogicalOperator,
        left: Box<Expression>,
        right: Box<Expression>,
    },
    /// 논리 AND 연산 (&&)
    And {
        #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
        span: Span,
        operator: LogicalOperator,
        left: Box<Expression>,
        right: Box<Expression>,
    },
    /// 논리 NOT 연산 (!)
    Not {
        #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
        span: Span,
        operator: LogicalOperator,
        inner: Box<Expression>,
    },
    /// 비교 연산 (==, !=, >, <, >=, <=)
    Comparison {
        #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
        span: Span,
        left: Box<Expression>,
        operator: ComparisonOperator,
        right: Box<Expression>,
    },
    /// 함수 호출 (int, len, str)
    FunctionCall {
        #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
        span: Span,
        name: String,
        arguments: Vec<Expression>,
    },
    /// 문자열 리터럴
    StringLiteral {
        #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
        span: Span,
        value: String,
    },
    /// 숫자 리터럴
    NumberLiteral {
        #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
        span: Span,
        value: i64,
    },
    /// 불리언 리터럴
    BoolLiteral {
        #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
        span: Span,
        value: bool,
    },
    /// Null 리터럴
    Null {
        #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
        span: Span,
    },
    /// 괄호 그룹
    Group {
        #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
        span: Span,
        inner: Box<Expression>,
    },
    /// 기존 Element를 expression 안에 포함 (Variable, Null 매크로 등)
    Element(Box<Element>),
}
