use wasm_bindgen::{JsCast, prelude::wasm_bindgen};
use web_sys::HtmlDivElement;

#[wasm_bindgen]
extern "C" {
    fn init_codemirror(parent: &web_sys::Element);
}

pub fn inject(ed_container: &str) {
    let window = web_sys::window().expect("can't get window");
    let document = window.document().expect("can't get document");
    let root = document
        .get_element_by_id(ed_container)
        .unwrap()
        .dyn_into::<HtmlDivElement>()
        .expect("can't cast to HtmlDivElement");

    // 레이아웃 설정
    root.style().set_property("display", "flex").ok();
    root.style().set_property("gap", "1rem").ok();
    root.style().set_property("min-height", "600px").ok();

    // Raw 에디터 영역(Container) 생성
    let raw_area = document.create_element("div").unwrap();
    raw_area.set_id("sm-editor-raw");
    raw_area
        .dyn_ref::<web_sys::HtmlElement>()
        .unwrap()
        .style()
        .set_property("flex", "1")
        .ok();

    root.append_child(&raw_area).unwrap();

    // Preview 영역 생성
    let preview_area = document.create_element("div").unwrap();
    preview_area.set_id("sm-editor-preview");
    preview_area
        .dyn_ref::<web_sys::HtmlElement>()
        .unwrap()
        .style()
        .set_property("flex", "1")
        .ok();

    root.append_child(&preview_area).unwrap();

    // JS 브릿지를 통해 CodeMirror 주입
    init_codemirror(&raw_area);
}
