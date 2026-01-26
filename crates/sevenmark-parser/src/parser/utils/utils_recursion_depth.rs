use crate::parser::ParserInput;
use winnow::Result;

/// 깊이 관리가 포함된 파서를 실행하는 헬퍼 함수
pub fn with_depth<T, F>(input: &mut ParserInput, parser: F) -> Result<T>
where
    F: FnOnce(&mut ParserInput) -> Result<T>,
{
    input
        .state
        .increase_depth()
        .map_err(|e| e.into_context_error())?;

    let result = parser(input);

    input.state.decrease_depth();

    result
}

/// trim 컨텍스트에서 파서를 실행하는 헬퍼 함수
/// }}} 앞의 whitespace를 trim하기 위한 컨텍스트 관리
pub fn with_trim<T, F>(input: &mut ParserInput, parser: F) -> Result<T>
where
    F: FnOnce(&mut ParserInput) -> Result<T>,
{
    input.state.increase_trim_depth();

    let result = parser(input);

    input.state.decrease_trim_depth();

    result
}

/// 깊이 관리 + trim 컨텍스트를 함께 적용하는 헬퍼 함수
pub fn with_depth_and_trim<T, F>(input: &mut ParserInput, parser: F) -> Result<T>
where
    F: FnOnce(&mut ParserInput) -> Result<T>,
{
    with_depth(input, |inner| with_trim(inner, parser))
}
