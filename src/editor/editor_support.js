import { sm_renderer, cm_highlighter } from "../../../../sm_bridge.js";

window.cm_instances = [];

// 전역 변수로 저장될 CodeMirror 모듈들
let CM = null;

async function ensure_codemirror() {
    if (CM) return CM;

    // 동적 임포트로 모듈 로드 (WASM이 주입한 importmap을 참조함)
    const [
        { EditorView, basicSetup },
        { EditorState, StateField },
        { Decoration },
        { undoDepth, redoDepth, undo, redo },
        { openSearchPanel, closeSearchPanel }
    ] = await Promise.all([
        import("codemirror"),
        import("@codemirror/state"),
        import("@codemirror/view"),
        import("@codemirror/commands"),
        import("@codemirror/search")
    ]);

    CM = {
        EditorView, basicSetup,
        EditorState, StateField,
        Decoration,
        undoDepth, redoDepth, undo, redo,
        openSearchPanel, closeSearchPanel
    };
    return CM;
}

// 하이라이팅 필드 생성 함수 (CM 로드 후 실행)
function create_sm_highlight_field(CM) {
    const { StateField, Decoration, EditorView } = CM;
    return StateField.define({
        create() { return Decoration.none },
        update(decorations, tr) {
            if (!tr.docChanged && decorations.size > 0) return decorations;

            const raw = tr.state.doc.toString();
            const astJson = cm_highlighter(raw);
            const ast = JSON.parse(astJson);

            const marks = [];
            const collectMarks = (elements) => {
                if (!Array.isArray(elements)) return;

                for (const el of elements) {
                    const type = Object.keys(el)[0];
                    const data = el[type];
                    if (data && data.span) {
                        if (type !== "Text" && type !== "SoftBreak" && type !== "HardBreak") {
                            marks.push(Decoration.mark({ class: `cm-sm-${type}` }).range(data.span.start, data.span.end));
                        }
                        if (data.children) collectMarks(data.children);
                        if (data.summary) collectMarks([data.summary]);
                        if (data.details) collectMarks([data.details]);
                    }
                }
            };

            collectMarks(ast);
            marks.sort((a, b) => a.from - b.from);
            return Decoration.set(marks, true);
        },
        provide: f => EditorView.decorations.from(f)
    });
}

