pub mod document_files;
pub mod document_metadata;
pub mod document_revisions;

pub use document_files::{Column as DocumentFilesColumn, Entity as DocumentFiles};
pub use document_metadata::{Column as DocumentMetadataColumn, Entity as DocumentMetadata};
pub use document_revisions::{Column as DocumentRevisionsColumn, Entity as DocumentRevisions};
