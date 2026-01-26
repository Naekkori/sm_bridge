use sea_orm::entity::prelude::*;

/// Document Revisions Entity
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "document_revisions")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub storage_key: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
