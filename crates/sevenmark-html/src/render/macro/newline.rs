//! Line break rendering (SoftBreak and HardBreak)

use maud::{Markup, html};

use crate::context::RenderContext;

/// Render SoftBreak - only renders <br> when not inside brace elements
pub fn render_soft_break(ctx: &RenderContext) -> Markup {
    html! {
        @if !ctx.is_soft_break_suppressed() {
            br;
        }
    }
}

/// Render HardBreak - always renders <br>
pub fn render_hard_break() -> Markup {
    html! { br; }
}
