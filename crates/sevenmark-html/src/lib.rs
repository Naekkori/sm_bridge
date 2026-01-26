//! sevenmark-html - Semantic HTML renderer for SevenMark AST
//!
//! Renders SevenMark AST to clean semantic HTML for SEO purposes.
//!
//! # Example
//!
//! ```rust
//! use sevenmark_parser::core::parse_document;
//! use sevenmark_html::{RenderConfig, render_document};
//!
//! let ast = parse_document("# Hello\n\nThis is **bold** text.");
//! let config = RenderConfig { edit_url: Some("/edit/title"), ..Default::default() };
//! let html = render_document(&ast, &config);
//! ```

pub mod classes;
mod config;
mod context;
mod render;
mod section;

pub use config::RenderConfig;
pub use render::{render_document, render_element, render_elements};
