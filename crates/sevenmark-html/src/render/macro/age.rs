//! Age macro rendering

use maud::{Markup, html};

use crate::classes;

pub fn render(date: &str) -> Markup {
    html! { span class=(classes::AGE) data-date=(date) {} }
}
