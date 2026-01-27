use crate::error::SevenMarkError;

macro_rules! context_setters {
    ($($name:ident => $field:ident),*) => {
        $(
            paste::paste! {
                /// [<$name:upper>] 컨텍스트로 전환
                pub fn [<set_ $name _context>](&mut self) {
                    self.$field = true;
                }

                /// [<$name:upper>] 컨텍스트 해제
                pub fn [<unset_ $name _context>](&mut self) {
                    self.$field = false;
                }
            }
        )*
    };
}

#[derive(Debug, Clone)]
pub struct ParseContext<'i> {
    pub recursion_depth: usize,
    pub trim_depth: usize,
    pub inside_header: bool,
    pub inside_bold: bool,
    pub inside_italic: bool,
    pub inside_strikethrough: bool,
    pub inside_subscript: bool,
    pub inside_superscript: bool,
    pub inside_underline: bool,
    pub inside_footnote: bool,
    pub inside_media_element: bool,
    pub original_input: &'i [u8],
    pub max_recursion_depth: usize,
    pub section_counter: usize,
    pub footnote_counter: usize,
}

impl<'i> ParseContext<'i> {
    /// 새 컨텍스트 생성
    pub fn new(input: &'i str) -> Self {
        Self {
            recursion_depth: 0,
            trim_depth: 0,
            inside_header: false,
            inside_bold: false,
            inside_italic: false,
            inside_strikethrough: false,
            inside_subscript: false,
            inside_superscript: false,
            inside_underline: false,
            inside_footnote: false,
            inside_media_element: false,
            original_input: input.as_bytes(),
            max_recursion_depth: 16,
            section_counter: 1,
            footnote_counter: 1,
        }
    }

    /// 현재 위치가 라인 시작인지 확인
    pub fn is_at_line_start(&self, position: usize) -> bool {
        position == 0 || self.original_input.get(position - 1) == Some(&b'\n')
    }

    /// 재귀 깊이 증가 (in-place)
    pub fn increase_depth(&mut self) -> Result<(), SevenMarkError> {
        let new_depth = self.recursion_depth + 1;
        if new_depth > self.max_recursion_depth {
            return Err(SevenMarkError::RecursionDepthExceeded {
                depth: new_depth,
                max_depth: self.max_recursion_depth,
            });
        }
        self.recursion_depth = new_depth;
        Ok(())
    }

    /// 재귀 깊이 감소 (in-place)
    pub fn decrease_depth(&mut self) {
        self.recursion_depth = self.recursion_depth.saturating_sub(1);
    }

    /// 최대 재귀 깊이에 도달했는지 확인
    pub fn is_at_max_depth(&self) -> bool {
        self.recursion_depth >= self.max_recursion_depth
    }

    /// 현재 재귀 깊이 반환
    pub fn current_depth(&self) -> usize {
        self.recursion_depth
    }

    /// 남은 재귀 깊이 반환
    pub fn remaining_depth(&self) -> usize {
        self.max_recursion_depth
            .saturating_sub(self.recursion_depth)
    }

    /// 다음 섹션 인덱스 반환 및 카운터 증가
    pub fn next_section_index(&mut self) -> usize {
        let idx = self.section_counter;
        self.section_counter += 1;
        idx
    }

    /// 다음 각주 인덱스 반환 및 카운터 증가
    pub fn next_footnote_index(&mut self) -> usize {
        let idx = self.footnote_counter;
        self.footnote_counter += 1;
        idx
    }

    /// trim_depth 증가
    pub fn increase_trim_depth(&mut self) {
        self.trim_depth += 1;
    }

    /// trim_depth 감소
    pub fn decrease_trim_depth(&mut self) {
        self.trim_depth = self.trim_depth.saturating_sub(1);
    }

    /// trim 컨텍스트 안에 있는지 확인
    pub fn is_trimming(&self) -> bool {
        self.trim_depth > 0
    }

    context_setters! {
        header => inside_header,
        bold => inside_bold,
        italic => inside_italic,
        strikethrough => inside_strikethrough,
        subscript => inside_subscript,
        superscript => inside_superscript,
        underline => inside_underline,
        footnote => inside_footnote,
        media_element => inside_media_element
    }
}
