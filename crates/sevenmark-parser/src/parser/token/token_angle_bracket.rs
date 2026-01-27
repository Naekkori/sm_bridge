use crate::ast::{Element, Span, TextElement};
use crate::parser::ParserInput;
use winnow::Result;
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

/// `<` 토큰 파서: 멘션 파서가 실패한 경우 `<`를 Text로 변환
pub fn token_angle_bracket_parser(parser_input: &mut ParserInput) -> Result<Element> {
    let start = parser_input.current_token_start();
    literal("<").parse_next(parser_input)?;
    let end = parser_input.previous_token_end();

    Ok(Element::Text(TextElement {
        span: Span { start, end },
        value: "<".to_string(),
    }))
}
