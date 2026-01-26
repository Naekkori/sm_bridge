//! TeX rendering

use maud::{Markup, html};

use crate::classes;

pub fn render(is_block: bool, value: &str) -> Markup {
    if is_block {
        html! { div class=(format!("{} {}", classes::TEX, classes::TEX_BLOCK)) data-tex=(value) { (value) } }
    } else {
        html! { span class=(format!("{} {}", classes::TEX, classes::TEX_INLINE)) data-tex=(value) { (value) } }
    }
}
