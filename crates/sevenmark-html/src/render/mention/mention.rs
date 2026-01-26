//! Mention element rendering

use maud::{Markup, html};
use sevenmark_parser::ast::MentionType;

use crate::classes;

pub fn render(kind: &MentionType, id: &str) -> Markup {
    let class = match kind {
        MentionType::User => classes::MENTION_USER,
        MentionType::Discussion => classes::MENTION_DISCUSSION,
    };

    html! {
        span class=(class) data-uuid=(id) {}
    }
}
