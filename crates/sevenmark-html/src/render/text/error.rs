//! Error element rendering

use maud::{Markup, html};

use crate::classes;

pub fn render(value: &str) -> Markup {
    html! { span class=(classes::ERROR) { (value) } }
}
