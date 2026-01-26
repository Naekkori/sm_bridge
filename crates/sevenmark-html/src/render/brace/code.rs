//! Code block rendering

use maud::{Markup, html};
use sevenmark_parser::ast::Parameters;

use crate::classes;
use crate::render::utils;

pub fn render(parameters: &Parameters, value: &str) -> Markup {
    let lang = utils::get_param(parameters, "lang");
    html! {
        pre class=(classes::CODE) {
            code data-lang=[lang] { (value) }
        }
    }
}
