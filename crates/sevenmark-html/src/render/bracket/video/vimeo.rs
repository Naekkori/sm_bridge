//! Vimeo video rendering (direct iframe embed)
//!
//! Embed URL: https://player.vimeo.com/video/{id}
//!
//! Parameters:
//!   - id: Video ID (required)
//!   - h: Hash for unlisted videos
//!   - width, height: Dimensions (default: 640x360)
//!   - autoplay: Auto-play on load
//!   - loop: Loop video
//!   - mute: Start muted
//!   - color: Player accent color (hex without #)
//!   - dnt: Do Not Track mode

use maud::{Markup, html};
use sevenmark_parser::ast::Parameters;

use crate::classes;
use crate::render::utils::get_param;

fn build_embed_url(id: &str, parameters: &Parameters) -> String {
    let mut params = Vec::new();

    if let Some(h) = get_param(parameters, "h") {
        params.push(format!("h={}", h));
    }
    if get_param(parameters, "autoplay").is_some() {
        params.push("autoplay=1".to_string());
    }
    if get_param(parameters, "loop").is_some() {
        params.push("loop=1".to_string());
    }
    if get_param(parameters, "mute").is_some() {
        params.push("muted=1".to_string());
    }
    if let Some(color) = get_param(parameters, "color") {
        let color = color.trim_start_matches('#');
        params.push(format!("color={}", color));
    }
    if get_param(parameters, "dnt").is_some() {
        params.push("dnt=1".to_string());
    }

    if params.is_empty() {
        format!("https://player.vimeo.com/video/{}", id)
    } else {
        format!("https://player.vimeo.com/video/{}?{}", id, params.join("&"))
    }
}

pub fn render(parameters: &Parameters) -> Markup {
    let id = match get_param(parameters, "id") {
        Some(id) => id,
        None => {
            return html! {
                span class=(classes::ERROR) { "Vimeo: missing id parameter" }
            };
        }
    };

    let url = build_embed_url(&id, parameters);
    let width = get_param(parameters, "width").unwrap_or_else(|| "640".to_string());
    let height = get_param(parameters, "height").unwrap_or_else(|| "360".to_string());

    html! {
        iframe
            class=(format!("{} {}", classes::EMBED, classes::EMBED_VIMEO))
            src=(url)
            width=(width)
            height=(height)
            frameborder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowfullscreen
            loading="lazy"
        {}
    }
}
