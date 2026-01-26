use crate::parser::ParserInput;
use winnow::Result;
use winnow::combinator::seq;
use winnow::prelude::*;
use winnow::token::{literal, take_while};

/// UUID 파서: 8-4-4-4-12 형식 (32자 hex + 4개 하이픈 = 36자)
pub fn parse_uuid(parser_input: &mut ParserInput) -> Result<String> {
    let (part1, _, part2, _, part3, _, part4, _, part5) = seq!(
        take_while(8..=8, |c: char| c.is_ascii_hexdigit()),
        literal("-"),
        take_while(4..=4, |c: char| c.is_ascii_hexdigit()),
        literal("-"),
        take_while(4..=4, |c: char| c.is_ascii_hexdigit()),
        literal("-"),
        take_while(4..=4, |c: char| c.is_ascii_hexdigit()),
        literal("-"),
        take_while(12..=12, |c: char| c.is_ascii_hexdigit()),
    )
    .parse_next(parser_input)?;

    Ok(format!("{}-{}-{}-{}-{}", part1, part2, part3, part4, part5))
}
