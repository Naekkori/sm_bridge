//! Styled element rendering

use maud::{Markup, html};
use sevenmark_parser::ast::{AstNode, Parameters};

use crate::classes;
use crate::context::RenderContext;
use crate::render::{render_elements, utils};

pub fn render(parameters: &Parameters, children: &[AstNode], ctx: &mut RenderContext) -> Markup {
    ctx.enter_suppress_soft_breaks();
    let content = render_elements(children, ctx);
    ctx.exit_suppress_soft_breaks();

    let style = utils::build_style(parameters);

    html! {
        span class=(classes::STYLED) style=[style] { (content) }
    }
}
