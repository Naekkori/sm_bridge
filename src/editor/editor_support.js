import { EditorView, basicSetup } from "https://esm.sh/codemirror";
import { EditorState, StateField } from "https://esm.sh/@codemirror/state";
import { Decoration } from "https://esm.sh/@codemirror/view";
import { undoDepth, redoDepth, undo, redo } from "https://esm.sh/@codemirror/commands";
import { openSearchPanel, closeSearchPanel } from "https://esm.sh/@codemirror/search@6.5.6";
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
:root {
    /* -- Editor Colors -- */
    --sm-bg-editor: #ffffff;
    --sm-color-text: #24292e;
    --sm-border-editor: #e1e4e8;

    /* -- Syntax Highlighting -- */
    --sm-color-comment: #6a737d;
    --sm-color-escape: #d73a49;
    --sm-color-error: #b31d28;
    --sm-bg-error: #ffeef0;
    --sm-deco-error: #d73a49;

    --sm-color-bold: #1b1f23;
    --sm-color-italic: #c551bb;
    --sm-color-strike: #7c4fe6;
    --sm-color-underline: #313de2;
    --sm-color-script: #005cc5;

    --sm-color-header: #0366d6;
    --sm-border-header: #eaecef;
    
    --sm-color-quote: #596068;
    --sm-border-quote: #dfe2e5;
    --sm-bg-quote: #f8f9fa;

    --sm-border-hline: #e1e4e8;
    --sm-color-hardbreak: #0366d6;

    --sm-color-code: #218b99;
    --sm-bg-code: #f3f3f3;
    
    --sm-color-tex: #005cc5;
    --sm-color-media: #005cc5;
    --sm-color-extmedia: #0652dd;
    --sm-border-extmedia: #0652dd;
    
    --sm-color-category: #2ecc71;
    --sm-color-redirect: #e67e22;
    --sm-color-include: #8e44ad;
    
    --sm-color-mention: #6f42c1;
    --sm-color-variable: #e36209;
    --sm-color-timenow: #16a085;
    --sm-bg-timenow: #e8f8f5;
    
    --sm-color-footnote: #7f8c8d;
    --sm-color-null: #bdc3c7;
    
    --sm-color-control: #d63031;
    --sm-border-styled: #fab1a0;
    --sm-color-literal: #2d3436;
    --sm-bg-literal: #dfe6e9;
    
    --sm-color-fold: #6c5ce7;
    --sm-color-ruby: #e84393;
    
    --sm-border-table: #ced4da;
    --sm-bg-table: #fdfdfe;

    /* -- Toolbar Colors -- */
    --sm-bg-toolbar: #ffffff;
    --sm-border-toolbar: #e1e4e8;
    --sm-shadow-toolbar: rgba(0,0,0,0.05);
    
    --sm-btn-text: #586069;
    --sm-btn-hover-bg: #f6f8fa;
    --sm-btn-hover-border: rgba(27,31,35,0.05);
    --sm-btn-active-bg: #e1e4e8;
    --sm-btn-disabled: #959da5;
    
    --sm-separator: #e1e4e8;
}

/* 기본 에디터 컨테이너 스타일 */
#sm-editor-raw {
    border-right: 1px solid var(--sm-border-editor);
    background: var(--sm-bg-editor);
}

/* CodeMirror 내 SevenMark 문법 스타일 */

/* 1. 텍스트 기본 및 에러 */
.cm-sm-Text { color: var(--sm-color-text); }
.cm-sm-Comment { color: var(--sm-color-comment); font-style: italic; }
.cm-sm-Escape { color: var(--sm-color-escape); font-weight: bold; }
.cm-sm-Error {
    color: var(--sm-color-error);
    background-color: var(--sm-bg-error);
    text-decoration: underline wavy var(--sm-deco-error);
}

/* 2. 인라인 스타일 */
.cm-sm-Bold { font-weight: bold; color: var(--sm-color-bold); }
.cm-sm-Italic { font-style: italic; color: var(--sm-color-italic); }
.cm-sm-Strikethrough { color: var(--sm-color-strike); }
.cm-sm-Underline { color: var(--sm-color-underline); }
.cm-sm-Superscript { font-size: 0.85em; color: var(--sm-color-script); }
.cm-sm-Subscript { font-size: 0.85em; color: var(--sm-color-script); }

