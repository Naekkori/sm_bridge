//! TimeNow macro rendering

use maud::{Markup, html};

use crate::classes;

pub fn render() -> Markup {
    html! { span class=(classes::TIMENOW) {} }
}
