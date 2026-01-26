//! Variable element rendering

use maud::{Markup, html};

use crate::classes;

pub fn render(name: &str) -> Markup {
    html! { span class=(classes::VARIABLE) data-name=(name) { (name) } }
}
