//! Header rendering

use maud::{Markup, html};
use sevenmark_parser::ast::AstNode;

use crate::classes;
use crate::config::RenderConfig;
use crate::context::RenderContext;
use crate::render::render_elements;

/// Render header with section path and optional edit link
pub fn render_with_path(
    level: usize,
    section_index: usize,
    children: &[AstNode],
    section_path: &str,
    config: &RenderConfig,
    ctx: &mut RenderContext,
) -> Markup {
    let content = render_elements(children, ctx);
    let id = format!("{}{}", classes::SECTION_ID_PREFIX, section_path);
    let class = match level {
        1 => classes::HEADER_1,
        2 => classes::HEADER_2,
        3 => classes::HEADER_3,
        4 => classes::HEADER_4,
        5 => classes::HEADER_5,
        _ => classes::HEADER_6,
    };

    let inner = html! {
        span class=(classes::SECTION_PATH) { (section_path) "." }
        span class=(classes::HEADER_CONTENT) { (content) }
        @if let Some(edit_url) = &config.edit_url {
            a href=(format!("{}?section={}", edit_url, section_index)) class=(classes::EDIT_LINK) { "[Edit]" }
        }
    };

    match level {
        1 => html! { h1 id=(id) class=(class) { (inner) } },
        2 => html! { h2 id=(id) class=(class) { (inner) } },
        3 => html! { h3 id=(id) class=(class) { (inner) } },
        4 => html! { h4 id=(id) class=(class) { (inner) } },
        5 => html! { h5 id=(id) class=(class) { (inner) } },
        _ => html! { h6 id=(id) class=(class) { (inner) } },
    }
}
