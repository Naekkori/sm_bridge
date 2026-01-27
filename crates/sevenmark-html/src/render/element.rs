//! Element-level rendering

use maud::{Markup, html};
use sevenmark_parser::ast::Element;

use super::{brace, bracket, r#macro, markdown, mention, text};
use crate::context::RenderContext;

/// Render multiple elements
pub fn render_elements(elements: &[Element], ctx: &mut RenderContext) -> Markup {
    html! {
        @for el in elements {
            (render_element(el, ctx))
        }
    }
}

/// Render a single element (dispatch to specific renderers)
pub fn render_element(el: &Element, ctx: &mut RenderContext) -> Markup {
    match el {
        // Text elements
        Element::Text(text_el) => text::text::render(&text_el.value),
        Element::Escape(escape_el) => text::escape::render(&escape_el.value),
        Element::Comment(_) => html! {},
        Element::Error(error_el) => text::error::render(&error_el.value),

        // Markdown text styles
        Element::Bold(style_el) => markdown::bold::render(&style_el.children, ctx),
        Element::Italic(style_el) => markdown::italic::render(&style_el.children, ctx),
        Element::Strikethrough(style_el) => {
            markdown::strikethrough::render(&style_el.children, ctx)
        }
        Element::Underline(style_el) => markdown::underline::render(&style_el.children, ctx),
        Element::Superscript(style_el) => markdown::superscript::render(&style_el.children, ctx),
        Element::Subscript(style_el) => markdown::subscript::render(&style_el.children, ctx),

        // Header (handled by section tree, should not appear in content)
        Element::Header(_) => html! {},

        // Block elements
        Element::BlockQuote(bq) => brace::blockquote::render(&bq.parameters, &bq.children, ctx),
        Element::Literal(lit) => brace::literal::render(&lit.children, ctx),
        Element::Styled(styled) => brace::styled::render(&styled.parameters, &styled.children, ctx),
        Element::Fold(fold) => brace::fold::render(fold, ctx),
        Element::Ruby(ruby) => brace::ruby::render(&ruby.parameters, &ruby.children, ctx),
        Element::Code(code) => brace::code::render(&code.parameters, &code.value),
        Element::TeX(tex) => brace::tex::render(tex.is_block, &tex.value),

        // Container elements
        Element::List(list) => {
            brace::list::render(&list.kind, &list.parameters, &list.children, ctx)
        }
        Element::Table(table) => brace::table::render(&table.parameters, &table.children, ctx),

        // Media
        Element::Media(media) => bracket::media::render(
            &media.parameters,
            &media.children,
            media.resolved_info.as_ref(),
            ctx,
        ),

        // External Media (YouTube, Vimeo, NicoNico, Spotify)
        Element::ExternalMedia(ext_media) => {
            bracket::video::render(&ext_media.provider, &ext_media.parameters)
        }

        // Footnotes
        Element::Footnote(footnote) => brace::footnote::render(
            footnote.footnote_index,
            &footnote.parameters,
            &footnote.children,
            ctx,
        ),
        Element::FootnoteRef(_) => r#macro::footnote::render(ctx),

        // Line breaks
        Element::SoftBreak(_) => r#macro::newline::render_soft_break(ctx),
        Element::HardBreak(_) => r#macro::newline::render_hard_break(),

        // Macros
        Element::HLine(_) => r#macro::hline::render(),
        Element::TimeNow(_) => r#macro::timenow::render(),
        Element::Age(age) => r#macro::age::render(&age.date),

        // Wiki elements (metadata, not rendered visually)
        Element::Category(_) => html! {},
        Element::Redirect(_) => html! {},
        Element::Include(include) => brace::include::render(&include.children, ctx),
        Element::Define(_) => html! {},
        Element::Variable(var) => text::variable::render(&var.name),
        Element::If(_) => html! {},

        // Mentions
        Element::Mention(mention_el) => mention::mention::render(&mention_el.kind, &mention_el.id),

        Element::Null(_) => html! {},
    }
}
