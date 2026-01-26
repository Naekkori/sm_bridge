use sea_orm::{DeriveActiveEnum, EnumIter};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// 문서 namespace (백엔드 API 스펙 & DB enum)
#[derive(
    Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash, ToSchema, EnumIter, DeriveActiveEnum,
)]
#[sea_orm(rs_type = "String", db_type = "Enum", enum_name = "document_namespace")]
pub enum DocumentNamespace {
    #[sea_orm(string_value = "document")]
    Document,
    #[sea_orm(string_value = "file")]
    File,
    #[sea_orm(string_value = "category")]
    Category,
}

/// 문서 응답
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentResponse {
    pub id: String,
    pub namespace: DocumentNamespace,
    pub title: String,
    pub current_revision: DocumentRevision,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_url: Option<String>,
}

/// 문서 revision 정보
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentRevision {
    pub content: String,
}

/// 문서 존재 확인 응답 (경량 - 링크 색상 결정용)
#[derive(Debug, Clone)]
pub struct DocumentExistence {
    pub namespace: DocumentNamespace,
    pub title: String,
    pub exists: bool,
    /// File namespace일 경우 파일 URL
    pub file_url: Option<String>,
    /// File namespace일 경우 이미지 너비
    pub file_width: Option<i32>,
    /// File namespace일 경우 이미지 높이
    pub file_height: Option<i32>,
}
