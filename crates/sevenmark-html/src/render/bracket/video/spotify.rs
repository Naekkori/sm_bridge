//! Spotify audio/podcast rendering (direct iframe embed)
//!
//! Embed URL: https://open.spotify.com/embed/{type}/{id}
//!
//! Parameters:
//!   - track: Track ID
//!   - album: Album ID
//!   - playlist: Playlist ID
//!   - artist: Artist ID
//!   - episode: Podcast episode ID
//!   - show: Podcast show ID
//!   - width, height: Dimensions (default: 100%, 352)
//!   - dark: Dark theme (presence = enabled)
//!   - compact: Compact cover art view (presence = enabled)
//!
//! Note: One of track/album/playlist/artist/episode/show is required

use maud::{Markup, html};
use sevenmark_parser::ast::Parameters;

use crate::classes;
use crate::render::utils::get_param;

fn get_content_type_and_id(parameters: &Parameters) -> Option<(&'static str, String)> {
    if let Some(id) = get_param(parameters, "track") {
        return Some(("track", id));
    }
    if let Some(id) = get_param(parameters, "album") {
        return Some(("album", id));
    }
    if let Some(id) = get_param(parameters, "playlist") {
        return Some(("playlist", id));
    }
    if let Some(id) = get_param(parameters, "artist") {
        return Some(("artist", id));
    }
    if let Some(id) = get_param(parameters, "episode") {
        return Some(("episode", id));
    }
    if let Some(id) = get_param(parameters, "show") {
        return Some(("show", id));
    }
    None
}

fn build_embed_url(content_type: &str, id: &str, parameters: &Parameters) -> String {
    let mut params = Vec::new();

    if get_param(parameters, "dark").is_some() {
        params.push("theme=0".to_string());
    }
    if get_param(parameters, "compact").is_some() {
        params.push("view=coverart".to_string());
    }

    if params.is_empty() {
        format!("https://open.spotify.com/embed/{}/{}", content_type, id)
    } else {
        format!(
            "https://open.spotify.com/embed/{}/{}?{}",
            content_type,
            id,
            params.join("&")
        )
    }
}

pub fn render(parameters: &Parameters) -> Markup {
    let (content_type, id) = match get_content_type_and_id(parameters) {
        Some(result) => result,
        None => {
            return html! {
                span class=(classes::ERROR) {
                    "Spotify: missing content parameter (track, album, playlist, artist, episode, or show)"
                }
            };
        }
    };

    let url = build_embed_url(content_type, &id, parameters);
    let width = get_param(parameters, "width").unwrap_or_else(|| "100%".to_string());
    let height = get_param(parameters, "height").unwrap_or_else(|| "352".to_string());

    html! {
        iframe
            class=(format!("{} {}", classes::EMBED, classes::EMBED_SPOTIFY))
            src=(url)
            width=(width)
            height=(height)
            frameborder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowfullscreen
            loading="lazy"
        {}
    }
}
