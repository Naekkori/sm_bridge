use crate::PreProcessedDocument;
use crate::preprocessor::{DocumentReference, RedirectReference, SectionInfo};
use crate::utils::extract_plain_text;
use crate::wiki::{DocumentNamespace, check_documents_exist};
use anyhow::Result;
use sea_orm::DatabaseConnection;
use serde::Serialize;
use sevenmark_parser::ast::{Element, ResolvedDoc, ResolvedFile, ResolvedMediaInfo, Traversable};
use std::collections::{HashMap, HashSet};
use tracing::debug;
use utoipa::ToSchema;

/// Media resolution map: (namespace, title) -> (file_url, width, height, is_valid)
type MediaResolutionMap =
    HashMap<(DocumentNamespace, String), (Option<String>, Option<i32>, Option<i32>, bool)>;

/// Final result after media resolution
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ProcessedDocument {
    pub categories: HashSet<String>,
    pub redirect: Option<RedirectReference>,
    pub references: HashSet<DocumentReference>,
    /// User mention UUIDs collected from the document
    pub user_mentions: HashSet<String>,
    #[schema(value_type = Vec<Object>)]
    pub ast: Vec<Element>,
    pub sections: Vec<SectionInfo>,
}

/// Processes document with media resolution
pub async fn postprocess_sevenmark(
    preprocessed: PreProcessedDocument,
    db: &DatabaseConnection,
) -> Result<ProcessedDocument> {
    let mut ast = preprocessed.ast;

    // Build resolution map from DB (only if there are media references)
    let resolved_map: MediaResolutionMap = if preprocessed.media.is_empty() {
        HashMap::new()
    } else {
        // Convert MediaReference to (namespace, title) tuples for batch request
        let requests: Vec<_> = preprocessed
            .media
            .into_iter()
            .map(|m| (m.namespace, m.title))
            .collect();

        debug!(
            "Checking existence of {} unique media references",
            requests.len()
        );

        // Check document existence (lightweight - no content fetching)
        let existence_results = check_documents_exist(db, requests).await?;

        let mut map = HashMap::new();

        for result in existence_results {
            let key = (result.namespace.clone(), result.title.clone());
            let value = match result.namespace {
                DocumentNamespace::File => {
                    // File: store file_url, width, height and validity
                    let is_valid = result.file_url.is_some();
                    (
                        result.file_url,
                        result.file_width,
                        result.file_height,
                        is_valid,
                    )
                }
                DocumentNamespace::Document | DocumentNamespace::Category => {
                    // Document/Category: just store validity (title is in key)
                    (None, None, None, result.exists)
                }
            };
            map.insert(key, value);
        }

        map
    };

    // Always traverse AST to resolve MediaElement references (including #url)
    resolve_media_elements(&mut ast, &resolved_map);

    Ok(ProcessedDocument {
        categories: preprocessed.categories,
        redirect: preprocessed.redirect,
        references: preprocessed.references,
        user_mentions: preprocessed.user_mentions,
        ast,
        sections: preprocessed.sections,
    })
}

fn resolve_media_elements(elements: &mut [Element], resolved_map: &MediaResolutionMap) {
    for element in elements {
        resolve_media_recursive(element, resolved_map);
    }
}

fn resolve_media_recursive(element: &mut Element, resolved_map: &MediaResolutionMap) {
    if let Element::Media(media_elem) = element {
        let mut resolved = ResolvedMediaInfo::default();

        // Process #file parameter (이미지 표시용)
        if let Some(file_param) = media_elem.parameters.get("file") {
            let title = extract_plain_text(&file_param.value);
            if !title.is_empty() {
                let key = (DocumentNamespace::File, title);
                let (file_url, width, height, is_valid) = resolved_map
                    .get(&key)
                    .cloned()
                    .unwrap_or((None, None, None, false));
                resolved.file = Some(ResolvedFile {
                    url: file_url.unwrap_or_default(),
                    is_valid,
                    width: width.map(|w| w as u32),
                    height: height.map(|h| h as u32),
                });
            }
        }

        // Process #document parameter
        if let Some(doc_param) = media_elem.parameters.get("document") {
            let title = extract_plain_text(&doc_param.value);
            if !title.is_empty() {
                let key = (DocumentNamespace::Document, title.clone());
                let is_valid = resolved_map
                    .get(&key)
                    .map(|(_, _, _, valid)| *valid)
                    .unwrap_or(false);
                resolved.document = Some(ResolvedDoc { title, is_valid });
            }
        }

        // Process #category parameter
        if let Some(cat_param) = media_elem.parameters.get("category") {
            let title = extract_plain_text(&cat_param.value);
            if !title.is_empty() {
                let key = (DocumentNamespace::Category, title.clone());
                let is_valid = resolved_map
                    .get(&key)
                    .map(|(_, _, _, valid)| *valid)
                    .unwrap_or(false);
                resolved.category = Some(ResolvedDoc { title, is_valid });
            }
        }

        // Process #url parameter (외부 링크)
        if let Some(url_param) = media_elem.parameters.get("url") {
            let url = extract_plain_text(&url_param.value);
            if !url.is_empty() {
                resolved.url = Some(url);
            }
        }

        // Set resolved_info if any field is populated
        if resolved.file.is_some()
            || resolved.document.is_some()
            || resolved.category.is_some()
            || resolved.url.is_some()
        {
            media_elem.resolved_info = Some(resolved);
        }
    }

    // Traverse children
    element.traverse_children(&mut |child| {
        resolve_media_recursive(child, resolved_map);
    });
}
