use sevenmark_parser::ast::{AstNode, ComparisonOperator, ComparisonOperatorKind, NodeKind};
use std::collections::HashMap;

/// 조건식 평가 결과
#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    String(String),
    Number(i64),
    Null,
    Bool(bool),
}

/// 조건식을 평가하여 bool 반환
pub fn evaluate_condition(expr: &AstNode, variables: &HashMap<String, String>) -> bool {
    match evaluate_expression(expr, variables) {
        Value::Bool(b) => b,
        Value::Null => false,
        Value::String(s) => !s.is_empty(),
        Value::Number(n) => n != 0,
    }
}

/// Expression을 Value로 평가
fn evaluate_expression(expr: &AstNode, variables: &HashMap<String, String>) -> Value {
    match &expr.kind {
        // Short-circuit evaluation: true || X → true (X not evaluated)
        NodeKind::ExprOr { left, right, .. } => {
            if evaluate_condition(left, variables) {
                return Value::Bool(true);
            }
            Value::Bool(evaluate_condition(right, variables))
        }
        // Short-circuit evaluation: false && X → false (X not evaluated)
        NodeKind::ExprAnd { left, right, .. } => {
            if !evaluate_condition(left, variables) {
                return Value::Bool(false);
            }
            Value::Bool(evaluate_condition(right, variables))
        }
        NodeKind::ExprNot { children, .. } => {
            let inner_val = evaluate_condition(children, variables);
            Value::Bool(!inner_val)
        }
        NodeKind::ExprComparison {
            left,
            operator,
            right,
        } => {
            let left_val = evaluate_expression(left, variables);
            let right_val = evaluate_expression(right, variables);
            Value::Bool(compare_values(&left_val, operator, &right_val))
        }
        NodeKind::ExprFunctionCall { name, arguments } => {
            evaluate_function(name, arguments, variables)
        }
        NodeKind::ExprStringLiteral { value } => Value::String(value.clone()),
        NodeKind::ExprNumberLiteral { value } => Value::Number(*value),
        NodeKind::ExprBoolLiteral { value } => Value::Bool(*value),
        NodeKind::ExprNull => Value::Null,
        NodeKind::ExprGroup { children } => evaluate_expression(children, variables),

        // Regular AST nodes that can appear in expressions
        NodeKind::Variable { name } => {
            if let Some(value) = variables.get(name) {
                Value::String(value.clone())
            } else {
                Value::Null
            }
        }
        NodeKind::Text { value } => Value::String(value.clone()),
        NodeKind::Null => Value::Null,
        _ => Value::Null,
    }
}

/// 두 값 비교
fn compare_values(left: &Value, operator: &ComparisonOperator, right: &Value) -> bool {
    match &operator.kind {
        ComparisonOperatorKind::Equal => values_equal(left, right),
        ComparisonOperatorKind::NotEqual => !values_equal(left, right),
        // 숫자 비교는 양쪽 모두 숫자로 변환 가능할 때만 수행
        ComparisonOperatorKind::GreaterThan => {
            compare_numeric(left, right).is_some_and(|ord| ord > 0)
        }
        ComparisonOperatorKind::LessThan => compare_numeric(left, right).is_some_and(|ord| ord < 0),
        ComparisonOperatorKind::GreaterEqual => {
            compare_numeric(left, right).is_some_and(|ord| ord >= 0)
        }
        ComparisonOperatorKind::LessEqual => {
            compare_numeric(left, right).is_some_and(|ord| ord <= 0)
        }
    }
}

/// 값 동등 비교
fn values_equal(left: &Value, right: &Value) -> bool {
    match (left, right) {
        (Value::Null, Value::Null) => true,
        (Value::Bool(a), Value::Bool(b)) => a == b,
        (Value::String(a), Value::String(b)) => a == b,
        (Value::Number(a), Value::Number(b)) => a == b,
        (Value::String(s), Value::Number(n)) | (Value::Number(n), Value::String(s)) => {
            s.parse::<i64>().map(|parsed| parsed == *n).unwrap_or(false)
        }
        _ => false,
    }
}

/// 숫자 비교 - 양쪽 모두 숫자로 변환 가능할 때만 비교
/// 변환 불가능하면 None 반환
fn compare_numeric(left: &Value, right: &Value) -> Option<i64> {
    let left_num = to_number(left)?;
    let right_num = to_number(right)?;
    Some((left_num - right_num).signum())
}

/// Value를 숫자로 변환 시도 (실패하면 None)
fn to_number(value: &Value) -> Option<i64> {
    match value {
        Value::Number(n) => Some(*n),
        Value::String(s) => s.parse().ok(),
        Value::Bool(b) => Some(if *b { 1 } else { 0 }),
        Value::Null => None,
    }
}

