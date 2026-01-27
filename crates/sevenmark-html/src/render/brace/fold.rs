//! Fold element rendering

use maud::{Markup, html};
use sevenmark_parser::ast::FoldElement;

use crate::classes;
use crate::context::RenderContext;
use crate::render::{render_elements, utils};

pub fn render(fold: &FoldElement, ctx: &mut RenderContext) -> Markup {
    ctx.enter_suppress_soft_breaks();

    let summary = render_elements(&fold.summary.children, ctx);
    let details = render_elements(&fold.details.children, ctx);
    ctx.exit_suppress_soft_breaks();

    let style = utils::build_style(&fold.parameters);

    html! {
        details class=(classes::FOLD) style=[style] {
            summary class=(classes::FOLD_SUMMARY) { (summary) }
            (details)
        }
    }
}
