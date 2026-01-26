use crate::context::ParseContext;
use winnow::stream::{LocatingSlice, Stateful};

mod brace;
mod bracket;
mod comment;
pub mod document;
pub mod element;
pub mod escape;
mod r#macro;
pub mod markdown;
mod mention;
mod parameter;

mod expr;
pub mod text;
pub mod token;
mod utils;

pub type InputSource<'i> = LocatingSlice<&'i str>;

pub type ParserInput<'i> = Stateful<InputSource<'i>, ParseContext>;
