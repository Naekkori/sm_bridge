//! Element-level rendering

use maud::{Markup, html};
use sevenmark_parser::ast::{AstNode, NodeKind};

use super::{brace, bracket, r#macro, markdown, mention, text};
use crate::context::RenderContext;

/// Render multiple elements
pub fn render_elements(elements: &[AstNode], ctx: &mut RenderContext) -> Markup {
    html! {
        @for el in elements {
            (render_element(el, ctx))
        }
    }
}

/// Render a single element (dispatch to specific renderers)
pub fn render_element(el: &AstNode, ctx: &mut RenderContext) -> Markup {
    match &el.kind {
        // Text elements
        NodeKind::Text { value } => text::text::render(value),
        NodeKind::Escape { value } => text::escape::render(value),
        NodeKind::Comment { .. } => html! {},
        NodeKind::Error { value } => text::error::render(value),

        // Markdown text styles
        NodeKind::Bold { children } => markdown::bold::render(children, ctx),
        NodeKind::Italic { children } => markdown::italic::render(children, ctx),
        NodeKind::Strikethrough { children } => markdown::strikethrough::render(children, ctx),
        NodeKind::Underline { children } => markdown::underline::render(children, ctx),
        NodeKind::Superscript { children } => markdown::superscript::render(children, ctx),
        NodeKind::Subscript { children } => markdown::subscript::render(children, ctx),

        // Header (handled by section tree, should not appear in content)
        NodeKind::Header { .. } => html! {},

        // Block elements
        NodeKind::BlockQuote {
            parameters,
            children,
        } => brace::blockquote::render(parameters, children, ctx),
        NodeKind::Literal { children } => brace::literal::render(children, ctx),
        NodeKind::Styled {
            parameters,
            children,
        } => brace::styled::render(parameters, children, ctx),
        NodeKind::Fold {
            parameters,
            children,
        } => brace::fold::render(parameters, children, ctx),
        NodeKind::Ruby {
            parameters,
            children,
        } => brace::ruby::render(parameters, children, ctx),
        NodeKind::Code { parameters, value } => brace::code::render(parameters, value),
        NodeKind::TeX { is_block, value } => brace::tex::render(*is_block, value),

        // Container elements
        NodeKind::List {
            kind,
            parameters,
            children,
        } => brace::list::render(kind, parameters, children, ctx),
        NodeKind::Table {
            parameters,
            children,
        } => brace::table::render(parameters, children, ctx),

        // Media
        NodeKind::Media {
            parameters,
            children,
            resolved_info,
        } => bracket::media::render(parameters, children, resolved_info.as_ref(), ctx),

        // External Media (YouTube, Vimeo, NicoNico, Spotify)
        NodeKind::ExternalMedia {
            provider,
            parameters,
        } => bracket::video::render(provider, parameters),

        // Footnotes
        NodeKind::Footnote {
            footnote_index,
            parameters,
            children,
        } => brace::footnote::render(*footnote_index, parameters, children, ctx),
        NodeKind::FootnoteRef => r#macro::footnote::render(ctx),

        // Line breaks
        NodeKind::SoftBreak => r#macro::newline::render_soft_break(ctx),
        NodeKind::HardBreak => r#macro::newline::render_hard_break(),

        // Macros
        NodeKind::HLine => r#macro::hline::render(),
        NodeKind::TimeNow => r#macro::timenow::render(),
        NodeKind::Age { date } => r#macro::age::render(date),

        // Wiki elements (metadata, not rendered visually)
        NodeKind::Category { .. } => html! {},
        NodeKind::Redirect { .. } => html! {},
        NodeKind::Include { children, .. } => brace::include::render(children, ctx),
        NodeKind::Define { .. } => html! {},
        NodeKind::Variable { name } => text::variable::render(name),
        NodeKind::If { .. } => html! {},

        // Mentions
        NodeKind::Mention { kind, id } => mention::mention::render(kind, id),

        NodeKind::Null => html! {},

        // Table/List internal elements (should not appear at top level)
        NodeKind::TableRow { .. }
        | NodeKind::TableCell { .. }
        | NodeKind::ConditionalTableRows { .. }
        | NodeKind::ConditionalTableCells { .. }
        | NodeKind::ListItem { .. }
        | NodeKind::ConditionalListItems { .. }
        | NodeKind::FoldInner { .. } => html! {},

        // Expression nodes (used in conditions, not rendered)
        NodeKind::ExprOr { .. }
        | NodeKind::ExprAnd { .. }
        | NodeKind::ExprNot { .. }
        | NodeKind::ExprComparison { .. }
        | NodeKind::ExprFunctionCall { .. }
        | NodeKind::ExprStringLiteral { .. }
        | NodeKind::ExprNumberLiteral { .. }
        | NodeKind::ExprBoolLiteral { .. }
        | NodeKind::ExprNull
        | NodeKind::ExprGroup { .. } => html! {},
    }
}
