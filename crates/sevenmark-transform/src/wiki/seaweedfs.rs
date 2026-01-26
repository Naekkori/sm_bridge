//! SeaweedFS S3 호환 클라이언트 타입 정의

use aws_sdk_s3::Client;
use std::sync::Arc;

/// SeaweedFS 클라이언트 (S3 호환 API 사용)
#[derive(Clone)]
pub struct SeaweedFsClient {
    client: Arc<Client>,
    bucket: String,
}

impl SeaweedFsClient {
    pub fn new(client: Client, bucket: String) -> Self {
        Self {
            client: Arc::new(client),
            bucket,
        }
    }

    /// 콘텐츠 다운로드 (zstd 압축 해제)
    pub async fn download_content(
        &self,
        key: &str,
    ) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        let resp = self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await?;

        let data = resp.body.collect().await?;
        let bytes = data.into_bytes();

        let decompressed = zstd::decode_all(bytes.as_ref())?;
        let content = String::from_utf8(decompressed)?;

        Ok(content)
    }
}
