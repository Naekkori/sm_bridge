//! Document-level rendering

use maud::{Markup, html};

use super::{brace, element, markdown};
use crate::classes;
use crate::config::RenderConfig;
use crate::context::RenderContext;
use crate::section::{Section, SectionTree, build_section_tree};
use sevenmark_parser::ast::Element;

/// Render a document to semantic HTML
///
/// # Arguments
/// * `ast` - The parsed AST elements
/// * `config` - Render configuration
pub fn render_document(ast: &[Element], config: &RenderConfig) -> String {
    let tree = build_section_tree(ast);
    let mut ctx = RenderContext::new(config);
    let content = render_section_tree(&tree, config, &mut ctx);

    let markup = html! {
        (content)
        @if !ctx.footnotes.is_empty() {
            (brace::footnote::render_list(&ctx))
        }
    };

    markup.into_string()
}

/// Render a section tree
fn render_section_tree(
    tree: &SectionTree<'_>,
    config: &RenderConfig,
    ctx: &mut RenderContext,
) -> Markup {
    html! {
        @for el in &tree.preamble {
            (element::render_element(el, ctx))
        }
        @for section in &tree.sections {
            (render_section(section, config, ctx))
        }
    }
}

/// Render a single section with nested structure
fn render_section(section: &Section<'_>, config: &RenderConfig, ctx: &mut RenderContext) -> Markup {
    let header_markup = markdown::header::render_with_path(
        section.header_level,
        section.header_section_index,
        section.header_children,
        &section.section_path,
        config,
        ctx,
    );

    let section_content = html! {
        div class=(classes::SECTION_CONTENT) {
            @for el in &section.content {
                (element::render_element(el, ctx))
            }
            @for child in &section.children {
                (render_section(child, config, ctx))
            }
        }
    };

    if section.header_is_folded {
        let class = format!("{} {}", classes::SECTION, classes::SECTION_FOLDED);
        html! {
            details class=(class) data-section=(section.header_section_index) {
                summary { (header_markup) }
                (section_content)
            }
        }
    } else {
        html! {
            details class=(classes::SECTION) data-section=(section.header_section_index) open {
                summary { (header_markup) }
                (section_content)
            }
        }
    }
}
