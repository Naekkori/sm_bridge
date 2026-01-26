use crate::ast::{AstNode, Location, NodeKind};
use crate::parser::ParserInput;
use crate::parser::element::element_parser;
use crate::parser::parameter::parameter_core_parser;
use crate::parser::utils::with_depth_and_trim;
use winnow::Result;
use winnow::ascii::multispace0;
use winnow::combinator::{delimited, opt};
use winnow::prelude::*;
use winnow::stream::Location as StreamLocation;
use winnow::token::literal;

/// Parse footnote elements enclosed in {{{#fn }}}
pub fn brace_footnote_parser(parser_input: &mut ParserInput) -> Result<AstNode> {
    if parser_input.state.inside_footnote {
        return Err(winnow::error::ContextError::new());
    }
    let start = parser_input.input.current_token_start();

    let ((parameters, _), parsed_content) = delimited(
        literal("{{{#fn"),
        (
            (opt(parameter_core_parser), multispace0),
            |input: &mut ParserInput| {
                input.state.set_footnote_context();
                let result = with_depth_and_trim(input, element_parser);
                input.state.unset_footnote_context();
                result
            },
        ),
        (multispace0, literal("}}}")),
    )
    .parse_next(parser_input)?;
    let end = parser_input.input.previous_token_end();

    let footnote_index = parser_input.state.next_footnote_index();

    Ok(AstNode::new(
        Location { start, end },
        NodeKind::Footnote {
            footnote_index,
            parameters: parameters.unwrap_or_default(),
            children: parsed_content,
        },
    ))
}
