use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

use super::Element;

/// 소스 코드 위치 정보 (바이트 오프셋)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Span {
    pub start: usize,
    pub end: usize,
}

impl Span {
    pub fn new(start: usize, end: usize) -> Self {
        Self { start, end }
    }
    /// Creates a synthesized span for elements generated during preprocessing
    pub fn synthesized() -> Self {
        Self { start: 0, end: 0 }
    }
}

/// Individual parameter with span tracking
#[derive(Debug, Clone, Serialize)]
pub struct Parameter {
    #[cfg_attr(not(feature = "include_locations"), serde(skip_serializing))]
    pub span: Span,
    pub key: String,
    pub value: Vec<Element>,
}

/// 파라미터 맵: key-value 쌍으로 각 value는 Parameter 구조체 (span 포함)
/// BTreeMap을 사용하여 키 순서를 일관되게 유지
pub type Parameters = BTreeMap<String, Parameter>;