var cm_css = `
:root {
    --sm-bg-editor: #ffffff;
    --sm-color-text: #24292e;
    --sm-border-editor: #e1e4e8;
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
#sm-editor-raw { border-right: 1px solid var(--sm-border-editor); background: var(--sm-bg-editor); }
.cm-sm-Text { color: var(--sm-color-text); }
.cm-sm-Comment { color: var(--sm-color-comment); font-style: italic; }
.cm-sm-Escape { color: var(--sm-color-escape); font-weight: bold; }
.cm-sm-Error { color: var(--sm-color-error); background-color: var(--sm-bg-error); text-decoration: underline wavy var(--sm-deco-error); }
.cm-sm-Bold { font-weight: bold; color: var(--sm-color-bold); }
.cm-sm-Italic { font-style: italic; color: var(--sm-color-italic); }
.cm-sm-Strikethrough { color: var(--sm-color-strike); }
.cm-sm-Underline { color: var(--sm-color-underline); }
.cm-sm-Superscript { font-size: 0.85em; color: var(--sm-color-script); }
.cm-sm-Subscript { font-size: 0.85em; color: var(--sm-color-script); }
.cm-sm-Header { color: var(--sm-color-header); font-weight: bold; border-bottom: 1px solid var(--sm-border-header); display: inline-block; width: 100%; }
.cm-sm-BlockQuote { color: var(--sm-color-quote); border-left: 0.25em solid var(--sm-border-quote); padding-left: 0.5em; font-style: italic; background: var(--sm-bg-quote); }
.cm-sm-HLine { display: block; border-top: 2px solid var(--sm-border-hline); margin: 4px 0; }
.cm-sm-HardBreak { color: var(--sm-color-hardbreak); font-weight: bold; }
.cm-sm-Code { color: var(--sm-color-code); font-family: 'Fira Code', 'Cascadia Code', monospace; background: var(--sm-bg-code); border-radius: 3px; }
.cm-sm-TeX { color: var(--sm-color-tex); font-weight: bold; }
.cm-sm-Media { color: var(--sm-color-media); text-decoration: underline; }
.cm-sm-ExternalMedia { color: var(--sm-color-extmedia); border-bottom: 1px dashed var(--sm-border-extmedia); }
.cm-sm-Category { color: var(--sm-color-category); font-weight: bold; }
.cm-sm-Redirect { color: var(--sm-color-redirect); font-style: italic; }
.cm-sm-Include { color: var(--sm-color-include); font-weight: 500; }
.cm-sm-Mention { color: var(--sm-color-mention); font-weight: bold; }
.cm-sm-Variable { color: var(--sm-color-variable); font-family: monospace; }
.cm-sm-Age, .cm-sm-TimeNow { color: var(--sm-color-timenow); background: var(--sm-bg-timenow); }
.cm-sm-FootnoteRef, .cm-sm-Footnote { color: var(--sm-color-footnote); font-size: 0.9em; }
.cm-sm-Null { color: var(--sm-color-null); text-decoration: line-through; }
.cm-sm-If, .cm-sm-Define { color: var(--sm-color-control); font-weight: bold; }
.cm-sm-Styled { border: 1px solid var(--sm-border-styled); border-radius: 4px; padding: 0 2px; }
.cm-sm-Literal { background: var(--sm-bg-literal); color: var(--sm-color-literal); }
.cm-sm-Fold { color: var(--sm-color-fold); font-weight: bold; }
.cm-sm-Ruby { color: var(--sm-color-ruby); border-bottom: 1px dotted var(--sm-color-ruby); }
.cm-sm-Table { border: 1px solid var(--sm-border-table); background: var(--sm-bg-table); }
.cm-panel.cm-search { background: var(--sm-bg-toolbar) !important; border-top: 1px solid var(--sm-border-toolbar); border-bottom: 1px solid var(--sm-border-toolbar); align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); font-size: 0.9rem; font-family: inherit; position: relative; max-width: 100%; }
.cm-panel.cm-search br { display: block; width: 100%; height: 0; margin: 4px 0; content: ""; }
.cm-panel.cm-search::-webkit-scrollbar { height: 4px; }
.cm-panel.cm-search::-webkit-scrollbar-thumb { background: #ccc; border-radius: 2px; }
.cm-textfield { border: 1px solid var(--sm-border-toolbar); background: var(--sm-bg-editor); color: var(--sm-color-text); border-radius: 4px; padding: 0 8px; height: 30px; outline: none; font-family: inherit; min-width: 100px; flex-grow: 1; }
.cm-textfield:focus { border-color: var(--sm-btn-active-bg); box-shadow: 0 0 0 2px var(--sm-shadow-toolbar); }
.cm-textfield[name="replace"] { margin-top: 4px; }
.cm-panel.cm-search .cm-button { background: transparent; color: var(--sm-btn-text); border: 1px solid var(--sm-border-toolbar); border-radius: 4px; height: 30px; padding: 0 12px; cursor: pointer; font-size: 0.85em; font-weight: 500; display: inline-flex; align-items: center; justify-content: center; text-transform: none; white-space: nowrap; transition: all 0.1s ease; background-image: none; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.cm-panel.cm-search .cm-button:hover { background-color: var(--sm-btn-hover-bg); color: var(--sm-color-text); border-color: var(--sm-btn-hover-border); }
.cm-panel.cm-search .cm-button:active { background-color: var(--sm-btn-active-bg); transform: translateY(1px); }
.cm-panel.cm-search .cm-button[name="close"] { position: absolute; top: 10px; right: 8px; width: 28px !important; height: 28px !important; padding: 0; background-color: transparent; border: none; color: var(--sm-color-error); border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 20; font-size: 1.4em; box-shadow: none; }
.cm-panel.cm-search .cm-button[name="close"]:hover { background-color: var(--sm-bg-error); color: #fff; }
.cm-panel.cm-search label { display: inline-flex; align-items: center; gap: 4px; font-size: 0.85em; color: var(--sm-color-text); margin: 0; cursor: pointer; user-select: none; }
.cm-panel.cm-search input[type="checkbox"] { accent-color: var(--sm-color-header); cursor: pointer; }
@media (max-width: 600px) { .cm-panel.cm-search { flex-direction: column; align-items: stretch; } .cm-textfield { width: 100%; margin-bottom: 4px; } .cm-panel.cm-search .cm-button { flex: 1; } }
`;