/* 3. 구조적 블록 */
.cm-sm-Header {
    color: var(--sm-color-header);
    font-weight: bold;
    border-bottom: 1px solid var(--sm-border-header);
    display: inline-block;
    width: 100%;
}
.cm-sm-BlockQuote {
    color: var(--sm-color-quote);
    border-left: 0.25em solid var(--sm-border-quote);
    padding-left: 0.5em;
    font-style: italic;
    background: var(--sm-bg-quote);
}
.cm-sm-HLine {
    display: block;
    border-top: 2px solid var(--sm-border-hline);
    margin: 4px 0;
}
.cm-sm-HardBreak {
    color: var(--sm-color-hardbreak);
    font-weight: bold;
}

/* 4. 코드 및 수식 */
.cm-sm-Code {
    color: var(--sm-color-code);
    font-family: 'Fira Code', 'Cascadia Code', monospace;
    background: var(--sm-bg-code);
    border-radius: 3px;
}
.cm-sm-TeX {
    color: var(--sm-color-tex);
    font-weight: bold;
}

/* 5. 위키 및 미디어 */
.cm-sm-Media { color: var(--sm-color-media); text-decoration: underline; }
.cm-sm-ExternalMedia { color: var(--sm-color-extmedia); border-bottom: 1px dashed var(--sm-border-extmedia); }
.cm-sm-Category { color: var(--sm-color-category); font-weight: bold; }
.cm-sm-Redirect { color: var(--sm-color-redirect); font-style: italic; }
.cm-sm-Include { color: var(--sm-color-include); font-weight: 500; }

/* 6. 매크로 및 멘션 */
.cm-sm-Mention { color: var(--sm-color-mention); font-weight: bold; }
.cm-sm-Variable { color: var(--sm-color-variable); font-family: monospace; }
.cm-sm-Age, .cm-sm-TimeNow { color: var(--sm-color-timenow); background: var(--sm-bg-timenow); }
.cm-sm-FootnoteRef, .cm-sm-Footnote { color: var(--sm-color-footnote); font-size: 0.9em; }
.cm-sm-Null { color: var(--sm-color-null); text-decoration: line-through; }

/* 7. 템플릿 로직 및 특수 기능 */
.cm-sm-If, .cm-sm-Define { color: var(--sm-color-control); font-weight: bold; }
.cm-sm-Styled { border: 1px solid var(--sm-border-styled); border-radius: 4px; padding: 0 2px; }
.cm-sm-Literal { background: var(--sm-bg-literal); color: var(--sm-color-literal); }
.cm-sm-Fold { color: var(--sm-color-fold); font-weight: bold; }
.cm-sm-Ruby { color: var(--sm-color-ruby); border-bottom: 1px dotted var(--sm-color-ruby); }

/* 8. 표 */
.cm-sm-Table { border: 1px solid var(--sm-border-table); background: var(--sm-bg-table); }

/* CodeMirror 검색 패널 커스텀 디자인 - 강제 정렬 */
/* CodeMirror 검색 패널 커스텀 디자인 - 2줄 레이아웃 */
.cm-panel.cm-search {
    background: var(--sm-bg-toolbar) !important;
    border-top: 1px solid var(--sm-border-toolbar);
    border-bottom: 1px solid var(--sm-border-toolbar);
    align-items: center;
    gap: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    font-size: 0.9rem;
    font-family: inherit;
    position: relative;
    max-width: 100%;
}

/* 줄바꿈 강제 (검색과 바꾸기 사이의 br 태그 활용) */
.cm-panel.cm-search br {
    display: block;
    width: 100%;
    height: 0;
    margin: 4px 0;
    content: "";
}

/* 스크롤바 숨김 */
.cm-panel.cm-search::-webkit-scrollbar {
    height: 4px;
}
.cm-panel.cm-search::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 2px;
}

