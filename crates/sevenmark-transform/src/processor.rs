use crate::wiki::SeaweedFsClient;
use crate::{ProcessedDocument, postprocess_sevenmark, preprocess_sevenmark};
use anyhow::Result;
use sea_orm::DatabaseConnection;
use sevenmark_parser::ast::Element;

/// Processes SevenMark AST through preprocessing and postprocessing pipeline
///
/// This function orchestrates the full document processing:
/// 1. Preprocessing: Variable substitution, include resolution, media collection
/// 2. Postprocessing: Media reference resolution (file URLs, document/category links)
pub async fn process_sevenmark(
    ast: Vec<Element>,
    db: &DatabaseConnection,
    seaweedfs: &SeaweedFsClient,
) -> Result<ProcessedDocument> {
    // Step 1: Preprocess - resolve includes and collect media references
    let preprocessed = preprocess_sevenmark(ast, db, seaweedfs).await?;

    // Step 2: Postprocess - resolve media references to URLs
    let processed = postprocess_sevenmark(preprocessed, db).await?;

    Ok(processed)
}