const TOOLBAR_CSS = `
    .sm_toolbar { background: var(--sm-bg-toolbar); border-bottom: 1px solid var(--sm-border-toolbar); padding: 6px 12px; display: flex; gap: 4px; align-items: center; border-top-left-radius: 6px; border-top-right-radius: 6px; box-shadow: 0 1px 2px var(--sm-shadow-toolbar); }
    .sm_toolbar_btn { background: transparent; color: var(--sm-btn-text); border: 1px solid transparent; border-radius: 4px; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s cubic-bezier(0.3, 0, 0.5, 1); position: relative; }
    .sm_toolbar_btn .material-symbols-outlined { font-size: 20px; }
    .sm_toolbar_btn:hover:not(:disabled) { background-color: var(--sm-btn-hover-bg); border-color: var(--sm-btn-hover-border); color: var(--sm-color-text); transform: translateY(-0.5px); }
    .sm_toolbar_btn:active:not(:disabled), .sm_toolbar_btn.active { background-color: var(--sm-btn-active-bg); border-color: transparent; transform: translateY(0); transition-duration: 0.05s; }
    .sm_toolbar_btn:disabled { opacity: 0.4; cursor: not-allowed; color: var(--sm-btn-disabled); pointer-events: none; }
    .sm_toolbar_separator { width: 1px; height: 18px; background-color: var(--sm-separator); margin: 0 8px; align-self: center; border: none; }
    .sm_toolbar_right { margin-left: auto; display: flex; gap: 4px; align-items: center; }
`;

export async function init_codemirror(parent, initialDoc = "") {
    const CM = await ensure_codemirror();
    const { EditorView, EditorState, basicSetup, undoDepth, redoDepth, openSearchPanel, closeSearchPanel } = CM;

    const style = document.createElement("style");
    style.textContent = cm_css;
    document.head.appendChild(style);

    const toolbar_style = document.createElement("style");
    toolbar_style.textContent = TOOLBAR_CSS;
    document.head.appendChild(toolbar_style);

    const googleFont = document.createElement("link");
    googleFont.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@400;500;600;700&display=swap";
    googleFont.rel = "stylesheet";
    document.head.appendChild(googleFont);

    const fixedHeightEditor = EditorView.theme({
        "&": { height: "100%" },
        "& .cm-scroller": { overflow: "auto" }
    });

    const koPhrases = {
        "Find": "찿을내용", "Replace": "바꿀내용", "replace": "바꾸기", "replace all": "모두 바꾸기",
        "all": "모두 선택", "match case": "대소문자 구분", "by word": "단어 단위", "regexp": "정규표현식",
        "next": "다음", "previous": "이전", "close": "닫기", "replace with": "바꿀 내용"
    };

    const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
            const raw = update.state.doc.toString();
            const html = sm_renderer(raw);
            const preview = document.getElementById("sm-editor-preview");
            if (preview) preview.innerHTML = html;
        }
        const undoBtn = document.getElementById("sm-editor-undo");
        const redoBtn = document.getElementById("sm-editor-redo");
        if (undoBtn) undoBtn.disabled = undoDepth(update.state) === 0;
        if (redoBtn) redoBtn.disabled = redoDepth(update.state) === 0;

        const searchBtn = document.getElementById("sm-toolbar-search");
        if (searchBtn) {
            const isSearchOpen = update.view.dom.querySelector(".cm-search");
            if (isSearchOpen) searchBtn.classList.add("active");
            else searchBtn.classList.remove("active");
        }
    });

    const smHighlightField = create_sm_highlight_field(CM);

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
    setup_toolbar(CM);

    setTimeout(() => {
        const uBtn = document.getElementById("sm-editor-undo");
        const rBtn = document.getElementById("sm-editor-redo");
        if (uBtn) uBtn.disabled = undoDepth(view.state) === 0;
        if (rBtn) rBtn.disabled = redoDepth(view.state) === 0;
        if (window.load_theme_preference) window.load_theme_preference();
    }, 0);

    return view;
}

