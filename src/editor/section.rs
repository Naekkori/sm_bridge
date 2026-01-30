use maud::{Markup, PreEscaped, html};
use sevenmark_html::RenderConfig;
use sevenmark_html::classes;
use sevenmark_parser::ast::Element;

pub struct Section<'a> {
    pub level: usize,
    pub is_folded: bool,
    pub section_index: usize,
    pub section_path: String,
    pub header_children: &'a [Element],
    pub header_span: (usize, usize),
    pub content: Vec<&'a Element>,
    pub sub_sections: Vec<Section<'a>>,
}

pub struct SectionTree<'a> {
    pub preamble: Vec<&'a Element>,
    pub sections: Vec<Section<'a>>,
}

fn as_header(el: &Element) -> Option<(usize, bool, usize, &[Element], (usize, usize))> {
    match el {
        Element::Header(h) => Some((
            h.level,
            h.is_folded,
            h.section_index,
            &h.children,
            (h.span.start, h.span.end),
        )),
        _ => None,
    }
}

pub fn build_section_tree(elements: &[Element]) -> SectionTree<'_> {
    let mut preamble = Vec::new();
    let mut sections = Vec::new();
    let mut i = 0;

    while i < elements.len() && as_header(&elements[i]).is_none() {
        preamble.push(&elements[i]);
        i += 1;
    }

    let mut counter = 0;
    while i < elements.len() {
        counter += 1;
        if let Some((section, next_index)) = build_section(elements, i, 0, counter.to_string()) {
            sections.push(section);
            i = next_index;
        } else {
            break;
        }
    }

    SectionTree { preamble, sections }
}

fn build_section(
    elements: &[Element],
    start_index: usize,
    min_level: usize,
    path: String,
) -> Option<(Section<'_>, usize)> {
    if start_index >= elements.len() {
        return None;
    }

    let (level, is_folded, section_index, header_children, header_span) =
        as_header(&elements[start_index])?;

    if level <= min_level {
        return None;
    }

    let mut section = Section {
        level,
        is_folded,
        section_index,
        section_path: path,
        header_children,
        header_span,
        content: Vec::new(),
        sub_sections: Vec::new(),
    };

    let mut i = start_index + 1;
    let mut child_counter = 0;

    while i < elements.len() {
        if let Some((next_level, _, _, _, _)) = as_header(&elements[i]) {
            if next_level <= level {
                break;
            }

            child_counter += 1;
            let child_path = format!("{}.{}", section.section_path, child_counter);
            if let Some((child_section, next_index)) = build_section(elements, i, level, child_path)
            {
                section.sub_sections.push(child_section);
                i = next_index;
            } else {
                break;
            }
        } else {
            section.content.push(&elements[i]);
            i += 1;
        }
    }

    Some((section, i))
}

pub fn render_section_tree(
    tree: &SectionTree<'_>,
    raw_source: &str,
    config: &RenderConfig,
) -> String {
    let markup = html! {
        @for el in &tree.preamble {
            (wrap_with_span(el, raw_source, config))
        }
        @for section in &tree.sections {
            (render_section(section, raw_source, config))
        }
    };
    markup.into_string()
}

fn render_section(section: &Section<'_>, raw_source: &str, config: &RenderConfig) -> Markup {
    // Header rendering (manually matching sevenmark-html style)
    let header_content = sevenmark_html::render_document(section.header_children, config);
    let id = format!("{}{}", classes::SECTION_ID_PREFIX, section.section_path);
    let class = match section.level {
        1 => classes::HEADER_1,
        2 => classes::HEADER_2,
        3 => classes::HEADER_3,
        4 => classes::HEADER_4,
        5 => classes::HEADER_5,
        _ => classes::HEADER_6,
    };

    let inner = html! {
        span class=(classes::SECTION_PATH) { (section.section_path) "." }
        span class=(classes::HEADER_CONTENT) { (PreEscaped(header_content)) }
    };

    let header_tag_html = match section.level {
        1 => html! { h1 id=(id) class=(class) { (inner) } },
        2 => html! { h2 id=(id) class=(class) { (inner) } },
        3 => html! { h3 id=(id) class=(class) { (inner) } },
        4 => html! { h4 id=(id) class=(class) { (inner) } },
        5 => html! { h5 id=(id) class=(class) { (inner) } },
        _ => html! { h6 id=(id) class=(class) { (inner) } },
    };

    // Header span wrap
    let utf16_start = to_utf16_offset(raw_source, section.header_span.0);
    let utf16_end = to_utf16_offset(raw_source, section.header_span.1);

    let header_wrapped = html! {
        span class="sm-render-block" data-start=(utf16_start) data-end=(utf16_end) {
            (header_tag_html)
        }
    };

    let section_content = html! {
        div class=(classes::SECTION_CONTENT) {
            @for el in &section.content {
                (wrap_with_span(el, raw_source, config))
            }
            @for sub in &section.sub_sections {
                (render_section(sub, raw_source, config))
            }
        }
    };

    let class_str = if section.is_folded {
        format!("{} {}", classes::SECTION, classes::SECTION_FOLDED)
    } else {
        classes::SECTION.to_string()
    };

    if section.is_folded {
        html! {
            details class=(class_str) data-section=(section.section_index) {
                summary { (header_wrapped) }
                (section_content)
            }
        }
    } else {
        html! {
            details class=(class_str) data-section=(section.section_index) open="" {
                summary { (header_wrapped) }
                (section_content)
            }
        }
    }
}

fn wrap_with_span(el: &Element, raw_source: &str, config: &RenderConfig) -> Markup {
    // We use render_document for a single element to get its HTML
    // But we need to make sure it doesn't add its own sections
    // Actually, render_document with a single non-header element won't add sections.
    let html_str = sevenmark_html::render_document(std::slice::from_ref(el), config);
    let start = el.span().start;
    let end = el.span().end;
    let utf16_start = to_utf16_offset(raw_source, start);
    let utf16_end = to_utf16_offset(raw_source, end);

    html! {
        span class="sm-render-block" data-start=(utf16_start) data-end=(utf16_end) {
            (PreEscaped(html_str))
        }
    }
}

fn to_utf16_offset(raw: &str, offset: usize) -> usize {
    if offset > raw.len() {
        return 0;
    }
    raw[..offset].chars().map(|c| c.len_utf16()).sum()
}
