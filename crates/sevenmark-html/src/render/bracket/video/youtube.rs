//! YouTube video rendering (direct iframe embed)
//!
//! Embed URL: https://www.youtube.com/embed/{id}
//! Playlist URL: https://www.youtube.com/embed/videoseries?list={playlist}
//!
//! Parameters:
//!   - id: Video ID (required if no playlist)
//!   - playlist: Playlist ID (e.g., "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf")
//!   - width, height: Dimensions (default: 640x360)
//!   - start: Start time in seconds
//!   - end: End time in seconds
//!   - autoplay: Auto-play on load
//!   - loop: Loop video
//!   - mute: Start muted
//!   - nocontrols: Hide player controls

use maud::{Markup, html};
use sevenmark_parser::ast::Parameters;

use crate::classes;
use crate::render::utils::get_param;

fn build_embed_url(
    video_id: Option<&str>,
    playlist_id: Option<&str>,
    parameters: &Parameters,
) -> String {
    let mut params = Vec::new();

    // Playlist parameter
    if let Some(pl) = playlist_id {
        params.push(format!("list={}", pl));
    }

    if let Some(start) = get_param(parameters, "start") {
        params.push(format!("start={}", start));
    }
    if let Some(end) = get_param(parameters, "end") {
        params.push(format!("end={}", end));
    }
    if get_param(parameters, "autoplay").is_some() {
        params.push("autoplay=1".to_string());
    }
    if get_param(parameters, "loop").is_some() {
        params.push("loop=1".to_string());
        // For single video loop (no playlist), add playlist=id
        if playlist_id.is_none() {
            if let Some(id) = video_id {
                params.push(format!("playlist={}", id));
            }
        }
    }
    if get_param(parameters, "mute").is_some() {
        params.push("mute=1".to_string());
    }
    if get_param(parameters, "nocontrols").is_some() {
        params.push("controls=0".to_string());
    }

    // Base URL: videoseries for playlist-only, or video id
    let base = if playlist_id.is_some() && video_id.is_none() {
        "https://www.youtube.com/embed/videoseries".to_string()
    } else if let Some(id) = video_id {
        format!("https://www.youtube.com/embed/{}", id)
    } else {
        "https://www.youtube.com/embed/videoseries".to_string()
    };

    if params.is_empty() {
        base
    } else {
        format!("{}?{}", base, params.join("&"))
    }
}

pub fn render(parameters: &Parameters) -> Markup {
    let video_id = get_param(parameters, "id");
    let playlist_id = get_param(parameters, "playlist");

    if video_id.is_none() && playlist_id.is_none() {
        return html! {
            span class=(classes::ERROR) { "YouTube: missing id or playlist parameter" }
        };
    }

    let url = build_embed_url(video_id.as_deref(), playlist_id.as_deref(), parameters);
    let width = get_param(parameters, "width").unwrap_or_else(|| "640".to_string());
    let height = get_param(parameters, "height").unwrap_or_else(|| "360".to_string());

    html! {
        iframe
            class=(format!("{} {}", classes::EMBED, classes::EMBED_YOUTUBE))
            src=(url)
            width=(width)
            height=(height)
            frameborder="0"
            allowfullscreen
            loading="lazy"
        {}
    }
}