export function get_editor_text() {
    if (window.cm_instances && window.cm_instances.length > 0) {
        return window.cm_instances[window.cm_instances.length - 1].state.doc.toString();
    }
    return "";
}

export function set_editor_text(text) {
    if (window.cm_instances && window.cm_instances.length > 0) {
        const view = window.cm_instances[window.cm_instances.length - 1];
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    }
}

function setup_toolbar(CM) {
    const { undo, redo, openSearchPanel, closeSearchPanel } = CM;
    const parent = document.getElementById("sm-editor-raw");
    if (!parent || document.getElementById("sm-toolbar")) return;

    const toolbar = document.createElement("div");
    toolbar.id = "sm-toolbar";
    toolbar.className = "sm_toolbar";
    parent.prepend(toolbar);

    const Buttons = [
        { id: "sm-toolbar-bold", className: "sm_toolbar_btn", text: "format_bold", title: "굵게", onClick: () => wrapSelection("**") },
        { id: "sm-toolbar-italic", className: "sm_toolbar_btn", text: "format_italic", title: "이탤릭체", onClick: () => wrapSelection("*") },
        { id: "sm-toolbar-underline", className: "sm_toolbar_btn", text: "format_underlined", title: "밑줄", onClick: () => wrapSelection("__") },
        { id: "sm-toolbar-strike", className: "sm_toolbar_btn", text: "strikethrough_s", title: "취소선", onClick: () => wrapSelection("~~") },
        { id: "sm-toolbar-superscript", className: "sm_toolbar_btn", html: '<b>X<sup>2</sup></b>', title: "상위첨자", onClick: () => wrapSelection("^^") },
        { id: "sm-toolbar-subscript", className: "sm_toolbar_btn", html: '<b>X<sub>2</sub></b>', title: "하위첨자", onClick: () => wrapSelection(",,") },
    ];

    Buttons.forEach((button) => {
        const btn = document.createElement("button");
        btn.id = button.id;
        btn.className = button.className;
        btn.innerHTML = button.html || `<span class="material-symbols-outlined">${button.text}</span>`;
        btn.title = button.title;
        btn.addEventListener("click", button.onClick);
        toolbar.appendChild(btn);
    });

    const rightToolbar = document.createElement("div");
    rightToolbar.className = "sm_toolbar_right";
    toolbar.appendChild(rightToolbar);

    const RightButtons = [
        {
            id: "sm-editor-undo", className: "sm_toolbar_btn", text: "undo", title: "되돌리기", onClick: () => {
                const view = window.cm_instances[window.cm_instances.length - 1];
                if (view) { undo(view); view.focus(); }
            }
        },
        {
            id: "sm-editor-redo", className: "sm_toolbar_btn", text: "redo", title: "다시하기", onClick: () => {
                const view = window.cm_instances[window.cm_instances.length - 1];
                if (view) { redo(view); view.focus(); }
            }
        },
        {
            id: "sm-toolbar-search", className: "sm_toolbar_btn", text: "search", title: "검색", onClick: () => {
                const view = window.cm_instances[window.cm_instances.length - 1];
                if (view) {
                    if (view.dom.querySelector(".cm-search")) closeSearchPanel(view);
                    else { openSearchPanel(view); setTimeout(() => view.dom.querySelector(".cm-search input")?.focus(), 10); }
                    view.focus();
                }
            }
        }
    ];

    RightButtons.forEach((button) => {
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
    if (!view) return;
    const { state } = view;
    const { from, to } = state.selection.main;
    const selectedText = state.sliceDoc(from, to);
    const isWrap = selectedText.startsWith(before) && selectedText.endsWith(after);

    if (isWrap && from != to) {
        view.dispatch(state.replaceSelection(selectedText.slice(before.length, -after.length)));
    } else {
        view.dispatch({
            changes: { from, to, insert: `${before}${selectedText}${after}` },
            selection: { anchor: from + before.length + (from === to ? 0 : selectedText.length) }
        });
    }
    view.focus();
}
