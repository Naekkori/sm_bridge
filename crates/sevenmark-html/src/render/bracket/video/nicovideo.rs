//! NicoNico (nicovideo) video rendering (direct iframe embed)
//!
//! Embed URL: https://embed.nicovideo.jp/watch/{id}
//!
//! Parameters:
//!   - id: Video ID (required, e.g., "sm9", "so39402840")
//!   - width, height: Dimensions (default: 640x360)
//!   - from: Start time in seconds
//!   - autoplay: Auto-play (present = enabled)

use maud::{Markup, html};
use sevenmark_parser::ast::Parameters;

use crate::classes;
use crate::render::utils::get_param;

fn build_embed_url(id: &str, parameters: &Parameters) -> String {
    let mut params = Vec::new();

    if let Some(from) = get_param(parameters, "from") {
        params.push(format!("from={}", from));
    }
    if get_param(parameters, "autoplay").is_some() {
        params.push("autoplay=1".to_string());
    }

    if params.is_empty() {
        format!("https://embed.nicovideo.jp/watch/{}", id)
    } else {
        format!(
            "https://embed.nicovideo.jp/watch/{}?{}",
            id,
            params.join("&")
        )
    }
}

pub fn render(parameters: &Parameters) -> Markup {
    let id = match get_param(parameters, "id") {
        Some(id) => id,
        None => {
            return html! {
                span class=(classes::ERROR) { "NicoNico: missing id parameter" }
            };
        }
    };

    let url = build_embed_url(&id, parameters);
    let width = get_param(parameters, "width").unwrap_or_else(|| "640".to_string());
    let height = get_param(parameters, "height").unwrap_or_else(|| "360".to_string());

    html! {
        iframe
            class=(format!("{} {}", classes::EMBED, classes::EMBED_NICOVIDEO))
            src=(url)
            width=(width)
            height=(height)
            frameborder="0"
            allow="autoplay"
            allowfullscreen
            loading="lazy"
        {}
    }
}
