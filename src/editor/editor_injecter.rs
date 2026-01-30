use wasm_bindgen::{JsCast, prelude::wasm_bindgen};
use web_sys::HtmlDivElement;

#[wasm_bindgen(module = "/src/editor/editor_support.js")]
extern "C" {
    fn init_codemirror(parent: &web_sys::Element);
}
pub fn inject(ed_container: &str, ed_height: Option<&str>) {
    let window = web_sys::window().expect("can't get window");
    let document = window.document().expect("can't get document");
    let root = document
        .get_element_by_id(ed_container)
        .unwrap()
        .dyn_into::<HtmlDivElement>()
        .expect("can't cast to HtmlDivElement");

    // 레이아웃 설정
    root.style().set_property("display", "flex").ok();
    // root.style().set_property("gap", "1rem").ok(); // 핸들 라인이 간격 역할을 하므로 제거
    root.style()
        .set_property("height", ed_height.unwrap_or("600px"))
        .ok();

    // Raw 에디터 영역(Container) 생성
    let raw_area = document.create_element("div").unwrap();
    raw_area.set_id("sm-editor-raw");
    raw_area
        .dyn_ref::<web_sys::HtmlElement>()
        .unwrap()
        .style()
        .set_property("flex", "0 0 50%")
        .ok();

    root.append_child(&raw_area).unwrap();

    //폭 조절 핸들 라인 생성
    let sep_handle_line = document.create_element("div").unwrap();
    sep_handle_line.set_id("sm-editor-sep-handle-line");
    sep_handle_line.set_class_name("sm-editor-sep-handle-line");
    sep_handle_line
        .dyn_ref::<web_sys::HtmlElement>()
        .unwrap()
        .style()
        .set_property("flex", "0 0 2px")
        .ok();
    root.append_child(&sep_handle_line).unwrap();

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
