//! List rendering

use maud::{Markup, html};
use sevenmark_parser::ast::{ListContentItem, Parameters};

use crate::classes;
use crate::context::RenderContext;
use crate::render::{render_elements, utils};

pub fn render(
    kind: &str,
    parameters: &Parameters,
    children: &[ListContentItem],
    ctx: &mut RenderContext,
) -> Markup {
    ctx.enter_suppress_soft_breaks();
    let style = utils::build_style(parameters);
    let items = render_items(children, ctx);
    ctx.exit_suppress_soft_breaks();
    let is_ordered = !kind.is_empty();

    if is_ordered {
        // kind: "1", "a", "A", "i", "I"
        let list_type = if kind == "1" { None } else { Some(kind) };
        html! { ol class=(format!("{} {}", classes::LIST, classes::LIST_ORDERED)) type=[list_type] style=[style] { (items) } }
    } else {
        html! { ul class=(format!("{} {}", classes::LIST, classes::LIST_UNORDERED)) style=[style] { (items) } }
    }
}

fn render_items(items: &[ListContentItem], ctx: &mut RenderContext) -> Markup {
    html! {
        @for item in items {
            @match item {
                ListContentItem::Item(list_item) => {
                    @let style = utils::build_style(&list_item.parameters);
                    li style=[style] { (render_elements(&list_item.children, ctx)) }
                }
                ListContentItem::Conditional(cond) => {
                    @for list_item in &cond.items {
                        @let style = utils::build_style(&list_item.parameters);
                        li style=[style] { (render_elements(&list_item.children, ctx)) }
                    }
                }
            }
        }
    }
}
