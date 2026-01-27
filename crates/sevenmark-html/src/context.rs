//! Rendering context for footnote tracking

use sevenmark_parser::ast::Element;

use crate::config::RenderConfig;

/// Footnote entry for collection
#[derive(Debug, Clone)]
pub struct FootnoteEntry {
    /// Footnote index (1-based, from parser)
    pub index: usize,
    /// Display text (from #display parameter or auto-generated number)
    pub display: String,
    /// Footnote content (to be rendered later)
    pub content: Vec<Element>,
}

/// Simple rendering context - only tracks footnotes
pub struct RenderContext<'a> {
    /// Collected footnotes (rendered at document end)
    pub footnotes: Vec<FootnoteEntry>,
    /// Track if we are inside a footnote (to prevent nested footnotes)
    pub in_footnote: bool,
    /// Track depth of elements that suppress SoftBreak rendering
    /// (SoftBreak renders as <br> only when this is 0)
    pub suppress_soft_breaks_depth: usize,
    /// Render configuration
    pub config: &'a RenderConfig<'a>,
}

impl<'a> RenderContext<'a> {
    /// Creates a new render context with config
    pub fn new(config: &'a RenderConfig<'a>) -> Self {
        Self {
            footnotes: Vec::new(),
            in_footnote: false,
            suppress_soft_breaks_depth: 0,
            config,
        }
    }

    /// Enter a context that suppresses SoftBreak rendering
    pub fn enter_suppress_soft_breaks(&mut self) {
        self.suppress_soft_breaks_depth += 1;
    }

    /// Exit a context that suppresses SoftBreak rendering
    pub fn exit_suppress_soft_breaks(&mut self) {
        self.suppress_soft_breaks_depth = self.suppress_soft_breaks_depth.saturating_sub(1);
    }

    /// Check if SoftBreak should be suppressed
    pub fn is_soft_break_suppressed(&self) -> bool {
        self.suppress_soft_breaks_depth > 0
    }

    /// Adds a footnote entry and returns reference to the display text
    pub fn add_footnote(
        &mut self,
        index: usize,
        display: Option<String>,
        content: Vec<Element>,
    ) -> &str {
        let display = display.unwrap_or_else(|| index.to_string());

        self.footnotes.push(FootnoteEntry {
            index,
            display,
            content,
        });

        // Return reference to the display we just pushed
        &self.footnotes.last().unwrap().display
    }
}
