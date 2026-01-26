use sea_orm::entity::prelude::*;

/// Document Files Entity
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "document_files")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub document_id: Uuid,
    #[sea_orm(column_type = "Text")]
    pub storage_key: String,
    pub width: i32,
    pub height: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
