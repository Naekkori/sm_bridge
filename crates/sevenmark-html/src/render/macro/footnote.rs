//! FootNote macro rendering - renders collected footnotes at current position

use maud::{Markup, html};

use crate::classes;
use crate::context::RenderContext;
use crate::render::render_elements;

pub fn render(ctx: &mut RenderContext) -> Markup {
    if ctx.footnotes.is_empty() {
        return html! {};
    }

    // Take footnotes and render them
    let footnotes = std::mem::take(&mut ctx.footnotes);

    let mut inner_ctx = RenderContext::new(ctx.config);
    inner_ctx.in_footnote = true;

    html! {
        section class=(classes::FOOTNOTE_LIST) {
            ol {
                @for entry in &footnotes {
                    li id=(format!("{}{}", classes::FOOTNOTE_ID_PREFIX, entry.index)) {
                        a class=(classes::FOOTNOTE_BACK) href=(format!("#{}{}", classes::FOOTNOTE_REF_ID_PREFIX, entry.index)) {
                            "[" (entry.display) "]"
                        }
                        " "
                        span class=(classes::FOOTNOTE_CONTENT) {
                            (render_elements(&entry.content, &mut inner_ctx))
                        }
                    }
                }
            }
        }
    }
}
