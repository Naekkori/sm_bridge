use sevenmark_html::RenderConfig;
use wasm_bindgen::prelude::*;
use web_sys::console;

mod editor;

#[wasm_bindgen]
pub fn sm_renderer(raw: &str) -> String {
    let doc = sevenmark_parser::core::parse_document(&raw);
    let html = sevenmark_html::render_document(&doc, &RenderConfig::default());
    html
}

#[wasm_bindgen]
pub fn sm_codemirror_doc(raw: &str) -> String {
    let doc = sevenmark_parser::core::parse_document(&raw);
    sevenmark_transform::convert_ast_to_utf16_offset_json(&doc, &raw)
}
#[wasm_bindgen]
pub fn sm_render_block(raw: &str) -> Vec<String> {
    //Ast 를 쪼개서 렌더링
    let doc = sevenmark_parser::core::parse_document(&raw);
    let conifg = RenderConfig::default();
    doc.iter()
        .map(move |node| {
            let html = sevenmark_html::render_document(&[node.clone()], &conifg);
            html
        })
        .collect()
}
#[wasm_bindgen]
pub fn sm_editor_injecter(ed_container: &str) {
    console::log_1(&format!("{} - {}", env!("CARGO_PKG_NAME"), env!("CARGO_PKG_VERSION")).into());
    console::log_1(&format!("Injecting editor to {}", ed_container).into());
    editor::editor_injecter::inject(ed_container);
    console::log_1(&format!("Done.").into());
}

#[wasm_bindgen(start)]
pub fn start() {
    let window = web_sys::window().expect("no global window exists");
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
    let converted_cm_doc = sevenmark_transform::convert_ast_to_utf16_offset_json(&doc, &raw);
    converted_cm_doc
}
