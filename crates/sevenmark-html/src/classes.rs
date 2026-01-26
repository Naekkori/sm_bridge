//! CSS class name constants for SevenMark HTML rendering
//!
//! All class names use the `sm-` prefix for namespacing.
//! Frontend CSS should target these classes for styling.

pub const FOOTNOTE_LIST: &str = "sm-footnotes";

// Headers
pub const HEADER: &str = "sm-header";
pub const HEADER_1: &str = "sm-h1";
pub const HEADER_2: &str = "sm-h2";
pub const HEADER_3: &str = "sm-h3";
pub const HEADER_4: &str = "sm-h4";
pub const HEADER_5: &str = "sm-h5";
pub const HEADER_6: &str = "sm-h6";

// Text formatting
pub const BOLD: &str = "sm-bold";
pub const ITALIC: &str = "sm-italic";
pub const STRIKETHROUGH: &str = "sm-strike";
pub const UNDERLINE: &str = "sm-underline";
pub const SUPERSCRIPT: &str = "sm-sup";
pub const SUBSCRIPT: &str = "sm-sub";

// Block elements
pub const BLOCKQUOTE: &str = "sm-blockquote";
pub const FOLD: &str = "sm-fold";
pub const FOLD_SUMMARY: &str = "sm-fold-summary";
pub const STYLED: &str = "sm-styled";
pub const LITERAL: &str = "sm-literal";

// Code and TeX
pub const CODE: &str = "sm-code";
pub const CODE_INLINE: &str = "sm-code-inline";
pub const CODE_BLOCK: &str = "sm-code-block";
pub const TEX: &str = "sm-tex";
pub const TEX_INLINE: &str = "sm-tex-inline";
pub const TEX_BLOCK: &str = "sm-tex-block";

// Lists
pub const LIST: &str = "sm-list";
pub const LIST_ORDERED: &str = "sm-list-ordered";
pub const LIST_UNORDERED: &str = "sm-list-unordered";

// Tables
pub const TABLE_WRAPPER: &str = "sm-table-wrapper";
pub const TABLE: &str = "sm-table";

// Media
pub const MEDIA: &str = "sm-media";
pub const MEDIA_IMAGE: &str = "sm-image";
pub const MEDIA_IMAGE_BROKEN: &str = "sm-image-broken";
pub const MEDIA_LINK: &str = "sm-link";
pub const MEDIA_LINK_INVALID: &str = "sm-link-invalid";

// External Media Embeds
pub const EMBED: &str = "sm-embed";
pub const EMBED_YOUTUBE: &str = "sm-embed-youtube";
pub const EMBED_VIMEO: &str = "sm-embed-vimeo";
pub const EMBED_NICOVIDEO: &str = "sm-embed-nicovideo";
pub const EMBED_SPOTIFY: &str = "sm-embed-spotify";
pub const EMBED_DISCORD: &str = "sm-embed-discord";

// Footnotes
pub const FOOTNOTE: &str = "sm-footnote";
pub const FOOTNOTE_REF: &str = "sm-fn-ref";
pub const FOOTNOTE_CONTENT: &str = "sm-fn-content";
pub const FOOTNOTE_BACK: &str = "sm-fn-back";
/// Footnote ID prefix (e.g., "fn1", "fn2")
pub const FOOTNOTE_ID_PREFIX: &str = "fn";
/// Footnote reference ID prefix (e.g., "rn1", "rn2")
pub const FOOTNOTE_REF_ID_PREFIX: &str = "rn";

// Section structure
pub const SECTION: &str = "sm-section";
pub const SECTION_FOLDED: &str = "sm-folded";
pub const SECTION_CONTENT: &str = "sm-section-content";
pub const SECTION_PATH: &str = "sm-section-path";
pub const HEADER_CONTENT: &str = "sm-header-content";
pub const EDIT_LINK: &str = "sm-edit-link";
/// Section ID prefix (e.g., "s-1", "s-1.1")
pub const SECTION_ID_PREFIX: &str = "s-";

// Ruby
pub const RUBY: &str = "sm-ruby";

// Macros (client-rendered)
pub const AGE: &str = "sm-age";
pub const TIMENOW: &str = "sm-timenow";

// Variables
pub const VARIABLE: &str = "sm-variable";

// Mentions
pub const MENTION_USER: &str = "sm-mention-user";
pub const MENTION_DISCUSSION: &str = "sm-mention-discussion";

// Include
pub const INCLUDE: &str = "sm-include";

// Errors
pub const ERROR: &str = "sm-error";