/* 입력창 스타일 */
.cm-textfield {
    border: 1px solid var(--sm-border-toolbar);
    background: var(--sm-bg-editor);
    color: var(--sm-color-text);
    border-radius: 4px;
    padding: 0 8px;
    height: 30px;
    outline: none;
    font-family: inherit;
    min-width: 100px;
    flex-grow: 1; /* 남는 공간 채우기 */
}
.cm-textfield:focus {
    border-color: var(--sm-btn-active-bg);
    box-shadow: 0 0 0 2px var(--sm-shadow-toolbar);
}

/* 바꾸기 입력창은 첫 줄과 정렬 맞추기 위해 */
.cm-textfield[name="replace"] {
    margin-top: 4px;
}

/* 모든 버튼 공통 스타일 */
.cm-panel.cm-search .cm-button {
    background: transparent;
    color: var(--sm-btn-text);
    border: 1px solid var(--sm-border-toolbar);
    border-radius: 4px;
    height: 30px;
    padding: 0 12px;
    cursor: pointer;
    font-size: 0.85em;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-transform: none;
    white-space: nowrap;
    transition: all 0.1s ease;
    background-image: none;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.cm-panel.cm-search .cm-button:hover {
    background-color: var(--sm-btn-hover-bg);
    color: var(--sm-color-text);
    border-color: var(--sm-btn-hover-border);
}

.cm-panel.cm-search .cm-button:active {
    background-color: var(--sm-btn-active-bg);
    transform: translateY(1px);
}

/* 닫기 버튼 (X) - 패널 우측 상단 고정 */
.cm-panel.cm-search .cm-button[name="close"] {
    position: absolute;
    top: 10px;
    right: 8px;
    width: 28px !important;
    height: 28px !important;
    padding: 0;
    background-color: transparent;
    border: none;
    color: var(--sm-color-error);
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
    font-size: 1.4em;
    box-shadow: none;
}
.cm-panel.cm-search .cm-button[name="close"]:hover {
    background-color: var(--sm-bg-error);
    color: #fff;
}

/* 체크박스 라벨 */
.cm-panel.cm-search label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85em;
    color: var(--sm-color-text);
    margin: 0;
    cursor: pointer;
    user-select: none;
}
.cm-panel.cm-search input[type="checkbox"] {
    accent-color: var(--sm-color-header);
    cursor: pointer;
}

/* 모바일 등 좁은 화면 대응 */
@media (max-width: 600px) {
    .cm-panel.cm-search {
        flex-direction: column;
        align-items: stretch;
    }
    .cm-textfield {
        width: 100%;
        margin-bottom: 4px;
    }
    .cm-panel.cm-search .cm-button {
        flex: 1;
    }
}
`;
const TOOLBAR_CSS = `
    /* 모던하고 깨끗한 툴바 스타일 */
    .sm_toolbar {
        background: var(--sm-bg-toolbar);
        border-bottom: 1px solid var(--sm-border-toolbar);
        padding: 6px 12px;
        display: flex;
        gap: 4px;
        align-items: center;
        border-top-left-radius: 6px;
        border-top-right-radius: 6px;
        box-shadow: 0 1px 2px var(--sm-shadow-toolbar);
    }

    /* 버튼 스타일: 기본적으로 투명하고 호버시 반응 */
    .sm_toolbar_btn {
        background: transparent;
        color: var(--sm-btn-text);
        border: 1px solid transparent;
        border-radius: 4px;
        width: 32px;
        height: 32px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s cubic-bezier(0.3, 0, 0.5, 1);
        position: relative;
    }

    /* 아이콘 크기 조정 */
    .sm_toolbar_btn .material-symbols-outlined {
        font-size: 20px;
    }

    /* 호버 효과 */
    .sm_toolbar_btn:hover:not(:disabled) {
        background-color: var(--sm-btn-hover-bg);
        border-color: var(--sm-btn-hover-border);
        color: var(--sm-color-text);
        transform: translateY(-0.5px);
    }

    /* 클릭 효과 및 활성화 상태 */
    .sm_toolbar_btn:active:not(:disabled),
    .sm_toolbar_btn.active {
        background-color: var(--sm-btn-active-bg);
        border-color: transparent;
        transform: translateY(0);
        transition-duration: 0.05s;
    }

    /* 비활성화 상태 */
    .sm_toolbar_btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        color: var(--sm-btn-disabled);
        pointer-events: none;
    }

    /* 구분선 스타일 */
    .sm_toolbar_separator {
        width: 1px;
        height: 18px;
        background-color: var(--sm-separator);
        margin: 0 8px;
        align-self: center;
        border: none;
    }

    /* 오른쪽 정렬 컨테이너 */
    .sm_toolbar_right {
        margin-left: auto;
        display: flex;
        gap: 4px;
        align-items: center;
    }
