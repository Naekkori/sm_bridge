use serde::Serialize;

use super::Location;

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
    pub location: Location,
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
    pub location: Location,
    pub kind: ComparisonOperatorKind,
}
