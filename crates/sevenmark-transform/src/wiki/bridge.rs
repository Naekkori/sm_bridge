use super::entity::{
    DocumentFiles, DocumentFilesColumn, DocumentMetadata, DocumentMetadataColumn,
    DocumentRevisions, DocumentRevisionsColumn,
};
use super::seaweedfs::SeaweedFsClient;
use super::types::{DocumentExistence, DocumentNamespace, DocumentResponse, DocumentRevision};
use anyhow::{Context, Result};
use futures::future::join_all;
use sea_orm::{ColumnTrait, Condition, DatabaseConnection, EntityTrait, QueryFilter};
use std::collections::HashMap;
use tracing::debug;
use uuid::Uuid;

/// Fetch multiple documents by namespace and title using Sea ORM
pub async fn fetch_documents_batch(
    db: &DatabaseConnection,
    seaweedfs: &SeaweedFsClient,
    requests: Vec<(DocumentNamespace, String)>,
) -> Result<Vec<DocumentResponse>> {
    if requests.is_empty() {
        debug!("No documents to fetch");
        return Ok(Vec::new());
    }

    debug!("Fetching {} documents from database", requests.len());

    // Group by namespace for optimized IN clause query
    let mut by_namespace: HashMap<DocumentNamespace, Vec<String>> = HashMap::new();
    for (namespace, title) in &requests {
        by_namespace
            .entry(namespace.clone())
            .or_default()
            .push(title.clone());
    }

    // Build optimized condition: (ns=X AND title IN (...)) OR (ns=Y AND title IN (...))
    let mut condition = Condition::any();
    for (namespace, titles) in &by_namespace {
        condition = condition.add(
            Condition::all()
                .add(DocumentMetadataColumn::Namespace.eq(namespace.clone()))
                .add(DocumentMetadataColumn::Title.is_in(titles.clone())),
        );
    }

    // Query document metadata
    let metadata_list = DocumentMetadata::find()
        .filter(condition)
        .all(db)
        .await
        .context("Failed to fetch document metadata")?;

    if metadata_list.is_empty() {
        debug!("No documents found");
        return Ok(Vec::new());
    }

    // Extract revision IDs
    let revision_ids: Vec<Uuid> = metadata_list
        .iter()
        .filter_map(|doc| doc.current_revision_id)
        .collect();

    // Fetch revisions in batch (get storage_keys from DB, content from SeaweedFS)
    let mut revisions_map: HashMap<Uuid, String> = HashMap::new();
    if !revision_ids.is_empty() {
        let revisions = DocumentRevisions::find()
            .filter(DocumentRevisionsColumn::Id.is_in(revision_ids))
            .all(db)
            .await
            .context("Failed to fetch document revisions")?;

        // Download content from SeaweedFS in parallel
        let content_futures: Vec<_> = revisions
            .iter()
            .map(|rev| {
                let seaweedfs = seaweedfs.clone();
                let storage_key = rev.storage_key.clone();
                let revision_id = rev.id;
                async move { (revision_id, seaweedfs.download_content(&storage_key).await) }
            })
            .collect();
        let content_results = join_all(content_futures).await;

        // Collect successful downloads
        for (revision_id, result) in content_results {
            match result {
                Ok(content) => {
                    revisions_map.insert(revision_id, content);
                }
                Err(e) => {
                    debug!(
                        "Failed to download content for revision {}: {}",
                        revision_id, e
                    );
                    // Skip this revision if download fails
                }
            }
        }
    }

    // Extract File namespace document IDs
    let file_document_ids: Vec<Uuid> = metadata_list
        .iter()
        .filter(|doc| doc.namespace == DocumentNamespace::File)
        .map(|doc| doc.id)
        .collect();

    // Fetch file storage keys in batch
    let mut storage_key_map: HashMap<Uuid, String> = HashMap::new();
    if !file_document_ids.is_empty() {
        let files = DocumentFiles::find()
            .filter(DocumentFilesColumn::DocumentId.is_in(file_document_ids))
            .all(db)
            .await
            .context("Failed to fetch document files")?;

        for file in files {
            storage_key_map.insert(file.document_id, file.storage_key);
        }
    }

    // Build response
    let mut documents = Vec::new();
    for doc in metadata_list {
        let current_revision_id = match doc.current_revision_id {
            Some(id) => id,
            None => continue, // Skip documents without current revision
        };

        let content = match revisions_map.get(&current_revision_id) {
            Some(content) => content.clone(),
            None => continue, // Skip if revision not found
        };

        documents.push(DocumentResponse {
            id: doc.id.to_string(),
            namespace: doc.namespace,
            title: doc.title,
            current_revision: DocumentRevision { content },
            file_url: storage_key_map.get(&doc.id).cloned(),
        });
    }

    debug!("Successfully fetched {} documents", documents.len());
    Ok(documents)
}