`;
export function init_codemirror(parent, initialDoc = "") {
    const style = document.createElement("style");
    style.textContent = cm_css;
    document.head.appendChild(style);
    const toolbar_style = document.createElement("style");
    toolbar_style.textContent = TOOLBAR_CSS;
    document.head.appendChild(toolbar_style);
    //구글폰트api (material icon)
    const googleFont = document.createElement("link");
    googleFont.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@400;500;600;700&display=swap";
    googleFont.rel = "stylesheet";
    document.head.appendChild(googleFont);
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
        const undoBtn = document.getElementById("sm-editor-undo");
        const redoBtn = document.getElementById("sm-editor-redo");
        if (undoBtn) {
            undoBtn.disabled = undoDepth(update.state) === 0;
        }
        if (redoBtn) {
            redoBtn.disabled = redoDepth(update.state) === 0;
        }

        // 검색 패널 상태 감지하여 버튼 활성화 표시
        const searchBtn = document.getElementById("sm-toolbar-search");
        if (searchBtn) {
            // CodeMirror 검색 패널 클래스: .cm-search
            const isSearchOpen = update.view.dom.querySelector(".cm-search");
            if (isSearchOpen) {
                searchBtn.classList.add("active");
            } else {
                searchBtn.classList.remove("active");
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
    setup_toolbar();

    // 초기 버튼 상태 동기화
    setTimeout(() => {
        const uBtn = document.getElementById("sm-editor-undo");
        const rBtn = document.getElementById("sm-editor-redo");
        if (uBtn) uBtn.disabled = undoDepth(view.state) === 0;
        if (rBtn) rBtn.disabled = redoDepth(view.state) === 0;

        // 저장된 테마 불러오기
        if (window.load_theme_preference) {
            window.load_theme_preference();
        }
    }, 0);

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

function setup_toolbar() {
    console.log("attach toolbar");
    //엔진이 생성한 parent를 찾음
    const parent = document.getElementById("sm-editor-raw");
    if (!parent) {
        console.error("parent is not found");
        return;
    }

    if (document.getElementById("sm-toolbar")) {
        console.error("toolbar is already attached");
        return;
    }

    const toolbar = document.createElement("div");
    toolbar.id = "sm-toolbar";
    toolbar.className = "sm_toolbar";
    parent.prepend(toolbar);

    const Buttons = [
        //텍스트
        {
            id: "sm-toolbar-bold",
            className: "sm_toolbar_btn",
            text: "format_bold",
            title: "굵게",
            onClick: () => {
                wrapSelection("**")
            }
        },
        {
            id: "sm-toolbar-italic",
            className: "sm_toolbar_btn",
            text: "format_italic",
            title: "이탤릭체",
            onClick: () => {
                wrapSelection("*")
            }
        },
        {
            id: "sm-toolbar-underline",
            className: "sm_toolbar_btn",
            text: "format_underlined",
            title: "밑줄",
            onClick: () => {
                wrapSelection("__")
            }
        },
        {
            id: "sm-toolbar-strike",
            className: "sm_toolbar_btn",
            text: "strikethrough_s",
            title: "취소선",
            onClick: () => {
                wrapSelection("~~")
            }
        },
        {
            id: "sm-toolbar-superscript",
            className: "sm_toolbar_btn",
            html: '<span style="font-weight:bold; font-family: serif; font-size: 1.1em;">X<sup style="font-size:0.6em">2</sup></span>',
            title: "상위첨자",
            onClick: () => {
                wrapSelection("^^")
            }
        },
        {
            id: "sm-toolbar-subscript",
            className: "sm_toolbar_btn",
            html: '<span style="font-weight:bold; font-family: serif; font-size: 1.1em;">X<sub style="font-size:0.6em">2</sub></span>',
            title: "하위첨자",
            onClick: () => {
                wrapSelection(",,")
            }
        },
    ];
    Buttons.forEach((button) => {
        if (button.id == "sm-separator") {
            const hr = document.createElement("hr");
            hr.className = button.className;
            rightToolbar.appendChild(hr);
            return;
        }
        const btn = document.createElement("button");
        btn.id = button.id;
        btn.className = button.className;
        if (button.html) {
            btn.innerHTML = button.html;
        } else {
            btn.innerHTML = `<span class="material-symbols-outlined">${button.text}</span>`;
        }
        btn.title = button.title;
        btn.addEventListener("click", button.onClick);
        toolbar.appendChild(btn);
    });

    //오른쪽 버튼들
    const rightToolbar = document.createElement("div");
    rightToolbar.id = "sm-toolbar-right";
    rightToolbar.className = "sm_toolbar_right";
    toolbar.appendChild(rightToolbar);
    const RightButtons = [
        {
            id: "sm-editor-undo",
            className: "sm_toolbar_btn",
            text: "undo",
            title: "되돌리기",
            onClick: () => {
                const view = window.cm_instances[window.cm_instances.length - 1];
                if (view) {
                    undo(view);
                    view.focus();
                }
            }
        },
        {
            id: "sm-editor-redo",
            className: "sm_toolbar_btn",
            text: "redo",
            title: "다시하기",
            onClick: () => {
                const view = window.cm_instances[window.cm_instances.length - 1];
                if (view) {
                    redo(view);
                    view.focus();
                }
            }
        },
        {
            id: "sm-toolbar-settings",
            className: "sm_toolbar_btn",
            text: "settings",
            title: "설정",
            onClick: () => {

            }
        },
        {
            id: "sm-separator",
            className: "sm_toolbar_separator",
            html: "<hr>"
        },
        {
            id: "sm-toolbar-search",
            className: "sm_toolbar_btn",
            text: "search",
            title: "검색",
            onClick: () => {
                const view = window.cm_instances[window.cm_instances.length - 1];
                if (view) {
                    const isSearchOpen = view.dom.querySelector(".cm-search");
                    if (isSearchOpen) {
                        closeSearchPanel(view);
                        view.focus();
                    } else {
                        openSearchPanel(view);
                        view.focus();
                        // 패널이 열린 직후 인풋에 포커스 주기
                        setTimeout(() => {
                            const searchInput = view.dom.querySelector(".cm-search input");
                            if (searchInput) searchInput.focus();
                        }, 10);
                    }
                }
            }
        }
    ];
    RightButtons.forEach((button) => {
        if (button.id == "sm-separator") {
            const hr = document.createElement("hr");
            hr.className = button.className;
            rightToolbar.appendChild(hr);
            return;
        }
        const btn = document.createElement("button");
        btn.id = button.id;
        btn.className = button.className;
        btn.innerHTML = `<span class="material-symbols-outlined">${button.text}</span>`;
        btn.title = button.title;
        btn.addEventListener("click", button.onClick);
        rightToolbar.appendChild(btn);
    });
}
function wrapSelection(before, after = before) {
    const view = window.cm_instances[window.cm_instances.length - 1];
    if (!view) {
        console.error("cm_instances is empty");
        return;
    }
    const { state } = view;
    const { from, to } = state.selection.main;
    const selectedText = state.sliceDoc(from, to); //아무것도 없으면 공백 두개를 선택한 것으로 간주
    const isWrap = selectedText.startsWith(before) && selectedText.endsWith(after);
    if (isWrap && from != to) {
        const unwrapText = selectedText.slice(before.length, selectedText.length - after.length);
        view.dispatch(state.replaceSelection(unwrapText));
    } else {
        const outerText = state.sliceDoc(from - before.length, to + after.length);
        const isOuterWrapped = outerText.startsWith(before) && outerText.endsWith(after);
        if (isOuterWrapped) {
            view.dispatch({
                changes: {
                    from: from - before.length,
                    to: to + after.length,
                    insert: selectedText
                },
                selection: { anchor: from - before.length + (from === to ? 0 : 0) }
            });
        } else {
            view.dispatch({
                changes: { from: from, to: to, insert: `${before}${selectedText}${after}` },
                selection: { anchor: from + before.length + (from === to ? 0 : selectedText.length) }
            });
        }
    }
    view.focus();
}
window.init_codemirror = init_codemirror;
window.get_editor_text = get_editor_text;
window.set_editor_text = set_editor_text;

/* =========================================
   테마 관리 기능
   ========================================= */

const SM_THEME_LIGHT = {
    '--sm-bg-editor': '#ffffff',
    '--sm-color-text': '#24292e',
    '--sm-border-editor': '#e1e4e8',

    '--sm-color-comment': '#6a737d',
    '--sm-color-escape': '#d73a49',
    '--sm-color-error': '#b31d28',
    '--sm-bg-error': '#ffeef0',
    '--sm-deco-error': '#d73a49',

    '--sm-color-bold': '#1b1f23',
    '--sm-color-italic': '#c551bb',
    '--sm-color-strike': '#7c4fe6',
    '--sm-color-underline': '#313de2',
    '--sm-color-script': '#005cc5',

    '--sm-color-header': '#0366d6',
    '--sm-border-header': '#eaecef',

    '--sm-color-quote': '#596068',
    '--sm-border-quote': '#dfe2e5',
    '--sm-bg-quote': '#f8f9fa',

    '--sm-border-hline': '#e1e4e8',
    '--sm-color-hardbreak': '#0366d6',

    '--sm-color-code': '#218b99',
    '--sm-bg-code': '#f3f3f3',

    '--sm-color-tex': '#005cc5',
    '--sm-color-media': '#005cc5',
    '--sm-color-extmedia': '#0652dd',
    '--sm-border-extmedia': '#0652dd',

    '--sm-color-category': '#2ecc71',
    '--sm-color-redirect': '#e67e22',
    '--sm-color-include': '#8e44ad',

    '--sm-color-mention': '#6f42c1',
    '--sm-color-variable': '#e36209',
    '--sm-color-timenow': '#16a085',
    '--sm-bg-timenow': '#e8f8f5',

    '--sm-color-footnote': '#7f8c8d',
    '--sm-color-null': '#bdc3c7',

    '--sm-color-control': '#d63031',
    '--sm-border-styled': '#fab1a0',
    '--sm-color-literal': '#2d3436',
    '--sm-bg-literal': '#dfe6e9',

    '--sm-color-fold': '#6c5ce7',
    '--sm-color-ruby': '#e84393',

    '--sm-border-table': '#ced4da',
    '--sm-bg-table': '#fdfdfe',

    '--sm-bg-toolbar': '#ffffff',
    '--sm-border-toolbar': '#e1e4e8',
    '--sm-shadow-toolbar': 'rgba(0,0,0,0.05)',

    '--sm-btn-text': '#586069',
    '--sm-btn-hover-bg': '#f6f8fa',
    '--sm-btn-hover-border': 'rgba(27,31,35,0.05)',
    '--sm-btn-active-bg': '#e1e4e8',
    '--sm-btn-disabled': '#959da5',

    '--sm-separator': '#e1e4e8',
};

const SM_THEME_DARK = {
    '--sm-bg-editor': '#0d1117',
    '--sm-color-text': '#c9d1d9',
    '--sm-border-editor': '#30363d',

    '--sm-color-comment': '#8b949e',
    '--sm-color-escape': '#ff7b72',
    '--sm-color-error': '#ffa198',
    '--sm-bg-error': '#490202',
    '--sm-deco-error': '#ff7b72',

    '--sm-color-bold': '#c9d1d9',
    '--sm-color-italic': '#d2a8ff',
    '--sm-color-strike': '#8b949e',
    '--sm-color-underline': '#58a6ff',
    '--sm-color-script': '#79c0ff',

    '--sm-color-header': '#58a6ff',
    '--sm-border-header': '#21262d',

    '--sm-color-quote': '#8b949e',
    '--sm-border-quote': '#30363d',
    '--sm-bg-quote': '#161b22',

    '--sm-border-hline': '#30363d',
    '--sm-color-hardbreak': '#79c0ff',

    '--sm-color-code': '#a5d6ff',
    '--sm-bg-code': '#161b22',

    '--sm-color-tex': '#79c0ff',
    '--sm-color-media': '#58a6ff',
    '--sm-color-extmedia': '#1f6feb',
    '--sm-border-extmedia': '#1f6feb',

    '--sm-color-category': '#56d364',
    '--sm-color-redirect': '#e3b341',
    '--sm-color-include': '#bc8cff',

    '--sm-color-mention': '#d2a8ff',
    '--sm-color-variable': '#ffa657',
    '--sm-color-timenow': '#3fb950',
    '--sm-bg-timenow': '#0d1117',

    '--sm-color-footnote': '#8b949e',
    '--sm-color-null': '#6e7681',

    '--sm-color-control': '#ff7b72',
    '--sm-border-styled': '#ffa198',
    '--sm-color-literal': '#c9d1d9',
    '--sm-bg-literal': '#161b22',

    '--sm-color-fold': '#bc8cff',
    '--sm-color-ruby': '#ff7b72',

    '--sm-border-table': '#30363d',
    '--sm-bg-table': '#0d1117',

    '--sm-bg-toolbar': '#0d1117',
    '--sm-border-toolbar': '#30363d',
    '--sm-shadow-toolbar': 'rgba(0,0,0,0.5)',

    '--sm-btn-text': '#8b949e',
    '--sm-btn-hover-bg': '#21262d',
    '--sm-btn-hover-border': '#30363d',
    '--sm-btn-active-bg': '#30363d',
    '--sm-btn-disabled': '#484f58',

    '--sm-separator': '#30363d',
};

export function update_style_variables(variables) {
    let styleTag = document.getElementById("sm-theme-style");
    if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "sm-theme-style";
        document.head.appendChild(styleTag);
    }

    let cssRules = ":root {\n";
    for (const [key, value] of Object.entries(variables)) {
        cssRules += `    ${key}: ${value};\n`;
    }
    cssRules += "}";

    styleTag.textContent = cssRules;
}

export function set_theme(themeName, customTheme = null) {
    switch (themeName) {
        case 'dark':
            update_style_variables(SM_THEME_DARK);
            break;
        case 'light':
            update_style_variables(SM_THEME_LIGHT);
            break;
        case 'custom':
            update_style_variables(customTheme);
            break;
        default:
            console.warn(`Unknown theme: ${themeName}`);
            break;
    }
}

// 테마 설정 저장 (선택된 모드와 커스텀 데이터)
export function save_theme_preference(themeName, customTheme = null) {
    localStorage.setItem('sm_theme_mode', themeName);
    if (themeName === 'custom' && customTheme) {
        localStorage.setItem('sm_custom_theme_data', JSON.stringify(customTheme));
    }
}

// 저장된 테마 불러오기 (안전한 병합 로직 포함)
export function load_theme_preference() {
    const mode = localStorage.getItem('sm_theme_mode') || 'light'; // 기본값 light

    if (mode === 'custom') {
        try {
            const savedData = localStorage.getItem('sm_custom_theme_data');
            if (savedData) {
                const parsed = JSON.parse(savedData);
                // 중요: 나중에 새로운 CSS 변수가 추가되더라도 깨지지 않도록
                // 기본 Light 테마를 베이스로 깔고, 그 위에 저장된 커스텀 값을 덮어씌웁니다.
                const mergedTheme = { ...SM_THEME_LIGHT, ...parsed };
                set_theme('custom', mergedTheme);
                return;
            }
        } catch (e) {
            console.error("Failed to load custom theme:", e);
        }
        // 커스텀 데이터 로드 실패 시 Light 모드로 폴백
        set_theme('light');
    } else {
        set_theme(mode);
    }
}

// Window 객체에 노출
window.update_style_variables = update_style_variables;
window.set_theme = set_theme;
window.save_theme_preference = save_theme_preference;
window.load_theme_preference = load_theme_preference;
window.SM_THEME_LIGHT = SM_THEME_LIGHT;
window.SM_THEME_DARK = SM_THEME_DARK;
