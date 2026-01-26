use crate::ast::{AstNode, NodeKind};

/// Trait for automatically traversing AST elements
pub trait Traversable {
    /// 각 자식 요소에 대해 visitor 호출 (mutable)
    fn traverse_children<F>(&mut self, visitor: &mut F)
    where
        F: FnMut(&mut AstNode);

    /// 각 자식 요소에 대해 visitor 호출 (immutable - 읽기 전용 순회)
    fn traverse_children_ref<F>(&self, visitor: &mut F)
    where
        F: FnMut(&AstNode);

    /// 각 children Vec에 대해 f 호출 (Vec 구조 변경이 필요할 때 사용)
    fn for_each_children_vec<F>(&mut self, f: &mut F)
    where
        F: FnMut(&mut Vec<AstNode>);
}

impl Traversable for AstNode {
    fn traverse_children<F>(&mut self, visitor: &mut F)
    where
        F: FnMut(&mut AstNode),
    {
        match &mut self.kind {
            // === Leaf nodes (자식 없음) ===
            NodeKind::Text { .. }
            | NodeKind::Comment { .. }
            | NodeKind::Escape { .. }
            | NodeKind::Error { .. }
            | NodeKind::Code { .. }
            | NodeKind::TeX { .. }
            | NodeKind::Define { .. }
            | NodeKind::ExternalMedia { .. }
            | NodeKind::Null
            | NodeKind::FootnoteRef
            | NodeKind::TimeNow
            | NodeKind::Age { .. }
            | NodeKind::Variable { .. }
            | NodeKind::Mention { .. }
            | NodeKind::SoftBreak
            | NodeKind::HardBreak
            | NodeKind::HLine
            | NodeKind::ExprStringLiteral { .. }
            | NodeKind::ExprNumberLiteral { .. }
            | NodeKind::ExprBoolLiteral { .. }
            | NodeKind::ExprNull => {
                // 자식 없음
            }

            // === children 필드만 있는 노드들 ===
            NodeKind::Literal { children }
            | NodeKind::Styled { children, .. }
            | NodeKind::BlockQuote { children, .. }
            | NodeKind::Footnote { children, .. }
            | NodeKind::Include { children, .. }
            | NodeKind::Category { children }
            | NodeKind::Redirect { children, .. }
            | NodeKind::Media { children, .. }
            | NodeKind::Ruby { children, .. }
            | NodeKind::Bold { children }
            | NodeKind::Italic { children }
            | NodeKind::Strikethrough { children }
            | NodeKind::Underline { children }
            | NodeKind::Superscript { children }
            | NodeKind::Subscript { children }
            | NodeKind::Header { children, .. }
            | NodeKind::Table { children, .. }
            | NodeKind::TableRow { children, .. }
            | NodeKind::List { children, .. }
            | NodeKind::ListItem { children, .. }
            | NodeKind::FoldInner { children, .. } => {
                children.iter_mut().for_each(visitor);
            }

            // === If: condition + children ===
            NodeKind::If {
                condition,
                children,
            } => {
                visitor(condition);
                children.iter_mut().for_each(visitor);
            }

            // === Conditional variants: condition + children ===
            NodeKind::ConditionalTableRows {
                condition,
                children,
            }
            | NodeKind::ConditionalTableCells {
                condition,
                children,
            }
            | NodeKind::ConditionalListItems {
                condition,
                children,
            } => {
                visitor(condition);
                children.iter_mut().for_each(visitor);
            }

            // === TableCell: x, y, children ===
            NodeKind::TableCell { x, y, children, .. } => {
                x.iter_mut().for_each(&mut *visitor);
                y.iter_mut().for_each(&mut *visitor);
                children.iter_mut().for_each(&mut *visitor);
            }

            // === Fold: content 튜플 ===
            NodeKind::Fold { children, .. } => {
                visitor(&mut children.0);
                visitor(&mut children.1);
            }

            // === Expression nodes ===
            NodeKind::ExprOr { left, right, .. }
            | NodeKind::ExprAnd { left, right, .. }
            | NodeKind::ExprComparison { left, right, .. } => {
                visitor(left);
                visitor(right);
            }

            NodeKind::ExprNot { children, .. } | NodeKind::ExprGroup { children } => {
                visitor(children);
            }

            NodeKind::ExprFunctionCall { arguments, .. } => {
                arguments.iter_mut().for_each(visitor);
            }
        }
    }

