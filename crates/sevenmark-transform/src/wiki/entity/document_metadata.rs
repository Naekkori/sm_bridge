use super::super::types::DocumentNamespace;
use sea_orm::entity::prelude::*;

/// Document Metadata Entity
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "document_metadata")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub namespace: DocumentNamespace,
    pub title: String,
    pub current_revision_id: Option<Uuid>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
