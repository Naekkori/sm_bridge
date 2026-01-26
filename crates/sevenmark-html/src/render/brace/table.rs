//! Table rendering

use maud::{Markup, html};
use sevenmark_parser::ast::{AstNode, NodeKind, Parameters};

use crate::classes;
use crate::context::RenderContext;
use crate::render::{render_elements, utils};

pub fn render(parameters: &Parameters, children: &[AstNode], ctx: &mut RenderContext) -> Markup {
    ctx.enter_suppress_soft_breaks();
    let style = utils::build_style(parameters);
    let content = html! {
        div class=(classes::TABLE_WRAPPER) {
            table class=(classes::TABLE) style=[style] {
                tbody {
                    @for row_item in children {
                        @match &row_item.kind {
                            NodeKind::TableRow { parameters, children } => {
                                @let row_style = utils::build_style(parameters);
                                tr style=[row_style] { (render_cells(children, ctx)) }
                            }
                            NodeKind::ConditionalTableRows { children, .. } => {
                                @for row in children {
                                    @if let NodeKind::TableRow { parameters, children } = &row.kind {
                                        @let row_style = utils::build_style(parameters);
                                        tr style=[row_style] { (render_cells(children, ctx)) }
                                    }
                                }
                            }
                            _ => {}
                        }
                    }
                }
            }
        }
    };
    ctx.exit_suppress_soft_breaks();
    content
}

fn render_cells(cells: &[AstNode], ctx: &mut RenderContext) -> Markup {
    html! {
        @for cell_item in cells {
            @match &cell_item.kind {
                NodeKind::TableCell { parameters, x, y, children } => {
                    @let colspan = utils::extract_text(x).parse::<usize>().ok().filter(|&n| n > 1);
                    @let rowspan = utils::extract_text(y).parse::<usize>().ok().filter(|&n| n > 1);
                    @let style = utils::build_style(parameters);
                    td colspan=[colspan] rowspan=[rowspan] style=[style] {
                        (render_elements(children, ctx))
                    }
                }
                NodeKind::ConditionalTableCells { children, .. } => {
                    @for cell in children {
                        @if let NodeKind::TableCell { parameters, x, y, children } = &cell.kind {
                            @let colspan = utils::extract_text(x).parse::<usize>().ok().filter(|&n| n > 1);
                            @let rowspan = utils::extract_text(y).parse::<usize>().ok().filter(|&n| n > 1);
                            @let style = utils::build_style(parameters);
                            td colspan=[colspan] rowspan=[rowspan] style=[style] {
                                (render_elements(children, ctx))
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    }
}