    fn for_each_children_vec<F>(&mut self, f: &mut F)
    where
        F: FnMut(&mut Vec<AstNode>),
    {
        match &mut self.kind {
            // === Leaf nodes ===
            NodeKind::Text { .. }
            | NodeKind::Comment { .. }
            | NodeKind::Escape { .. }
            | NodeKind::Error { .. }
            | NodeKind::Code { .. }
            | NodeKind::TeX { .. }
            | NodeKind::Define { .. }
            | NodeKind::ExternalMedia { .. }
            | NodeKind::Null
            | NodeKind::FootnoteRef
            | NodeKind::TimeNow
            | NodeKind::Age { .. }
            | NodeKind::Variable { .. }
            | NodeKind::Mention { .. }
            | NodeKind::SoftBreak
            | NodeKind::HardBreak
            | NodeKind::HLine
            | NodeKind::ExprStringLiteral { .. }
            | NodeKind::ExprNumberLiteral { .. }
            | NodeKind::ExprBoolLiteral { .. }
            | NodeKind::ExprNull
            | NodeKind::ExprOr { .. }
            | NodeKind::ExprAnd { .. }
            | NodeKind::ExprNot { .. }
            | NodeKind::ExprComparison { .. }
            | NodeKind::ExprGroup { .. }
            | NodeKind::If { .. } => {}

            // === children 필드만 있는 노드들 ===
            NodeKind::Literal { children }
            | NodeKind::Styled { children, .. }
            | NodeKind::BlockQuote { children, .. }
            | NodeKind::Footnote { children, .. }
            | NodeKind::Include { children, .. }
            | NodeKind::Category { children }
            | NodeKind::Redirect { children, .. }
            | NodeKind::Media { children, .. }
            | NodeKind::Ruby { children, .. }
            | NodeKind::Bold { children }
            | NodeKind::Italic { children }
            | NodeKind::Strikethrough { children }
            | NodeKind::Underline { children }
            | NodeKind::Superscript { children }
            | NodeKind::Subscript { children }
            | NodeKind::Header { children, .. }
            | NodeKind::Table { children, .. }
            | NodeKind::TableRow { children, .. }
            | NodeKind::List { children, .. }
            | NodeKind::ListItem { children, .. }
            | NodeKind::FoldInner { children, .. }
            | NodeKind::ConditionalTableRows { children, .. }
            | NodeKind::ConditionalTableCells { children, .. }
            | NodeKind::ConditionalListItems { children, .. } => {
                f(children);
            }

            // === ExprFunctionCall: arguments Vec ===
            NodeKind::ExprFunctionCall { arguments, .. } => {
                f(arguments);
            }

            // === TableCell: x, y, children ===
            NodeKind::TableCell { x, y, children, .. } => {
                f(x);
                f(y);
                f(children);
            }

            // === Fold: content 튜플 (FoldInner의 children에 접근) ===
            NodeKind::Fold { children, .. } => {
                if let NodeKind::FoldInner { children, .. } = &mut children.0.kind {
                    f(children);
                }
                if let NodeKind::FoldInner { children, .. } = &mut children.1.kind {
                    f(children);
                }
            }
        }
    }

    fn traverse_children_ref<F>(&self, visitor: &mut F)
    where
        F: FnMut(&AstNode),
    {
        match &self.kind {
            // === Leaf nodes ===
            NodeKind::Text { .. }
            | NodeKind::Comment { .. }
            | NodeKind::Escape { .. }
            | NodeKind::Error { .. }
            | NodeKind::Code { .. }
            | NodeKind::TeX { .. }
            | NodeKind::Define { .. }
            | NodeKind::ExternalMedia { .. }
            | NodeKind::Null
            | NodeKind::FootnoteRef
            | NodeKind::TimeNow
            | NodeKind::Age { .. }
            | NodeKind::Variable { .. }
            | NodeKind::Mention { .. }
            | NodeKind::SoftBreak
            | NodeKind::HardBreak
            | NodeKind::HLine
            | NodeKind::ExprStringLiteral { .. }
            | NodeKind::ExprNumberLiteral { .. }
            | NodeKind::ExprBoolLiteral { .. }
            | NodeKind::ExprNull => {}

            // === children 필드만 있는 노드들 ===
            NodeKind::Literal { children }
            | NodeKind::Styled { children, .. }
            | NodeKind::BlockQuote { children, .. }
            | NodeKind::Footnote { children, .. }
            | NodeKind::Include { children, .. }
            | NodeKind::Category { children }
            | NodeKind::Redirect { children, .. }
            | NodeKind::Media { children, .. }
            | NodeKind::Ruby { children, .. }
            | NodeKind::Bold { children }
            | NodeKind::Italic { children }
            | NodeKind::Strikethrough { children }
            | NodeKind::Underline { children }
            | NodeKind::Superscript { children }
            | NodeKind::Subscript { children }
            | NodeKind::Header { children, .. }
            | NodeKind::Table { children, .. }
            | NodeKind::TableRow { children, .. }
            | NodeKind::List { children, .. }
            | NodeKind::ListItem { children, .. }
            | NodeKind::FoldInner { children, .. } => {
                children.iter().for_each(visitor);
            }

            // === If: condition + children ===
            NodeKind::If {
                condition,
                children,
            } => {
                visitor(condition);
                children.iter().for_each(visitor);
            }

            // === Conditional variants: condition + children ===
            NodeKind::ConditionalTableRows {
                condition,
                children,
            }
            | NodeKind::ConditionalTableCells {
                condition,
                children,
            }
            | NodeKind::ConditionalListItems {
                condition,
                children,
            } => {
                visitor(condition);
                children.iter().for_each(visitor);
            }

            // === TableCell: x, y, children ===
            NodeKind::TableCell { x, y, children, .. } => {
                x.iter().for_each(&mut *visitor);
                y.iter().for_each(&mut *visitor);
                children.iter().for_each(&mut *visitor);
            }

            // === Fold: content 튜플 ===
            NodeKind::Fold { children, .. } => {
                visitor(&children.0);
                visitor(&children.1);
            }

            // === Expression nodes ===
            NodeKind::ExprOr { left, right, .. }
            | NodeKind::ExprAnd { left, right, .. }
            | NodeKind::ExprComparison { left, right, .. } => {
                visitor(left);
                visitor(right);
            }

            NodeKind::ExprNot { children, .. } | NodeKind::ExprGroup { children } => {
                visitor(children);
            }

            NodeKind::ExprFunctionCall { arguments, .. } => {
                arguments.iter().for_each(visitor);
            }
        }
    }
}
