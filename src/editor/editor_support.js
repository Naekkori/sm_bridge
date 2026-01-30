// 1번 라인의 순환 참조 임포트 제거
// import { sm_renderer, cm_highlighter, get_crate_info } from "../../../../sm_bridge.js";


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
            // 전역(window) 객체나 sm_bridge 를 통해 제공되는 함수 사용
            const astJson = (typeof cm_highlighter !== 'undefined' ? cm_highlighter : window.cm_highlighter)(raw);

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

/* 다크 테마 */
body.dark {
    --sm-bg-editor: #2b2b2b;
    --sm-color-text: #e8e8e8;
    --sm-border-editor: #3e3e42;
    --sm-color-comment: #6a9955;
    --sm-color-escape: #f48771;
    --sm-color-error: #f14c4c;
    --sm-bg-error: #5a1d1d;
    --sm-deco-error: #f14c4c;
    --sm-color-bold: #ffffff;
    --sm-color-italic: #c586c0;
    --sm-color-strike: #b392f0;
    --sm-color-underline: #79b8ff;
    --sm-color-script: #4fc1ff;
    --sm-color-header: #569cd6;
    --sm-border-header: #3e3e42;
    --sm-color-quote: #9cdcfe;
    --sm-border-quote: #3e3e42;
    --sm-bg-quote: #252526;
    --sm-border-hline: #3e3e42;
    --sm-color-hardbreak: #569cd6;
    --sm-color-code: #4ec9b0;
    --sm-bg-code: #3c3c3c;
    --sm-color-tex: #4fc1ff;
    --sm-color-media: #4fc1ff;
    --sm-color-extmedia: #79b8ff;
    --sm-border-extmedia: #79b8ff;
    --sm-color-category: #4ec9b0;
    --sm-color-redirect: #ce9178;
    --sm-color-include: #c586c0;
    --sm-color-mention: #b392f0;
    --sm-color-variable: #dcdcaa;
    --sm-color-timenow: #4ec9b0;
    --sm-bg-timenow: #1e3a32;
    --sm-color-footnote: #808080;
    --sm-color-null: #6a737d;
    --sm-color-control: #f48771;
    --sm-border-styled: #f48771;
    --sm-color-literal: #ce9178;
    --sm-bg-literal: #3c3c3c;
    --sm-color-fold: #b392f0;
    --sm-color-ruby: #c586c0;
    --sm-border-table: #3e3e42;
    --sm-bg-table: #252526;
    --sm-bg-toolbar: #323232;
    --sm-border-toolbar: #3e3e42;
    --sm-shadow-toolbar: rgba(0,0,0,0.3);
    --sm-btn-text: #cccccc;
    --sm-btn-hover-bg: #3e3e42;
    --sm-btn-hover-border: rgba(255,255,255,0.1);
    --sm-btn-active-bg: #505050;
    --sm-btn-disabled: #6a737d;
    --sm-separator: #3e3e42;
}

#sm-editor-raw { height: 100%; background: var(--sm-bg-editor); display: flex; flex-direction: column; }
#sm-editor-preview { 
    height: 100%;
    background: var(--sm-bg-editor); 
    color: var(--sm-color-text); 
    padding: 1rem; 
    overflow-y: auto; 
    border-left: 1px solid var(--sm-border-editor);
    flex: 1;
}

