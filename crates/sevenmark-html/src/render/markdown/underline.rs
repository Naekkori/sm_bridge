//! Underline rendering

use maud::{Markup, html};
use sevenmark_parser::ast::Element;

use crate::context::RenderContext;
use crate::render::render_elements;

pub fn render(children: &[Element], ctx: &mut RenderContext) -> Markup {
    html! { u { (render_elements(children, ctx)) } }
}
