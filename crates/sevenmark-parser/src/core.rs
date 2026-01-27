use crate::ast::{Element, ErrorElement, Span};
use crate::context::ParseContext;
use crate::parser::document::document_parser;
use crate::parser::{InputSource, ParserInput};
use winnow::stream::Location as StreamLocation;

pub fn parse_document(input: &str) -> Vec<Element> {
    let context = ParseContext::new(input);

    let mut stateful_input = ParserInput {
        input: InputSource::new(input),
        state: context,
    };

    match document_parser(&mut stateful_input) {
        Ok(mut elements) => {
            // Parse remaining content as Error element if any
            if !stateful_input.input.is_empty() {
                let start = stateful_input.current_token_start();
                let remaining = stateful_input.input.to_string();
                let end = start + remaining.len();

                elements.push(Element::Error(ErrorElement {
                    span: Span { start, end },
                    value: remaining,
                }));
            }
            elements
        }
        Err(_) => {
            // If parser fails, treat entire input as single Error element
            vec![Element::Error(ErrorElement {
                span: Span {
                    start: 0,
                    end: input.len(),
                },
                value: input.to_string(),
            })]
        }
    }
}
