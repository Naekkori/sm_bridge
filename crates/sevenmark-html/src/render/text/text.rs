//! Text element rendering

use maud::{Markup, html};

pub fn render(value: &str) -> Markup {
    html! { (value) }
}