/// Check if documents exist without fetching content (lightweight)
/// Used for link coloring (red/blue links)
pub async fn check_documents_exist(
    db: &DatabaseConnection,
    requests: Vec<(DocumentNamespace, String)>,
) -> Result<Vec<DocumentExistence>> {
    if requests.is_empty() {
        debug!("No documents to check");
        return Ok(Vec::new());
    }

    debug!("Checking existence of {} documents", requests.len());

    // Group by namespace for optimized IN clause query
    let mut by_namespace: HashMap<DocumentNamespace, Vec<String>> = HashMap::new();
    for (namespace, title) in &requests {
        by_namespace
            .entry(namespace.clone())
            .or_default()
            .push(title.clone());
    }

    // Build optimized condition: (ns=X AND title IN (...)) OR (ns=Y AND title IN (...))
    let mut condition = Condition::any();
    for (namespace, titles) in &by_namespace {
        condition = condition.add(
            Condition::all()
                .add(DocumentMetadataColumn::Namespace.eq(namespace.clone()))
                .add(DocumentMetadataColumn::Title.is_in(titles.clone())),
        );
    }

    // Query document metadata only (no revisions)
    let metadata_list = DocumentMetadata::find()
        .filter(condition)
        .all(db)
        .await
        .context("Failed to check document existence")?;

    // Build set of existing documents
    let mut existing: HashMap<(DocumentNamespace, String), Uuid> = HashMap::new();
    for doc in &metadata_list {
        existing.insert((doc.namespace.clone(), doc.title.clone()), doc.id);
    }

    // Fetch file URLs only for File namespace documents that exist
    let file_document_ids: Vec<Uuid> = metadata_list
        .iter()
        .filter(|doc| doc.namespace == DocumentNamespace::File)
        .map(|doc| doc.id)
        .collect();

    // Store (storage_key, width, height) for file documents
    let mut file_info_map: HashMap<Uuid, (String, i32, i32)> = HashMap::new();
    if !file_document_ids.is_empty() {
        let files = DocumentFiles::find()
            .filter(DocumentFilesColumn::DocumentId.is_in(file_document_ids))
            .all(db)
            .await
            .context("Failed to fetch document files")?;

        for file in files {
            file_info_map.insert(
                file.document_id,
                (file.storage_key, file.width, file.height),
            );
        }
    }

    // Build response for all requested documents
    let results: Vec<DocumentExistence> = requests
        .into_iter()
        .map(|(namespace, title)| {
            let doc_id = existing.get(&(namespace.clone(), title.clone()));
            let (file_url, file_width, file_height) = if let Some(id) = doc_id {
                if let Some((url, w, h)) = file_info_map.get(id) {
                    (Some(url.clone()), Some(*w), Some(*h))
                } else {
                    (None, None, None)
                }
            } else {
                (None, None, None)
            };

            DocumentExistence {
                namespace,
                title,
                exists: doc_id.is_some(),
                file_url,
                file_width,
                file_height,
            }
        })
        .collect();

    debug!(
        "Checked {} documents, {} exist",
        results.len(),
        results.iter().filter(|r| r.exists).count()
    );
    Ok(results)
}