/* CodeMirror 에디터 배경 및 텍스트 색상 */
.cm-editor { flex: 1; display: flex; flex-direction: column; background-color: var(--sm-bg-editor) !important; color: var(--sm-color-text) !important; }
.cm-content { color: var(--sm-color-text) !important; }
.cm-line { color: var(--sm-color-text) !important; }
.cm-cursor { border-left-color: var(--sm-color-text) !important; }
.cm-selectionBackground, .cm-focused .cm-selectionBackground { background-color: #3392FF44 !important; }
.cm-selectionMatch { background-color: #3392FF22 !important; }
.cm-activeLine { background-color: #88888811 !important; }
.cm-gutters { background-color: var(--sm-bg-editor) !important; border-right: 1px solid var(--sm-border-editor) !important; }
.cm-lineNumbers .cm-gutterElement { color: #858585 !important; }
body.dark .cm-lineNumbers .cm-gutterElement { color: #858585 !important; }

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
.cm-sm-Header { color: var(--sm-color-header); font-weight: bold; border-bottom: 1px solid var(--sm-border-header); }
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
body.dark .cm-panel.cm-search .cm-button[name="close"] { color: #fff; }
.cm-panel.cm-search label { display: inline-flex; align-items: center; gap: 4px; font-size: 0.85em; color: var(--sm-color-text); margin: 0; cursor: pointer; user-select: none; }
.cm-panel.cm-search input[type="checkbox"] { accent-color: var(--sm-color-header); cursor: pointer; }
@media (max-width: 600px) { .cm-panel.cm-search { flex-direction: column; align-items: stretch; } .cm-textfield { width: 100%; margin-bottom: 4px; } .cm-panel.cm-search .cm-button { flex: 1; } }
`;

const TOOLBAR_CSS = `
    .sm_toolbar { background: var(--sm-bg-toolbar); border-bottom: 1px solid var(--sm-border-toolbar); padding: 6px 12px; display: flex; gap: 4px; align-items: center; border-top-left-radius: 6px; border-top-right-radius: 6px; box-shadow: 0 1px 2px var(--sm-shadow-toolbar); position: relative; }
    .sm_toolbar_btn { background: transparent; color: var(--sm-btn-text); border: 1px solid transparent; border-radius: 4px; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s cubic-bezier(0.3, 0, 0.5, 1); position: relative; }
    .sm_toolbar_btn .material-symbols-outlined { font-size: 20px; }
    .sm_toolbar_btn:hover:not(:disabled) { background-color: var(--sm-btn-hover-bg); border-color: var(--sm-btn-hover-border); color: var(--sm-color-text); transform: translateY(-0.5px); }
    .sm_toolbar_btn:active:not(:disabled), .sm_toolbar_btn.active { background-color: var(--sm-btn-active-bg); border-color: transparent; transform: translateY(0); transition-duration: 0.05s; }
    .sm_toolbar_btn:disabled { opacity: 0.4; cursor: not-allowed; color: var(--sm-btn-disabled); pointer-events: none; }
    .sm_toolbar_separator { width: 1px; height: 18px; background-color: var(--sm-separator); margin: 0 8px; align-self: center; border: none; }
    .sm_toolbar_right { margin-left: auto; display: flex; gap: 4px; align-items: center; }
    
    .sm_dropdown { position: relative; display: inline-block; }
    .sm_dropdown_content { display: none; position: absolute; background-color: var(--sm-bg-toolbar); min-width: 160px; box-shadow: 0 8px 16px rgba(0,0,0,0.1); border: 1px solid var(--sm-border-toolbar); border-radius: 4px; z-index: 1000; top: 120%; left: 0; margin-top: 4px; }
    .sm_dropdown.show .sm_dropdown_content { display: block; }
    .sm_dropdown_item { color: var(--sm-color-text); padding: 8px 12px; text-decoration: none; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: background 0.2s; font-size: 0.9rem; white-space: nowrap; }
    .sm_dropdown_item:hover { background-color: var(--sm-btn-hover-bg); }
    .sm_dropdown_item .material-symbols-outlined { font-size: 18px; color: var(--sm-btn-text); }

    /*툴바 팝업 (링크만들기, 유튜브영상 첨부 및 미리보기 등등)*/
    .sm_modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 10000; }
    .sm_modal_content { background-color: var(--sm-bg-toolbar); border-radius: 6px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 1px solid var(--sm-border-toolbar); position: relative; min-width: 300px; color: var(--sm-color-text); }
    .sm_modal_content h3 { color: var(--sm-color-text); margin-top: 0; }
    .sm_modal_content label { color: var(--sm-color-text); }
    .sm_modal_close { position: absolute; top: 8px; right: 8px; cursor: pointer; font-size: 24px; color: var(--sm-btn-text); }
    .sm_modal_close:hover { color: var(--sm-color-error); }
    .sm-editor-logo {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    /*블록하이라이팅 (프리뷰)*/
    .sm-render-block.highlight {
        background-color: rgba(90, 136, 206, 0.3) !important;
        /* 인라인 요소이므로 border-radius는 좌우 끝에만 적용됨 */
        transition: background-color 0.1s;
    }
`;

// 테마 전환 헬퍼 함수
function setEditorTheme(theme) {
    document.body.classList.remove("dark", "light");
    if (theme === "dark") {
        document.body.classList.add("dark");
    }
    // light는 기본 :root 변수 사용
    localStorage.setItem("sm-editor-theme", theme);
}

// 저장된 테마 불러오기
function loadEditorTheme() {
    const savedTheme = localStorage.getItem("sm-editor-theme") || "light";
    setEditorTheme(savedTheme);
    return savedTheme;
}

// 전역에 등록
window.setEditorTheme = setEditorTheme;
window.loadEditorTheme = loadEditorTheme;
var targetScroll = 0;
var currentScroll = 0;
var isRunning = false;
var scrollSource = null; // 'editor' | 'preview'
var lastSetTop = { editor: -1, preview: -1 };
const lerpFactor = 0.2;
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
        if (update.docChanged || update.selectionSet) {
            const raw = update.state.doc.toString();
            const ast = JSON.parse(window.cm_highlighter(raw));
            const htmlResult = (typeof sm_renderer !== 'undefined' ? sm_renderer : window.sm_renderer)(raw);
            const html = Array.isArray(htmlResult) ? htmlResult.join("") : htmlResult;
            const { from, to } = update.state.selection.main;

            const activeType = findActiveType(ast, from, to);

            updateToolbarButtons(activeType);

            const preview = document.getElementById("sm-editor-preview");
            if (preview) {
                preview.innerHTML = html;
                // 에디터 수정 시 프리뷰 위치 강제 동기화 (타이핑 시 프리뷰 따라오게)
                if (scrollSource !== 'preview') {
                    const scroller = update.view.scrollDOM;
                    const maxEditor = scroller.scrollHeight - scroller.clientHeight;
                    const maxPreview = preview.scrollHeight - preview.clientHeight;
                    if (maxEditor > 0 && maxPreview > 0) {
                        const percentage = scroller.scrollTop / maxEditor;
                        targetScroll = percentage * maxPreview;
                        if (!isRunning) {
                            scrollSource = 'editor';
                            currentScroll = preview.scrollTop;
                            smoothScroll();
                        }
                    }
                }
            }
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

        const { from, to } = update.state.selection.main;
        // 편집하는곳 표시
        if (from !== to) {
            const previewBlocks = document.querySelectorAll(".sm-render-block");
            previewBlocks.forEach(block => {
                const start = parseInt(block.dataset.start);
                const end = parseInt(block.dataset.end);

                const isOverlapping = Math.max(start, from) < Math.min(end, to);
                const isCursorInside = (from === to) && (start <= from && end >= to);
                if (isOverlapping || isCursorInside) {
                    block.classList.add("highlight");
                } else {
                    block.classList.remove("highlight");
                }
            });
        } else {
            document.querySelectorAll(".sm-render-block.highlight").forEach(block => {
                block.classList.remove("highlight");
            });
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
    // 에디터 -> 프리뷰 동기화
    const scroller = view.scrollDOM;
    const preview = document.getElementById("sm-editor-preview");

    scroller.addEventListener("scroll", () => {
        // 우리가 코드로 옮긴 위치라면 무시 (에코 방지)
        if (Math.abs(scroller.scrollTop - lastSetTop.editor) < 1) return;

        scrollSource = 'editor';
        const maxEditor = scroller.scrollHeight - scroller.clientHeight;
        const maxPreview = preview.scrollHeight - preview.clientHeight;
        if (maxEditor <= 0 || maxPreview <= 0) return;

        const percentage = scroller.scrollTop / maxEditor;
        targetScroll = percentage * maxPreview;

        if (!isRunning) {
            currentScroll = preview.scrollTop;
            smoothScroll();
        }
    });

    // 프리뷰 -> 에디터 동기화
    preview.addEventListener("scroll", () => {
        // 우리가 코드로 옮긴 위치라면 무시 (에코 방지)
        if (Math.abs(preview.scrollTop - lastSetTop.preview) < 1) return;

        scrollSource = 'preview';
        const maxEditor = scroller.scrollHeight - scroller.clientHeight;
        const maxPreview = preview.scrollHeight - preview.clientHeight;
        if (maxEditor <= 0 || maxPreview <= 0) return;

        const percentage = preview.scrollTop / maxPreview;
        targetScroll = percentage * maxEditor;

        if (!isRunning) {
            currentScroll = scroller.scrollTop;
            smoothScroll();
        }
    });
    window.cm_instances.push(view);
    setup_toolbar(CM);

    setTimeout(() => {
        const uBtn = document.getElementById("sm-editor-undo");
        const rBtn = document.getElementById("sm-editor-redo");
        if (uBtn) uBtn.disabled = undoDepth(view.state) === 0;
        if (rBtn) rBtn.disabled = redoDepth(view.state) === 0;

        // 저장된 테마 불러오기
        loadEditorTheme();
    }, 0);

    return view;
}
function smoothScroll() {
    const preview = document.getElementById("sm-editor-preview");
    const scroller = (window.cm_instances && window.cm_instances.length > 0)
        ? window.cm_instances[window.cm_instances.length - 1].scrollDOM
        : null;

    if (!scrollSource || !preview || !scroller) {
        isRunning = false;
        return;
    }

    const targetEl = scrollSource === 'editor' ? preview : scroller;
    const targetKey = scrollSource === 'editor' ? 'preview' : 'editor';

    if (Math.abs(targetScroll - currentScroll) < 0.5) {
        currentScroll = targetScroll;
        lastSetTop[targetKey] = currentScroll; // 우리가 설정한 값임을 기록
        targetEl.scrollTop = currentScroll;
        isRunning = false;
        return;
    }

    isRunning = true;
    currentScroll += (targetScroll - currentScroll) * lerpFactor;
    lastSetTop[targetKey] = currentScroll; // 우리가 설정한 값임을 기록
    targetEl.scrollTop = currentScroll;
    requestAnimationFrame(smoothScroll);
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

// 전역에서 접근할 수 있도록 window 객체에 등록
window.get_editor_text = get_editor_text;
window.set_editor_text = set_editor_text;

function setup_toolbar(CM) {
    const { openSearchPanel, closeSearchPanel, undo, redo } = CM;
    const parent = document.getElementById("sm-editor-raw");
    if (!parent || document.getElementById("sm-toolbar")) return;
    parent.style.position = "relative"; // 모달을 위한 상대 좌표계 설정

    const toolbar = document.createElement("div");
    toolbar.id = "sm-toolbar";
    toolbar.className = "sm_toolbar";
    parent.prepend(toolbar);

    const Buttons = [
        { id: "sm-toolbar-bold", className: "sm_toolbar_btn", text: "format_bold", title: "굵게", onClick: () => toggleSyntax("**", "**", "Bold") },
        { id: "sm-toolbar-italic", className: "sm_toolbar_btn", text: "format_italic", title: "이탤릭체", onClick: () => toggleSyntax("*", "*", "Italic") },
        { id: "sm-toolbar-underline", className: "sm_toolbar_btn", text: "format_underlined", title: "밑줄", onClick: () => toggleSyntax("__", "__", "Underline") },
        { id: "sm-toolbar-strike", className: "sm_toolbar_btn", text: "strikethrough_s", title: "취소선", onClick: () => toggleSyntax("~~", "~~", "Strikethrough") },
        { id: "sm-toolbar-superscript", className: "sm_toolbar_btn", html: '<b>X<sup>2</sup></b>', title: "상위첨자", onClick: () => toggleSyntax("^^", "^^", "Superscript") },
        { id: "sm-toolbar-subscript", className: "sm_toolbar_btn", html: '<b>X<sub>2</sub></b>', title: "하위첨자", onClick: () => toggleSyntax(",,", ",,", "Subscript") },
        { id: "sm-separator", className: "sm_toolbar_btn sm_toolbar_separator" },
        {
            id: "sm-toolbar-headings",
            className: "sm_toolbar_btn",
            text: "format_size",
            title: "머릿말",
            type: "dropdown",
            options: [
                { text: "제목 1 (가장 크게)", icon: "format_size", size: "1.5rem", onClick: () => toggleSyntax("# ", "", "Header") },
                { text: "제목 2 (크게)", icon: "format_size", size: "1.4rem", onClick: () => toggleSyntax("## ", "", "Header") },
                { text: "제목 3 (중간)", icon: "format_size", size: "1.3rem", onClick: () => toggleSyntax("### ", "", "Header") },
                { text: "제목 4 (작게)", icon: "format_size", size: "1.2rem", onClick: () => toggleSyntax("#### ", "", "Header") },
                { text: "제목 5 (더 작게)", icon: "format_size", size: "1.1rem", onClick: () => toggleSyntax("##### ", "", "Header") },
                { text: "제목 6 (가장 작게)", icon: "format_size", size: "1.0rem", onClick: () => toggleSyntax("###### ", "", "Header") },
            ]
        },
        {
            id: "sm-toolbar-hline",
            className: "sm_toolbar_btn",
            text: "horizontal_rule",
            title: "가로선",
            type: "dropdown",
            options: [
                { text: "가로선 3개", icon: "horizontal_rule", onClick: () => wrapSelection("---", "") },
                { text: "가로선 4개", icon: "horizontal_rule", onClick: () => wrapSelection("----", "") },
                { text: "가로선 5개", icon: "horizontal_rule", onClick: () => wrapSelection("-----", "") },
                { text: "가로선 6개", icon: "horizontal_rule", onClick: () => wrapSelection("------", "") },
                { text: "가로선 7개", icon: "horizontal_rule", onClick: () => wrapSelection("-------", "") },
                { text: "가로선 8개", icon: "horizontal_rule", onClick: () => wrapSelection("--------", "") },
                { text: "가로선 9개", icon: "horizontal_rule", onClick: () => wrapSelection("---------", "") },
            ]
        },
        {
            id: "sm-toolbar-quotes",
            className: "sm_toolbar_btn",
            text: "format_quote",
            title: "인용",
            onClick: () => toggleSyntax("{{{#quote\n", "\n}}}", "BlockQuote")
        }
    ];
    Buttons.forEach((button) => {
        if (button.id === "sm-separator") {
            const sep = document.createElement("div");
            sep.className = "sm_toolbar_separator";
            toolbar.appendChild(sep);
            return;
        }

        if (button.type === "dropdown") {
            const dropdown = create_dropdown(button);
            toolbar.appendChild(dropdown);
            return;
        }

        const btn = document.createElement("button");
        btn.id = button.id;
        btn.className = button.className;
        btn.innerHTML = button.html || `<span class="material-symbols-outlined">${button.text}</span>`;
        btn.title = button.title;
        btn.addEventListener("click", button.onClick);
        toolbar.appendChild(btn);
    });

    // 드롭다운 생성 헬퍼
    function create_dropdown(config) {
        const container = document.createElement("div");
        container.className = "sm_dropdown";

        const btn = document.createElement("button");
        btn.id = config.id;
        btn.className = config.className;
        btn.innerHTML = `<span class="material-symbols-outlined">${config.text}</span>`;
        btn.title = config.title;

        const content = document.createElement("div");
        content.className = "sm_dropdown_content";

        config.options.forEach(opt => {
            const item = document.createElement("div");
            item.className = "sm_dropdown_item";
            item.innerHTML = `<span class="material-symbols-outlined" style="font-size: ${opt.size}">${opt.icon}</span> <span>${opt.text}</span>`;
            item.addEventListener("click", () => {
                opt.onClick();
                container.classList.remove("show");
            });
            content.appendChild(item);
        });

        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            document.querySelectorAll(".sm_dropdown").forEach(d => {
                if (d !== container) d.classList.remove("show");
            });
            container.classList.toggle("show");
        });

        container.appendChild(btn);
        container.appendChild(content);
        return container;
    }

    // 외부 클릭 시 드롭다운 닫기
    if (!window.sm_dropdown_listener_added) {
        document.addEventListener("click", () => {
            document.querySelectorAll(".sm_dropdown").forEach(d => d.classList.remove("show"));
        });
        window.sm_dropdown_listener_added = true;
    }

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
        },
        {
            id: "sm-toolbar-settings", className: "sm_toolbar_btn", text: "settings", title: "설정",
            onClick: () => {
                const smBridgeLogo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAExElEQVR4nOydy28bRRzHZ73r18bPOA+5TeOmSapWLZCKR1VAoBaKBKhInFE5gcQFJI6cOHJCSFw5of4BIAGHghAgqlblmUZG0CiBNo3rxLFjJ3bW68d6+TkbNm6yTvwTl271/WgO49mdkfzRzG9+Mz5Yuf312wL0hiJAz0AWA8hiAFkMIIsBZDGALAaQxQCyGEAWA8hiAFkMIIsBZDGALAaQxQCyGEAWA8hiAFkMIIsBZDGALAaQxQCyGEAWA8hiAFkMIIsBZDGALAaQxQCyGEAWA8hiAFkMIIsBZDGALAaQxQCyGEAWA8hiAFkMIIsBZDGALAaQxQCyGEAWA8hiAFkMIIsBZDGALAaQxQCyGEAWA8hiAFkMIIsBZDGALAaQxQCyGEAWA8hiAFkMIIsBZDGALAaQxQCyGEAWg71kSR6vmnxUHXzYG0oq/mhTL9bLi9rS79rKjDBbnW/6o2OxyQuOg9TLmepKWl+dFcIULqerLH98cuCh12V/dPtVdZCKOnzKqK6W5r/ayP5sP/L4+vzxiS7jTIRHn23Vy/n0Jb3wl3AzHsdWJZgYmnqz01QncrA/cfKiL5rabjL3mTUeX3jo1Fve8IhwM84zKzZxQVIC7ZrZKs19oRdm65WMJMmhkScjh5+T/bHS3Jf1tduOfbPXPmhUslSRA3Fv33AwcSycOtd+IHli4y+uTH8iXIujLEkdfsSqrS98t37rW6tumq3ywg/lO1fUwZNa7sa9PaTdoxh6kQotPbJGi5dafC6fWQ7LUPaFhSRb9WZ1dedj09hpaj+siSbac8vdm6+DLKOxYW924YNnJNkn/h927G9sLAs34xTgae4sT1tVCskHn34/fvRVj6LuNUyXAC8pwejEy4H+o9bH8uIV4Wac10Vx9vPAwHGPEhSbG1k4dTY08hStvsri1Vpp3qFDR8xKnHjNNOrtoQP9cjBOz6z2yp0ftaXfhJtxlmXUSss/fdTODyKHrBZajH3Jx6k0tVzx5mfV/B/3dOiYWb7I6O4BK5lra/9cFi5HfvfiaccHrUalkrlKsdkbGm6H/P/wePv6ko+Rnlpxzm70qkObjV0h6ZHUWUpH9MJN4Vr22Z603DSVQOI4fdV26JG2Ylx0/KV6JVt12hbtPIsmoxIcUNQBdWhqU6UUSZ2jZILyD+FOetrL9cKfVORA/+DUG3auFD3ywrYspzyLIlejcpdKNTejBOP+2Dg1hg6cdq8sT++vGvrq0vUP7fOdL3yITto99q3m0laFDlLCtTCzRJNC/3wgccz6JMles9XopR+dtK1Ky6jZjaPnP+58Z+Gbd8T9jfPMorPh1oFuF3QbYVVaTa3V0LZa9zxIUwqiDk9ZdbqxEa7FYWZRfhAZOy/a8eWJyt3rG9lf6IJFkgO+yAhFaDvD1LK/7j20FeD9sSPh0WeoYjXaJ0034iDLXmXe0AHK3ansfsc09LXOr90R4JNn3hNdKC9835lwuA4HWYX0pUY5Exl73uMNOfahuJWf+ZTivegZo76+9vdlSuKFm5G6/gudJAcHT9BtFF3y0RZGl1l0A9G+I86nteUbNLU63/VFD8cnX9kxgGkahl5qanm9OFsr3XoArpUl/GVf7+DXHQaQxQCyGEAWg38BAAD////s03YAAAAGSURBVAMAlF1s4mdoB4EAAAAASUVORK5CYII="
                const view = window.cm_instances[window.cm_instances.length - 1];
                if (!view) return;

                createModal(`
                    <h3 style="margin-top:0">Editor Settings</h3>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <label style="display:flex; justify-content:space-between; align-items:center;">
                            테마: <select id="sm-editor-theme-select">
                                <option value="light" ${!document.body.classList.contains('dark') ? 'selected' : ''}>Light</option>
                                <option value="dark" ${document.body.classList.contains('dark') ? 'selected' : ''}>Dark</option>
                            </select>
                        </label>
                        <hr style="width: 100%; border: 0; border-top: 1px solid var(--sm-border-editor); margin: 5px 0;">
                        <div style="display:flex; flex-direction:column; gap:5px; margin-top:10px;">
                            <div class="sm-editor-logo">
                                <img src="${smBridgeLogo}" alt="sm_bridge_logo" style="width: 50px; height: 50px;">
                                <span style="font-size: 25pt;">SM Bridge</span>
                            </div>
                            <code id="sm-editor-info" style="padding-left: 60px; opacity: 0.8;"></code>
                        </div>
                    </div>
                `, (modal) => {
                    const select = modal.querySelector("#sm-editor-theme-select");
                    select.addEventListener("change", () => {
                        const theme = select.value;
                        window.setEditorTheme(theme);
                    });
                    const info = modal.querySelector("#sm-editor-info");
                    const info_func = typeof get_crate_info !== 'undefined' ? get_crate_info : window.get_crate_info;
                    let crate_info = JSON.parse(info_func());

                    info.innerHTML = `${crate_info.name} v${crate_info.version} <br> ${crate_info.author.join(", ")} <br> ${crate_info.description}`;
                });
            }
        }
    ];

    RightButtons.forEach((button) => {
        if (button.id === "sm-separator") {
            const sep = document.createElement("div");
            sep.className = "sm_toolbar_separator";
            rightToolbar.appendChild(sep);
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
function toggleSyntax(before, after, astType) {
    const view = window.cm_instances[window.cm_instances.length - 1];
    if (!view) return;
    const { state } = view;
    const { from, to } = state.selection.main;
    const raw = state.doc.toString();
    const ast = JSON.parse(window.cm_highlighter(raw));

    // 현재 선택/커서 위치를 포함하는 해당 타입의 노드 찾기
    const targetNode = findNodeByType(ast, from, to, astType);

    if (targetNode) {
        // 이미 해당 문법 노드 안에 있음 -> Unwrap (제거)
        const start = targetNode.span.start;
        const end = targetNode.span.end;
        // 앞뒤 마커 길이를 제외한 순수 텍스트 추출
        const content = raw.slice(start + before.length, end - after.length);

        view.dispatch({
            changes: { from: start, to: end, insert: content },
            selection: { anchor: Math.max(start, from - before.length), head: Math.min(start + content.length, to - before.length) }
        });
    } else {
        // 노드가 없음 -> Wrap (적용)
        const selectedText = state.sliceDoc(from, to);
        view.dispatch({
            changes: { from, to, insert: `${before}${selectedText}${after}` },
            selection: { anchor: from + before.length + (from === to ? 0 : selectedText.length) }
        });
    }
    view.focus();
}

export function get_cm_ast() {
    const view = window.cm_instances[window.cm_instances.length - 1];
    if (!view) return;
    const { state } = view;
    const raw = state.doc.toString();
    const ast = JSON.parse(window.cm_highlighter(raw));
    return ast;
}
window.get_cm_ast = get_cm_ast;

function findNodeByType(nodes, from, to, targetType) {
    if (!nodes) return null;
    for (const node of nodes) {
        const type = Object.keys(node)[0];
        const data = node[type];
        if (data && data.span) {
            // 선택 영역이 노드 범위 안에 완전히 포함되는지 확인
            if (from >= data.span.start && to <= data.span.end) {
                if (type === targetType) return data;
                if (data.children) {
                    const found = findNodeByType(data.children, from, to, targetType);
                    if (found) return found;
                }
            }
        }
    }
    return null;
}
function createModal(content, onMount) {
    const sm_ed_area = document.getElementById("sm-editor-raw");
    const modal = document.createElement("div");
    modal.className = "sm_modal";
    modal.innerHTML = `
        <div class="sm_modal_content">
            <span class="sm_modal_close">&times;</span>
            ${content}
        </div>
    `;
    const closeBtn = modal.querySelector(".sm_modal_close");
    closeBtn.addEventListener("click", () => {
        modal.remove();
    });

    sm_ed_area.appendChild(modal);

    // 모달이 DOM에 추가된 후 실행할 콜백 (이벤트 리스너 등록 등)
    if (typeof onMount === "function") {
        onMount(modal);
    }

    return modal;
}
function findActiveType(nodes, from, to, activeSet = new Set()) {
    if (!nodes) return activeSet;
    for (const node of nodes) {
        const type = Object.keys(node)[0];
        const data = node[type];

        if (data && data.span) {
            // AST는 start, end를 사용하므로 수정
            if (from >= data.span.start && to <= data.span.end) {
                if (type !== "Text" && type !== "SoftBreak" && type !== "HardBreak") {
                    activeSet.add(type);
                }

                if (data.children) {
                    findActiveType(data.children, from, to, activeSet);
                }
            }
        }
    }
    return activeSet;
}

function updateToolbarButtons(activeSet) {
    const mapping = {
        "Bold": "sm-toolbar-bold",
        "Italic": "sm-toolbar-italic",
        "Underline": "sm-toolbar-underline",
        "Strikethrough": "sm-toolbar-strike",
        "Superscript": "sm-toolbar-superscript",
        "Subscript": "sm-toolbar-subscript",
        "Header": "sm-toolbar-headings",
        "BlockQuote": "sm-toolbar-quotes",
        "HLine": "sm-toolbar-hline"
    };

    // 매핑된 모든 버튼 초기화
    Object.values(mapping).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.remove("active");
    });

    // 활성화된 타입에 불 들어오게 하기
    activeSet.forEach(type => {
        const id = mapping[type];
        if (id) {
            const btn = document.getElementById(id);
            if (btn) btn.classList.add("active");
        }
    });
}
// 전역에 등록하여 ReferenceError 방지
window.init_codemirror = init_codemirror;