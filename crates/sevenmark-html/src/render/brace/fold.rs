//! Fold element rendering

use maud::{Markup, html};
use sevenmark_parser::ast::{AstNode, NodeKind, Parameters};

use crate::classes;
use crate::context::RenderContext;
use crate::render::{render_elements, utils};

pub fn render(
    parameters: &Parameters,
    content: &(Box<AstNode>, Box<AstNode>),
    ctx: &mut RenderContext,
) -> Markup {
    ctx.enter_suppress_soft_breaks();

    // Extract children from FoldInner nodes
    let summary_children = match &content.0.kind {
        NodeKind::FoldInner { children, .. } => children,
        _ => return html! {},
    };
    let details_children = match &content.1.kind {
        NodeKind::FoldInner { children, .. } => children,
        _ => return html! {},
    };

    let summary = render_elements(summary_children, ctx);
    let details = render_elements(details_children, ctx);
    ctx.exit_suppress_soft_breaks();

    let style = utils::build_style(parameters);

    html! {
        details class=(classes::FOLD) style=[style] {
            summary class=(classes::FOLD_SUMMARY) { (summary) }
            (details)
        }
    }
}
