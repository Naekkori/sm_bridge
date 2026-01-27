use super::{Element, ListContentItem, TableCellItem, TableRowItem};

/// Trait for traversing AST elements
pub trait Traversable {
    /// 각 자식 요소에 대해 visitor 호출 (mutable)
    fn traverse_children<F>(&mut self, visitor: &mut F)
    where
        F: FnMut(&mut Element);

    /// 각 자식 요소에 대해 visitor 호출 (immutable)
    fn traverse_children_ref<F>(&self, visitor: &mut F)
    where
        F: FnMut(&Element);

    /// 각 children Vec에 대해 f 호출 (Vec 구조 변경이 필요할 때 사용)
    fn for_each_children_vec<F>(&mut self, f: &mut F)
    where
        F: FnMut(&mut Vec<Element>);
}

impl Traversable for Element {
    fn traverse_children<F>(&mut self, visitor: &mut F)
    where
        F: FnMut(&mut Element),
    {
        match self {
            // === Leaf nodes (자식 없음) ===
            Element::Text(_)
            | Element::Comment(_)
            | Element::Escape(_)
            | Element::Error(_)
            | Element::Code(_)
            | Element::TeX(_)
            | Element::Define(_)
            | Element::ExternalMedia(_)
            | Element::Null(_)
            | Element::FootnoteRef(_)
            | Element::TimeNow(_)
            | Element::Age(_)
            | Element::Variable(_)
            | Element::Mention(_)
            | Element::SoftBreak(_)
            | Element::HardBreak(_)
            | Element::HLine(_) => {}

            // === children 필드만 있는 노드들 ===
            Element::Literal(e) => e.children.iter_mut().for_each(visitor),
            Element::Styled(e) => e.children.iter_mut().for_each(visitor),
            Element::BlockQuote(e) => e.children.iter_mut().for_each(visitor),
            Element::Ruby(e) => e.children.iter_mut().for_each(visitor),
            Element::Footnote(e) => e.children.iter_mut().for_each(visitor),
            Element::Include(e) => e.children.iter_mut().for_each(visitor),
            Element::Category(e) => e.children.iter_mut().for_each(visitor),
            Element::Redirect(e) => e.children.iter_mut().for_each(visitor),
            Element::Media(e) => e.children.iter_mut().for_each(visitor),
            Element::Bold(e)
            | Element::Italic(e)
            | Element::Strikethrough(e)
            | Element::Underline(e)
            | Element::Superscript(e)
            | Element::Subscript(e) => e.children.iter_mut().for_each(visitor),
            Element::Header(e) => e.children.iter_mut().for_each(visitor),

            // === If: children only (condition은 Expression이므로 순회 안함) ===
            Element::If(e) => e.children.iter_mut().for_each(visitor),

            // === Table: typed children 순회 ===
            Element::Table(e) => {
                for row_item in &mut e.children {
                    match row_item {
                        TableRowItem::Row(row) => {
                            for cell_item in &mut row.children {
                                match cell_item {
                                    TableCellItem::Cell(cell) => {
                                        cell.x.iter_mut().for_each(&mut *visitor);
                                        cell.y.iter_mut().for_each(&mut *visitor);
                                        cell.children.iter_mut().for_each(&mut *visitor);
                                    }
                                    TableCellItem::Conditional(cond) => {
                                        for cell in &mut cond.cells {
                                            cell.x.iter_mut().for_each(&mut *visitor);
                                            cell.y.iter_mut().for_each(&mut *visitor);
                                            cell.children.iter_mut().for_each(&mut *visitor);
                                        }
                                    }
                                }
                            }
                        }
                        TableRowItem::Conditional(cond) => {
                            for row in &mut cond.rows {
                                for cell_item in &mut row.children {
                                    match cell_item {
                                        TableCellItem::Cell(cell) => {
                                            cell.x.iter_mut().for_each(&mut *visitor);
                                            cell.y.iter_mut().for_each(&mut *visitor);
                                            cell.children.iter_mut().for_each(&mut *visitor);
                                        }
                                        TableCellItem::Conditional(cond) => {
                                            for cell in &mut cond.cells {
                                                cell.x.iter_mut().for_each(&mut *visitor);
                                                cell.y.iter_mut().for_each(&mut *visitor);
                                                cell.children.iter_mut().for_each(&mut *visitor);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // === List: typed children 순회 ===
            Element::List(e) => {
                for item in &mut e.children {
                    match item {
                        ListContentItem::Item(li) => {
                            li.children.iter_mut().for_each(&mut *visitor);
                        }
                        ListContentItem::Conditional(cond) => {
                            for li in &mut cond.items {
                                li.children.iter_mut().for_each(&mut *visitor);
                            }
                        }
                    }
                }
            }

            // === Fold: summary + details ===
            Element::Fold(e) => {
                e.summary.children.iter_mut().for_each(&mut *visitor);
                e.details.children.iter_mut().for_each(&mut *visitor);
            }
        }
    }

    fn traverse_children_ref<F>(&self, visitor: &mut F)
    where
        F: FnMut(&Element),
    {
        match self {
            // === Leaf nodes ===
            Element::Text(_)
            | Element::Comment(_)
            | Element::Escape(_)
            | Element::Error(_)
            | Element::Code(_)
            | Element::TeX(_)
            | Element::Define(_)
            | Element::ExternalMedia(_)
            | Element::Null(_)
            | Element::FootnoteRef(_)
            | Element::TimeNow(_)
            | Element::Age(_)
            | Element::Variable(_)
            | Element::Mention(_)
            | Element::SoftBreak(_)
            | Element::HardBreak(_)
            | Element::HLine(_) => {}

            Element::Literal(e) => e.children.iter().for_each(visitor),
            Element::Styled(e) => e.children.iter().for_each(visitor),
            Element::BlockQuote(e) => e.children.iter().for_each(visitor),
            Element::Ruby(e) => e.children.iter().for_each(visitor),
            Element::Footnote(e) => e.children.iter().for_each(visitor),
            Element::Include(e) => e.children.iter().for_each(visitor),
            Element::Category(e) => e.children.iter().for_each(visitor),
            Element::Redirect(e) => e.children.iter().for_each(visitor),
            Element::Media(e) => e.children.iter().for_each(visitor),
            Element::Bold(e)
            | Element::Italic(e)
            | Element::Strikethrough(e)
            | Element::Underline(e)
            | Element::Superscript(e)
            | Element::Subscript(e) => e.children.iter().for_each(visitor),
            Element::Header(e) => e.children.iter().for_each(visitor),
            Element::If(e) => e.children.iter().for_each(visitor),

            Element::Table(e) => {
                for row_item in &e.children {
                    match row_item {
                        TableRowItem::Row(row) => {
                            for cell_item in &row.children {
                                match cell_item {
                                    TableCellItem::Cell(cell) => {
                                        cell.x.iter().for_each(&mut *visitor);
                                        cell.y.iter().for_each(&mut *visitor);
                                        cell.children.iter().for_each(&mut *visitor);
                                    }
                                    TableCellItem::Conditional(cond) => {
                                        for cell in &cond.cells {
                                            cell.x.iter().for_each(&mut *visitor);
                                            cell.y.iter().for_each(&mut *visitor);
                                            cell.children.iter().for_each(&mut *visitor);
                                        }
                                    }
                                }
                            }
                        }
                        TableRowItem::Conditional(cond) => {
                            for row in &cond.rows {
                                for cell_item in &row.children {
                                    match cell_item {
                                        TableCellItem::Cell(cell) => {
                                            cell.x.iter().for_each(&mut *visitor);
                                            cell.y.iter().for_each(&mut *visitor);
                                            cell.children.iter().for_each(&mut *visitor);
                                        }
                                        TableCellItem::Conditional(cond) => {
                                            for cell in &cond.cells {
                                                cell.x.iter().for_each(&mut *visitor);
                                                cell.y.iter().for_each(&mut *visitor);
                                                cell.children.iter().for_each(&mut *visitor);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Element::List(e) => {
                for item in &e.children {
                    match item {
                        ListContentItem::Item(li) => {
                            li.children.iter().for_each(&mut *visitor);
                        }
                        ListContentItem::Conditional(cond) => {
                            for li in &cond.items {
                                li.children.iter().for_each(&mut *visitor);
                            }
                        }
                    }
                }
            }

            Element::Fold(e) => {
                e.summary.children.iter().for_each(&mut *visitor);
                e.details.children.iter().for_each(&mut *visitor);
            }
        }
    }

    fn for_each_children_vec<F>(&mut self, f: &mut F)
    where
        F: FnMut(&mut Vec<Element>),
    {
        match self {
            // === Leaf nodes ===
            Element::Text(_)
            | Element::Comment(_)
            | Element::Escape(_)
            | Element::Error(_)
            | Element::Code(_)
            | Element::TeX(_)
            | Element::Define(_)
            | Element::ExternalMedia(_)
            | Element::Null(_)
            | Element::FootnoteRef(_)
            | Element::TimeNow(_)
            | Element::Age(_)
            | Element::Variable(_)
            | Element::Mention(_)
            | Element::SoftBreak(_)
            | Element::HardBreak(_)
            | Element::HLine(_)
            | Element::If(_) => {}

            Element::Literal(e) => f(&mut e.children),
            Element::Styled(e) => f(&mut e.children),
            Element::BlockQuote(e) => f(&mut e.children),
            Element::Ruby(e) => f(&mut e.children),
            Element::Footnote(e) => f(&mut e.children),
            Element::Include(e) => f(&mut e.children),
            Element::Category(e) => f(&mut e.children),
            Element::Redirect(e) => f(&mut e.children),
            Element::Media(e) => f(&mut e.children),
            Element::Bold(e)
            | Element::Italic(e)
            | Element::Strikethrough(e)
            | Element::Underline(e)
            | Element::Superscript(e)
            | Element::Subscript(e) => f(&mut e.children),
            Element::Header(e) => f(&mut e.children),

            Element::Table(e) => {
                for row_item in &mut e.children {
                    match row_item {
                        TableRowItem::Row(row) => {
                            for cell_item in &mut row.children {
                                match cell_item {
                                    TableCellItem::Cell(cell) => {
                                        f(&mut cell.x);
                                        f(&mut cell.y);
                                        f(&mut cell.children);
                                    }
                                    TableCellItem::Conditional(cond) => {
                                        for cell in &mut cond.cells {
                                            f(&mut cell.x);
                                            f(&mut cell.y);
                                            f(&mut cell.children);
                                        }
                                    }
                                }
                            }
                        }
                        TableRowItem::Conditional(cond) => {
                            for row in &mut cond.rows {
                                for cell_item in &mut row.children {
                                    match cell_item {
                                        TableCellItem::Cell(cell) => {
                                            f(&mut cell.x);
                                            f(&mut cell.y);
                                            f(&mut cell.children);
                                        }
                                        TableCellItem::Conditional(cond) => {
                                            for cell in &mut cond.cells {
                                                f(&mut cell.x);
                                                f(&mut cell.y);
                                                f(&mut cell.children);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Element::List(e) => {
                for item in &mut e.children {
                    match item {
                        ListContentItem::Item(li) => f(&mut li.children),
                        ListContentItem::Conditional(cond) => {
                            for li in &mut cond.items {
                                f(&mut li.children);
                            }
                        }
                    }
                }
            }

            Element::Fold(e) => {
                f(&mut e.summary.children);
                f(&mut e.details.children);
            }
        }
    }
}
