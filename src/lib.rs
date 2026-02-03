use serde::{Deserialize, Serialize};
use sevenmark_utils::convert_ast_to_utf16_offset_json;
use wasm_bindgen::prelude::*;
use web_sys::console;

mod editor;

// JS로부터 설정을 전달받기 위한 미러(Mirror) 구조체
// serde::Deserialize를 통해 JS 객체에서 Rust 구조체로 자동 변환 가능
#[wasm_bindgen]
#[derive(Deserialize, Default)]
#[serde(default)] // JS에서 일부 필드가 누락되어도 기본값으로 채움
pub struct SBRenderConfig {
    file_base_url: Option<String>,
    document_base_url: Option<String>,
    category_base_url: Option<String>,
    edit_url: Option<String>,
}
#[wasm_bindgen]
pub fn sm_renderer(raw: &str, config: JsValue) -> Result<String, JsValue> {
    // config 값을 바탕으로 RenderConfig 생성
    let wasm_config: Option<SBRenderConfig> = if config.is_undefined() || config.is_null() {
        None
    } else {
        Some(serde_wasm_bindgen::from_value(config)?)
    };
    let sm_config = wasm_config.as_ref().map(|config| sevenmark_html::RenderConfig {
        file_base_url: config.file_base_url.as_deref(),
        document_base_url: config.document_base_url.as_deref(),
        category_base_url: config.category_base_url.as_deref(),
        edit_url: config.edit_url.as_deref(),
    }).unwrap_or_default();
    let doc = sevenmark_parser::core::parse_document(&raw);
    let html = sevenmark_html::render_document_with_spans(&doc, &sm_config, raw);
    Ok(html)
}

#[wasm_bindgen]
pub fn sm_codemirror_doc(raw: &str) -> String {
    let doc = sevenmark_parser::core::parse_document(&raw);
    convert_ast_to_utf16_offset_json(&doc, &raw)
}
#[wasm_bindgen]
pub fn sm_editor_injecter(ed_container: &str, ed_height: Option<String>) {
    console::log_1(&format!("{} - {}", env!("CARGO_PKG_NAME"), env!("CARGO_PKG_VERSION")).into());
    console::log_1(&format!("Injecting editor to {}", ed_container).into());
    editor::editor_injecter::inject(ed_container, ed_height.as_deref());
    console::log_1(&format!("Done.").into());
}
#[derive(Serialize)]
pub struct CrateInfo {
    pub name: String,
    pub version: String,
    pub author: Vec<String>,
    pub description: String,
}
#[wasm_bindgen]
pub fn get_crate_info() -> String {
    let crate_name = env!("CARGO_PKG_NAME");
    let crate_version = env!("CARGO_PKG_VERSION");
    let create_author = env!("CARGO_PKG_AUTHORS");
    let create_description = env!("CARGO_PKG_DESCRIPTION");
    let crate_info = CrateInfo {
        name: crate_name.to_string(),
        version: crate_version.to_string(),
        author: create_author
            .split(',')
            .map(|s| s.trim().to_string())
            .collect(),
        description: create_description.to_string(),
    };
    serde_json::to_string(&crate_info).unwrap()
}
#[wasm_bindgen(start)]
pub fn start() {
    // Worker 환경에서는 window가 없으므로 importmap 주입 로직을 건너뜀
    let window = match web_sys::window() {
        Some(win) => win,
        None => return,
    };
    let document = window.document().expect("should have a document on window");
    let head = document.head().expect("should have a head in document");

    // importmap 주입 여부 확인 (중복 주입 방지)
    if let Ok(Some(_)) = document.query_selector("script[type='importmap']") {
        return;
    }

    let import_map_json = r#"{
    "imports": {
      "codemirror": "https://esm.sh/codemirror@6.0.1",
      "@codemirror/state": "https://esm.sh/@codemirror/state@6.5.4",
      "@codemirror/view": "https://esm.sh/@codemirror/view@6.39.11",
      "@codemirror/commands": "https://esm.sh/@codemirror/commands@6.10.1",
      "@codemirror/search": "https://esm.sh/@codemirror/search@6.6.0",
      "@codemirror/language": "https://esm.sh/@codemirror/language@6.12.1",
      "@codemirror/autocomplete": "https://esm.sh/@codemirror/autocomplete@6.20.0",
      "@codemirror/lint": "https://esm.sh/@codemirror/lint@6.9.2"
    }
  }"#;

    let script = document.create_element("script").unwrap();
    script.set_attribute("type", "importmap").unwrap();
    script.set_inner_html(import_map_json);
    head.append_child(&script).unwrap();

    // es-module-shims 폴리필 주입 (동적 importmap 지원을 위해 필요)
    let polyfill = document.create_element("script").unwrap();
    polyfill.set_attribute("async", "true").unwrap();
    polyfill
        .set_attribute(
            "src",
            "https://ga.jspm.io/npm:es-module-shims@1.10.1/dist/es-module-shims.js",
        )
        .unwrap();
    head.append_child(&polyfill).unwrap();
}

#[wasm_bindgen]
pub fn cm_highlighter(raw: &str) -> String {
    let doc = sevenmark_parser::core::parse_document(&raw);
    let converted_cm_doc = convert_ast_to_utf16_offset_json(&doc, &raw);
    converted_cm_doc
}

#[wasm_bindgen]
pub fn excel_get_worksheets(data: &[u8]) -> Result<Vec<String>, JsValue> {
    editor::sheet::excel_get_worksheets(data).map_err(|e| JsValue::from_str(&e))
}
#[wasm_bindgen]
pub fn excel_open_book(data: &[u8], sheet: &str) -> Result<String, JsValue> {
    let data = editor::sheet::excel_open_book(data, sheet);
    serde_json::to_string(&data).map_err(|e| JsValue::from_str(&e.to_string()))
}
#[wasm_bindgen]
pub fn open_csv(data: &[u8]) -> Result<String, JsValue> {
    let data = editor::sheet::open_csv(data);
    serde_json::to_string(&data).map_err(|e| JsValue::from_str(&e.to_string()))
}
