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

#[wasm_bindgen]
pub fn cm_highlighter(raw: &str) -> String {
    let doc = sevenmark_parser::core::parse_document(&raw);
    let converted_cm_doc = sevenmark_transform::convert_ast_to_utf16_offset_json(&doc, &raw);
    converted_cm_doc
}
