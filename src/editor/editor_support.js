import { EditorView, basicSetup } from "https://esm.sh/codemirror";
import { EditorState, StateField } from "https://esm.sh/@codemirror/state";
import { Decoration } from "https://esm.sh/@codemirror/view";
import { sm_renderer, cm_highlighter } from "./sm_bridge.js";

window.cm_instances = [];
// 하이라이팅 필드 정의
const smHighlightField = StateField.define({
    create() { return Decoration.none },
    update(decorations, tr) {
        if (!tr.docChanged && decorations.size > 0) return decorations;

        const raw = tr.state.doc.toString();
        // WASM 하이라이터 호출
        const astJson = cm_highlighter(raw);
        const ast = JSON.parse(astJson);

        const marks = [];
        const collectMarks = (elements) => {
            if (!Array.isArray(elements)) return;

            for (const el of elements) {
                const type = Object.keys(el)[0];
                const data = el[type];
                if (data && data.span) {
                    // 텍스트와 개행은 하이라이팅에서 제외
                    if (type !== "Text" && type !== "SoftBreak" && type !== "HardBreak") {
                        marks.push(Decoration.mark({ class: `cm-sm-${type}` }).range(data.span.start, data.span.end));
                    }

                    // 자식 요소 탐색 (Standard children)
                    if (data.children) {
                        collectMarks(data.children);
                    }
                    // 특수 구조 탐색 (Fold 등)
                    if (data.summary) collectMarks([data.summary]);
                    if (data.details) collectMarks([data.details]);
                }
            }
        };

        collectMarks(ast);

        // CodeMirror Decorations must be sorted by start position
        marks.sort((a, b) => a.from - b.from);

        return Decoration.set(marks, true);
    },
    provide: f => EditorView.decorations.from(f)
});
var cm_css = `
/* 기본 에디터 컨테이너 스타일 */
#sm-editor-raw {
    border-right: 1px solid #e1e4e8;
    background: #ffffff;
}

/* CodeMirror 내 SevenMark 문법 스타일 */

/* 1. 텍스트 기본 및 에러 */
.cm-sm-Text { color: #24292e; }
.cm-sm-Comment { color: #6a737d; font-style: italic; }
.cm-sm-Escape { color: #d73a49; font-weight: bold; }
.cm-sm-Error {
    color: #b31d28;
    background-color: #ffeef0;
    text-decoration: underline wavy #d73a49;
}

/* 2. 인라인 스타일 */
.cm-sm-Bold { font-weight: bold; color: #1b1f23; }
.cm-sm-Italic { font-style: italic; color: #c551bb; }
.cm-sm-Strikethrough { color: #7c4fe6; }
.cm-sm-Underline { color: #313de2; }
.cm-sm-Superscript { font-size: 0.85em; color: #005cc5; }
.cm-sm-Subscript { font-size: 0.85em; color: #005cc5; }

/* 3. 구조적 블록 */
.cm-sm-Header {
    color: #0366d6;
    font-weight: bold;
    border-bottom: 1px solid #eaecef;
    display: inline-block;
    width: 100%;
}
.cm-sm-BlockQuote {
    color: #596068;
    border-left: 0.25em solid #dfe2e5;
    padding-left: 0.5em;
    font-style: italic;
    background: #f8f9fa;
}
.cm-sm-HLine {
    display: block;
    border-top: 2px solid #e1e4e8;
    margin: 4px 0;
}
.cm-sm-HardBreak {
    color: #0366d6;
    font-weight: bold;
}

/* 4. 코드 및 수식 */
.cm-sm-Code {
    color: #218b99;
    font-family: 'Fira Code', 'Cascadia Code', monospace;
    background: #f3f3f3;
    border-radius: 3px;
}
.cm-sm-TeX {
    color: #005cc5;
    font-weight: bold;
}

/* 5. 위키 및 미디어 */
.cm-sm-Media { color: #005cc5; text-decoration: underline; }
.cm-sm-ExternalMedia { color: #0652dd; border-bottom: 1px dashed #0652dd; }
.cm-sm-Category { color: #2ecc71; font-weight: bold; }
.cm-sm-Redirect { color: #e67e22; font-style: italic; }
.cm-sm-Include { color: #8e44ad; font-weight: 500; }

/* 6. 매크로 및 멘션 */
.cm-sm-Mention { color: #6f42c1; font-weight: bold; }
.cm-sm-Variable { color: #e36209; font-family: monospace; }
.cm-sm-Age, .cm-sm-TimeNow { color: #16a085; background: #e8f8f5; }
.cm-sm-FootnoteRef, .cm-sm-Footnote { color: #7f8c8d; font-size: 0.9em; }
.cm-sm-Null { color: #bdc3c7; text-decoration: line-through; }

/* 7. 템플릿 로직 및 특수 기능 */
.cm-sm-If, .cm-sm-Define { color: #d63031; font-weight: bold; }
.cm-sm-Styled { border: 1px solid #fab1a0; border-radius: 4px; padding: 0 2px; }
.cm-sm-Literal { background: #dfe6e9; color: #2d3436; }
.cm-sm-Fold { color: #6c5ce7; font-weight: bold; }
.cm-sm-Ruby { color: #e84393; border-bottom: 1px dotted #e84393; }

/* 8. 표 */
.cm-sm-Table { border: 1px solid #ced4da; background: #fdfdfe; }
`;
export function init_codemirror(parent, initialDoc = "") {
    const style = document.createElement("style");
    style.textContent = cm_css;
    document.head.appendChild(style);
    const fixedHeightEditor = EditorView.theme({
        "&": { height: "100%" },
        "& .cm-scroller": { overflow: "auto" }
    });
    const koPhrases = {
        "Find": "찿을내용",
        "Replace": "바꿀내용",
        "replace": "바꾸기",
        "replace all": "모두 바꾸기",
        "all": "모두 선택",
        "match case": "대소문자 구분",
        "by word": "단어 단위",
        "regexp": "정규표현식",
        "next": "다음",
        "previous": "이전",
        "close": "닫기",
        "replace with": "바꿀 내용"
    };

    const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
            const raw = update.state.doc.toString();
            // WASM Renderer 호출
            const html = sm_renderer(raw);
            // Preview 영역 업데이트
            const preview = document.getElementById("sm-editor-preview");
            if (preview) {
                preview.innerHTML = html;
            }
        }
    });

    const view = new EditorView({
        state: EditorState.create({
            doc: initialDoc,
            extensions: [
                basicSetup,
                updateListener,
                EditorState.phrases.of(koPhrases),
                fixedHeightEditor,
                smHighlightField
            ]
        }),
        parent: parent
    });
    window.cm_instances.push(view);
    console.log(`cm_instances: ${window.cm_instances.length}`);
    return view;
}

export function get_editor_text() {
    if (window.cm_instances && window.cm_instances.length > 0) {
        return window.cm_instances[window.cm_instances.length - 1].state.doc.toString();
    }
    console.error("cm_instances is empty");
    return "";
}
export function set_editor_text(text) {
    if (window.cm_instances && window.cm_instances.length > 0) {
        window.cm_instances[window.cm_instances.length - 1].dispatch({ changes: { from: 0, to: window.cm_instances[window.cm_instances.length - 1].state.doc.length, insert: text } });
    } else {
        console.error("cm_instances is empty");
    }
}
window.init_codemirror = init_codemirror;
window.get_editor_text = get_editor_text;
window.set_editor_text = set_editor_text;
