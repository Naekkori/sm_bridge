//! Table rendering

use maud::{Markup, html};
use sevenmark_parser::ast::{Parameters, TableCellItem, TableRowItem};

use crate::classes;
use crate::context::RenderContext;
use crate::render::{render_elements, utils};

pub fn render(
    parameters: &Parameters,
    children: &[TableRowItem],
    ctx: &mut RenderContext,
) -> Markup {
    ctx.enter_suppress_soft_breaks();
    let style = utils::build_style(parameters);
    let content = html! {
        div class=(classes::TABLE_WRAPPER) {
            table class=(classes::TABLE) style=[style] {
                tbody {
                    @for row_item in children {
                        @match row_item {
                            TableRowItem::Row(row) => {
                                @let row_style = utils::build_style(&row.parameters);
                                tr style=[row_style] { (render_cells(&row.children, ctx)) }
                            }
                            TableRowItem::Conditional(cond) => {
                                @for row in &cond.rows {
                                    @let row_style = utils::build_style(&row.parameters);
                                    tr style=[row_style] { (render_cells(&row.children, ctx)) }
                                }
                            }
                        }
                    }
                }
            }
        }
    };
    ctx.exit_suppress_soft_breaks();
    content
}

fn render_cells(cells: &[TableCellItem], ctx: &mut RenderContext) -> Markup {
    html! {
        @for cell_item in cells {
            @match cell_item {
                TableCellItem::Cell(cell) => {
                    @let colspan = utils::extract_text(&cell.x).parse::<usize>().ok().filter(|&n| n > 1);
                    @let rowspan = utils::extract_text(&cell.y).parse::<usize>().ok().filter(|&n| n > 1);
                    @let style = utils::build_style(&cell.parameters);
                    td colspan=[colspan] rowspan=[rowspan] style=[style] {
                        (render_elements(&cell.children, ctx))
                    }
                }
                TableCellItem::Conditional(cond) => {
                    @for cell in &cond.cells {
                        @let colspan = utils::extract_text(&cell.x).parse::<usize>().ok().filter(|&n| n > 1);
                        @let rowspan = utils::extract_text(&cell.y).parse::<usize>().ok().filter(|&n| n > 1);
                        @let style = utils::build_style(&cell.parameters);
                        td colspan=[colspan] rowspan=[rowspan] style=[style] {
                            (render_elements(&cell.children, ctx))
                        }
                    }
                }
            }
        }
    }
}
