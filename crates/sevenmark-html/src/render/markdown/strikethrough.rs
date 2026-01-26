//! Strikethrough rendering

use maud::{Markup, html};
use sevenmark_parser::ast::AstNode;

use crate::context::RenderContext;
use crate::render::render_elements;

pub fn render(children: &[AstNode], ctx: &mut RenderContext) -> Markup {
    html! { del { (render_elements(children, ctx)) } }
}