/// 함수 호출 평가
fn evaluate_function(
    name: &str,
    arguments: &[AstNode],
    variables: &HashMap<String, String>,
) -> Value {
    match name {
        "int" => {
            if let Some(arg) = arguments.first() {
                let val = evaluate_expression(arg, variables);
                Value::Number(to_number(&val).unwrap_or(0))
            } else {
                Value::Number(0)
            }
        }
        "len" => {
            if let Some(arg) = arguments.first() {
                let val = evaluate_expression(arg, variables);
                match val {
                    Value::String(s) => Value::Number(s.len() as i64),
                    Value::Null => Value::Number(0),
                    _ => Value::Number(0),
                }
            } else {
                Value::Number(0)
            }
        }
        "str" => {
            if let Some(arg) = arguments.first() {
                let val = evaluate_expression(arg, variables);
                match val {
                    Value::String(s) => Value::String(s),
                    Value::Number(n) => Value::String(n.to_string()),
                    Value::Null => Value::String(String::new()),
                    Value::Bool(b) => Value::String(b.to_string()),
                }
            } else {
                Value::String(String::new())
            }
        }
        _ => Value::Null,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sevenmark_parser::ast::{
        ComparisonOperator, Location, LogicalOperator, LogicalOperatorKind,
    };

    // 테스트용 헬퍼 함수들
    fn loc() -> Location {
        Location::synthesized()
    }

    fn op(kind: ComparisonOperatorKind) -> ComparisonOperator {
        ComparisonOperator {
            location: loc(),
            kind,
        }
    }

    fn str_lit(s: &str) -> AstNode {
        AstNode::new(
            loc(),
            NodeKind::ExprStringLiteral {
                value: s.to_string(),
            },
        )
    }

    fn num_lit(n: i64) -> AstNode {
        AstNode::new(loc(), NodeKind::ExprNumberLiteral { value: n })
    }

    fn bool_lit(b: bool) -> AstNode {
        AstNode::new(loc(), NodeKind::ExprBoolLiteral { value: b })
    }

    fn null_lit() -> AstNode {
        AstNode::new(loc(), NodeKind::ExprNull)
    }

    fn var_elem(name: &str) -> AstNode {
        AstNode::new(
            loc(),
            NodeKind::Variable {
                name: name.to_string(),
            },
        )
    }

    fn cmp(left: AstNode, kind: ComparisonOperatorKind, right: AstNode) -> AstNode {
        AstNode::new(
            loc(),
            NodeKind::ExprComparison {
                left: Box::new(left),
                operator: op(kind),
                right: Box::new(right),
            },
        )
    }

    fn logical_op(kind: LogicalOperatorKind) -> LogicalOperator {
        LogicalOperator {
            location: loc(),
            kind,
        }
    }

    fn and(left: AstNode, right: AstNode) -> AstNode {
        AstNode::new(
            loc(),
            NodeKind::ExprAnd {
                operator: logical_op(LogicalOperatorKind::And),
                left: Box::new(left),
                right: Box::new(right),
            },
        )
    }

    fn or(left: AstNode, right: AstNode) -> AstNode {
        AstNode::new(
            loc(),
            NodeKind::ExprOr {
                operator: logical_op(LogicalOperatorKind::Or),
                left: Box::new(left),
                right: Box::new(right),
            },
        )
    }

    fn not(inner: AstNode) -> AstNode {
        AstNode::new(
            loc(),
            NodeKind::ExprNot {
                operator: logical_op(LogicalOperatorKind::Not),
                children: Box::new(inner),
            },
        )
    }

    fn func(name: &str, args: Vec<AstNode>) -> AstNode {
        AstNode::new(
            loc(),
            NodeKind::ExprFunctionCall {
                name: name.to_string(),
                arguments: args,
            },
        )
    }

    #[test]
    fn test_simple_comparison() {
        let variables = HashMap::new();
        let expr = cmp(
            str_lit("hello"),
            ComparisonOperatorKind::Equal,
            str_lit("hello"),
        );
        assert!(evaluate_condition(&expr, &variables));
    }

    #[test]
    fn test_variable_null_check() {
        let mut variables = HashMap::new();
        variables.insert("name".to_string(), "Alice".to_string());

        // [var(name)] != null → true
        let expr = cmp(
            var_elem("name"),
            ComparisonOperatorKind::NotEqual,
            null_lit(),
        );
        assert!(evaluate_condition(&expr, &variables));

        // [var(unknown)] != null → false
        let expr2 = cmp(
            var_elem("unknown"),
            ComparisonOperatorKind::NotEqual,
            null_lit(),
        );
        assert!(!evaluate_condition(&expr2, &variables));
    }

    #[test]
    fn test_and_or() {
        let variables = HashMap::new();

        // true && false → false
        let expr = and(str_lit("yes"), null_lit());
        assert!(!evaluate_condition(&expr, &variables));

        // true || false → true
        let expr2 = or(str_lit("yes"), null_lit());
        assert!(evaluate_condition(&expr2, &variables));
    }

    #[test]
    fn test_numeric_comparison() {
        let variables = HashMap::new();

        let expr = cmp(num_lit(10), ComparisonOperatorKind::GreaterThan, num_lit(5));
        assert!(evaluate_condition(&expr, &variables));
    }

    #[test]
    fn test_int_function() {
        let mut variables = HashMap::new();
        variables.insert("age".to_string(), "25".to_string());

        let expr = cmp(
            func("int", vec![var_elem("age")]),
            ComparisonOperatorKind::GreaterEqual,
            num_lit(18),
        );
        assert!(evaluate_condition(&expr, &variables));
    }

    #[test]
    fn test_short_circuit_and() {
        let variables = HashMap::new();

        // false && X → false (X not evaluated)
        let expr = and(null_lit(), func("int", vec![null_lit()]));
        assert!(!evaluate_condition(&expr, &variables));
    }

    #[test]
    fn test_short_circuit_or() {
        let variables = HashMap::new();

        // true || X → true (X not evaluated)
        let expr = or(str_lit("truthy"), null_lit());
        assert!(evaluate_condition(&expr, &variables));
    }

    #[test]
    fn test_null_guard_pattern() {
        let mut variables = HashMap::new();
        variables.insert("count".to_string(), "10".to_string());

        // [var(count)] != null && int([var(count)]) > 5 → true
        let expr = and(
            cmp(
                var_elem("count"),
                ComparisonOperatorKind::NotEqual,
                null_lit(),
            ),
            cmp(
                func("int", vec![var_elem("count")]),
                ComparisonOperatorKind::GreaterThan,
                num_lit(5),
            ),
        );
        assert!(evaluate_condition(&expr, &variables));

        // For undefined variable, short-circuit prevents int() evaluation
        let expr_undefined = and(
            cmp(
                var_elem("undefined"),
                ComparisonOperatorKind::NotEqual,
                null_lit(),
            ),
            cmp(
                func("int", vec![var_elem("undefined")]),
                ComparisonOperatorKind::GreaterThan,
                num_lit(5),
            ),
        );
        assert!(!evaluate_condition(&expr_undefined, &variables));
    }

    #[test]
    fn test_bool_comparison() {
        let variables = HashMap::new();

        // (5 > 3) == (10 > 8) → true == true → true
        let expr = cmp(
            cmp(num_lit(5), ComparisonOperatorKind::GreaterThan, num_lit(3)),
            ComparisonOperatorKind::Equal,
            cmp(num_lit(10), ComparisonOperatorKind::GreaterThan, num_lit(8)),
        );
        assert!(evaluate_condition(&expr, &variables));

        // (5 > 3) == (10 < 8) → true == false → false
        let expr2 = cmp(
            cmp(num_lit(5), ComparisonOperatorKind::GreaterThan, num_lit(3)),
            ComparisonOperatorKind::Equal,
            cmp(num_lit(10), ComparisonOperatorKind::LessThan, num_lit(8)),
        );
        assert!(!evaluate_condition(&expr2, &variables));
    }

    #[test]
    fn test_incomparable_types() {
        let variables = HashMap::new();

        // "abc" < 5 → false (비교 불가, 0으로 변환하지 않음)
        let expr = cmp(str_lit("abc"), ComparisonOperatorKind::LessThan, num_lit(5));
        assert!(!evaluate_condition(&expr, &variables));

        // "abc" > 5 → false (비교 불가)
        let expr2 = cmp(
            str_lit("abc"),
            ComparisonOperatorKind::GreaterThan,
            num_lit(5),
        );
        assert!(!evaluate_condition(&expr2, &variables));

        // "10" > 5 → true (문자열이 숫자로 파싱 가능)
        let expr3 = cmp(
            str_lit("10"),
            ComparisonOperatorKind::GreaterThan,
            num_lit(5),
        );
        assert!(evaluate_condition(&expr3, &variables));

        // null > 5 → false (null은 숫자 비교 불가)
        let expr4 = cmp(null_lit(), ComparisonOperatorKind::GreaterThan, num_lit(5));
        assert!(!evaluate_condition(&expr4, &variables));
    }

    #[test]
    fn test_bool_literal() {
        let variables = HashMap::new();

        // true == true → true
        let expr = cmp(
            bool_lit(true),
            ComparisonOperatorKind::Equal,
            bool_lit(true),
        );
        assert!(evaluate_condition(&expr, &variables));

        // (5 > 3) == true → true
        let expr2 = cmp(
            cmp(num_lit(5), ComparisonOperatorKind::GreaterThan, num_lit(3)),
            ComparisonOperatorKind::Equal,
            bool_lit(true),
        );
        assert!(evaluate_condition(&expr2, &variables));

        // false || true → true
        let expr3 = or(bool_lit(false), bool_lit(true));
        assert!(evaluate_condition(&expr3, &variables));

        // !false → true
        let expr4 = not(bool_lit(false));
        assert!(evaluate_condition(&expr4, &variables));
    }
}
