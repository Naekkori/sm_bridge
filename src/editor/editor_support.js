// Worker 환경 등에서 잘못 로드되었을 때 에러 방지
const isBrowser = typeof window !== 'undefined';

if (isBrowser) {
    window.cm_instances = [];
}

let worker = null;
if (isBrowser) {
    worker = new Worker(new URL('./worker.js', import.meta.url), {type: "module"});
}

function runWorker(type, payload) {
    if (!worker) {
        return Promise.reject(new Error("Worker not initialized"));
    }
    return new Promise((resolve, reject) => {
        const id = window.crypto.randomUUID().substring(0, 5);
        const handler = (e) => {
            worker.removeEventListener('message', handler);
            if (e.data.status === 'success') {
                resolve(e.data.result);
            } else {
                reject(e.data.error || e.data.result || "Unknown Worker Error");
            }
        };

        worker.addEventListener('message', handler);
        worker.postMessage({id, type, payload});
    });
}

async function loadExcelSheet(uint8Arr) {
    return await runWorker("GET_SHEETS", {data: uint8Arr});
}

async function loadExcelData(uint8Arr, sheetName) {
    return await runWorker("OPEN_EXCEL", {data: uint8Arr, sheetName})
}

async function loadCsvData(uint8Arr) {
    return await runWorker("OPEN_CSV", {data: uint8Arr});
}

// 전역 변수로 저장될 CodeMirror 모듈들
let CM = null;

async function ensure_codemirror() {
    if (CM) return CM;

    // 동적 임포트로 모듈 로드 (WASM이 주입한 importmap을 참조함)
    const [
        {EditorView, basicSetup},
        {EditorState, StateField},
        {Decoration, keymap},
        {undoDepth, redoDepth, undo, redo, indentWithTab},
        {openSearchPanel, closeSearchPanel}
    ] = await Promise.all([
        import("codemirror"),
        import("@codemirror/state"),
        import("@codemirror/view"),
        import("@codemirror/commands"),
        import("@codemirror/search")
    ]);

    CM = {
        EditorView, basicSetup, keymap,
        EditorState, StateField,
        Decoration,
        undoDepth, redoDepth, undo, redo, indentWithTab,
        openSearchPanel, closeSearchPanel
    };
    return CM;
}

// 하이라이팅 필드 생성 함수 (CM 로드 후 실행)
function create_sm_highlight_field(CM) {
    const {StateField, Decoration, EditorView} = CM;
    return StateField.define({
        create() {
            return Decoration.none
        },
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
                            marks.push(Decoration.mark({class: `cm-sm-${type}`}).range(data.span.start, data.span.end));
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
    --sm-color-head: #3b719c;
    --sm-border-header: #eaecef;
    --sm-color-quote: #596068;
    --sm-border-quote: #dfe2e5;
    --sm-bg-quote: #f8f9fa;
    --sm-border-hline: #e1e4e8;
    --sm-color-hardbreak: #0366d6;
    --sm-color-code: #218b99;
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
    --sm-color-literal: #3a484d;
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
    --sm-color-text-secondary: white;
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
    --sm-color-head: #5d9ed3ff;
    --sm-border-header: #3e3e42;
    --sm-color-quote: #9cdcfe;
    --sm-border-quote: #3e3e42;
    --sm-bg-quote: #252526;
    --sm-border-hline: #3e3e42;
    --sm-color-hardbreak: #569cd6;
    --sm-color-code: #4ec9b0;
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
    --sm-color-literal: #9fcfe0ff;
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
    --sm-color-text-secondary: white;
}

#sm-editor-raw { height: 100%; background: var(--sm-bg-editor); display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
#sm-editor-preview { 
    height: 100%;
    background: var(--sm-bg-editor); 
    color: var(--sm-color-text); 
    overflow-y: auto; 
    flex: 1;
}

.cm-sm-Text { color: var(--sm-color-text); }
.cm-sm-Comment { color: var(--sm-color-comment); font-style: italic; }
.cm-sm-Escape { color: var(--sm-color-escape); font-weight: bold; }
.cm-sm-Error { color: var(--sm-color-error); text-decoration: underline wavy var(--sm-deco-error); }
.cm-sm-Bold { font-weight: bold; color: var(--sm-color-bold); }
.cm-sm-Italic { font-style: italic; color: var(--sm-color-italic); }
.cm-sm-Strikethrough { color: var(--sm-color-strike); }
.cm-sm-Underline { color: var(--sm-color-underline); }
.cm-sm-Superscript { font-size: 0.85em; color: var(--sm-color-script); }
.cm-sm-Subscript { font-size: 0.85em; color: var(--sm-color-script); }
.cm-sm-Header { color: var(--sm-color-head); font-weight: bold; border-bottom: 1px solid var(--sm-border-header); }
.cm-sm-BlockQuote { color: var(--sm-color-quote); border-left: 0.25em solid var(--sm-border-quote); padding-left: 0.5em; font-style: italic; }
.cm-sm-HLine { display: block; border-top: 2px solid var(--sm-border-hline); margin: 4px 0; }
.cm-sm-HardBreak { color: var(--sm-color-hardbreak); font-weight: bold; }
.cm-sm-Code { color: var(--sm-color-code); font-family: 'Fira Code', 'Cascadia Code', monospace; border-radius: 3px; }
.cm-sm-TeX { color: var(--sm-color-tex); font-weight: bold; }
.cm-sm-Media { color: var(--sm-color-media); text-decoration: underline; }
.cm-sm-ExternalMedia { color: var(--sm-color-extmedia); border-bottom: 1px dashed var(--sm-border-extmedia); }
.cm-sm-Category { color: var(--sm-color-category); font-weight: bold; }
.cm-sm-Redirect { color: var(--sm-color-redirect); font-style: italic; }
.cm-sm-Include { color: var(--sm-color-include); font-weight: 500; }
.cm-sm-Mention { color: var(--sm-color-mention); font-weight: bold; }
.cm-sm-Variable { color: var(--sm-color-variable); font-family: monospace; }
.cm-sm-Age, .cm-sm-TimeNow { color: var(--sm-color-timenow); }
.cm-sm-FootnoteRef, .cm-sm-Footnote { color: var(--sm-color-footnote); font-size: 0.9em; }
.cm-sm-Null { color: var(--sm-color-null); text-decoration: line-through; }
.cm-sm-If, .cm-sm-Define { color: var(--sm-color-control); font-weight: bold; }
.cm-sm-Styled { border: 1px solid var(--sm-border-styled); border-radius: 4px; padding: 0 2px; }
.cm-sm-Literal { color: var(--sm-color-literal); font-family: monospace; font-weight: bold; padding: 0 2px; }
.cm-sm-Fold { color: var(--sm-color-fold); font-weight: bold; }
.cm-sm-Ruby { color: var(--sm-color-ruby); border-bottom: 1px dotted var(--sm-color-ruby); }
.cm-sm-Table { border: 1px solid var(--sm-border-table); }
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
    .sm_toolbar { background: var(--sm-bg-toolbar); border-bottom: 1px solid var(--sm-border-toolbar); padding: 6px 12px; display: flex; gap: 4px; align-items: center; border-top-left-radius: 6px; border-top-right-radius: 6px; box-shadow: 0 1px 2px var(--sm-shadow-toolbar); position: relative; flex-wrap: wrap; }
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
    .sm_dropdown.show .sm_param_popup { display: flex; }
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
    .hidden { display: none !important; }
    .sm-editor-logo {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    /* 하이라이팅 (프리뷰) */
    .highlight {
        background-color: rgba(90, 136, 206, 0.2);
        transition: background-color 0.1s;
    }
    .cursor-active{
        animation: cursor-active 1s ease-in-out infinite;
    }
    @keyframes cursor-active {
        0% { background-color: rgba(90, 136, 206, 0.2); }
        50% { background-color: rgba(90, 136, 206, 0.4); }
        100% { background-color: rgba(90, 136, 206, 0.2); }
    }
`;

const SM_RENDER_CSS = `
    /* SevenMark Preview CSS (태그 기반 스타일링) */
    strong { font-weight: bold; }
    em { font-style: italic; }
    u { text-decoration: underline; }
    del { text-decoration: line-through; }
    
    .sm-code {
        font-family: 'Courier New', Courier, monospace;
        position: relative;
        padding: 0.4rem;
        border-radius: 6px;
        background-color: rgba(128, 128, 128, 0.1);
        white-space: pre-wrap;
    }
    .sm-code code[data-lang]::before {
        content: attr(data-lang);
        position: absolute;
        top: -20px;
        right: 8px;
        font-size: 0.8rem;
        font-family: 'Courier New', Courier, monospace;
        color: var(--sm-color-text);
        text-transform: uppercase;
        font-weight: bold;
        pointer-events: none;
    }
    blockquote {
        border-left: 4px solid #ccc;
        padding-left: 15px;
        margin: 10px 0;
        color: #666;
        font-style: italic;
    }
    #sm-editor-preview hr {
        border: none;
        border-top: 1px solid #ccc;
        margin: 20px 0;
    }
    
    /* 헤드라인 (클래스 기반) */
    .sm-h1 { font-size: 1.8em; font-weight: bold; margin: 0.67em 0; }
    .sm-h2 { font-size: 1.5em; font-weight: bold; margin: 0.75em 0; }
    .sm-h3 { font-size: 1.25em; font-weight: bold; margin: 0.83em 0; }
    .sm-h4 { font-size: 1.1em; font-weight: bold; margin: 1.12em 0; }
    .sm-h5 { font-size: 1em; font-weight: bold; margin: 1.5em 0; }
    .sm-h6 { font-size: 0.9em; font-weight: bold; margin: 2.33em 0; }

    /* 테이블 */
    /* 테이블 래퍼 (스크롤 지원) */
    .sm-table-wrapper {
        width: 100%;
        overflow-x: auto;
        margin: 15px 0;
        border: 1px solid transparent; 
    }
    .sm-table {
        border-collapse: collapse;
        width: max-content !important; /* 내용물만큼 늘어나게 함 */
        min-width: 100%;
        margin: 0;
        table-layout: fixed; /* 렌더링 성능 최적화 */
    }
    .sm-table th, .sm-table td {
        border: 1px solid #ddd;
        padding: 10px;
        text-align: left;
    }
    .sm-table th {
        background-color: rgba(128, 128, 128, 0.1);
        font-weight: bold;
    }
    .sm-table tr:nth-child(even) { background-color: rgba(128, 128, 128, 0.03); }
    .sm-table tr:hover { background-color: rgba(128, 128, 128, 0.08); }

    /* 섹션 및 접기 (details/summary) 스타일링 */
    .sm-section, .sm-fold { margin: 10px 0; border: 1px solid transparent; transition: all 0.2s; }
    .sm-section summary, .sm-fold summary {
        list-style: none;
        cursor: pointer;
        outline: none;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
    }
    .sm-section summary::-webkit-details-marker, .sm-fold summary::-webkit-details-marker { display: none; }
    
    .sm-section summary::before, .sm-fold summary::before {
        content: '▶';
        font-size: 0.8em;
        transition: transform 0.2s ease;
        color: #999;
        display: inline-block;
        width: 1.2em;
        text-align: center;
        flex-shrink: 0;
    }
    .sm-section[open] > summary::before, .sm-fold[open] > summary::before { transform: rotate(90deg); }
    
    .sm-section summary h1, .sm-section summary h2, .sm-section summary h3, 
    .sm-section summary h4, .sm-section summary h5, .sm-section summary h6 {
        display: inline; margin: 0 !important; padding: 0;
    }
    .sm-section-content {
        padding-left: 20px; margin-left: 5px;
        border-left: 1px solid rgba(128, 128, 128, 0.1);
    }
    .sm-section:hover { background-color: rgba(128, 128, 128, 0.02); border-radius: 4px; }
`;

const cm_styles = `
    :root {
        --sm-editor-font-size: 14pt; /* 기본값 */
    }

    /* CodeMirror 에디터 배경 및 텍스트 색상 */
    .cm-editor {
        flex: 1;
        display: flex;
        min-height: 0;
        flex-direction: column;
        font-size: var(--sm-editor-font-size) !important;
        font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
        background-color: var(--sm-bg-editor) !important;
        color: var(--sm-color-text) !important;
    }
    .cm-content {
        color: var(--sm-color-text) !important;
    }
    .cm-line {
        color: var(--sm-color-text) !important;
    }
    .cm-cursor {
        border-left-color: var(--sm-color-text) !important;
    }
    .cm-selectionBackground,
    .cm-focused .cm-selectionBackground {
        background-color: #3392FF44 !important;
    }
    .cm-selectionMatch {
        background-color: transparent !important;
    }
    .cm-activeLine {
        background-color: transparent !important;
    }
    .cm-gutters {
        background-color: var(--sm-bg-editor) !important;
        border-right: 1px solid var(--sm-border-editor) !important;
    }
    .cm-lineNumbers .cm-gutterElement {
        color: #858585 !important;
    }
    body.dark .cm-lineNumbers .cm-gutterElement {
        color: #858585 !important;
    }
    
    /* 에디터의 개별 라인 높이를 고정하여 헤더 크기에 상관없이 정렬 유지 */
    .cm-line {
        line-height: 1.6 !important;
        display: flex !important;
        align-items: center; /* 텍스트가 큰 경우 중앙 정렬 */
    }

    .cm-gutters {
        font-size: var(--sm-editor-font-size) !important;
        font-family: inherit !important;
        border-right: 1px solid var(--sm-border-editor);
        background-color: var(--sm-bg-editor) !important;
    }
    
    .cm-gutter-line {
        line-height: 1.6 !important; /* cm-line과 정확히 일치시켜야 함 */
        display: flex !important;
        align-items: center;
        justify-content: flex-end;
    }

    .cm-gutterElement {
        opacity: 0.5;
    }

    /* 폭 조절 핸들 라인 */
    .sm-editor-sep-handle-line {
        width: 1px;
        background-color: var(--sm-border-editor);
        cursor: col-resize;
        position: relative;
        transition: background-color 0.2s;
        margin: 0 8px; /* 좌우 공간 확보 */
        background-clip: content-box;
    }

    /* 실제 시각적 핸들 (중앙의 그립 바) */
    .sm-editor-sep-handle-line::before {
        content: "⋮"; /* 세로 점 아이콘 느낌 */
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 14px;
        height: 32px;
        background-color: var(--sm-bg-toolbar);
        border: 1px solid var(--sm-border-editor);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        color: var(--sm-btn-text);
        transition: all 0.2s;
        z-index: 10;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .sm-editor-sep-handle-line:hover::before, .sm-editor-sep-handle-line.dragging::before {
        border-color: var(--sm-color-header);
        color: var(--sm-color-header);
        height: 48px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    
    /* 실제 잡을 수 있는 히트 영역 (투명) */
    .sm-editor-sep-handle-line::after {
        content: "";
        position: absolute;
        top: 0; bottom: 0;
        left: -12px; right: -12px; /* 좌우로 넉넉하게 잡기 판정 확장 */
        z-index: 5;
    }
    .hidden {
        display: none;
    }

    /* 테이블 생성 모달 전용 스타일 */
    #table-preview {
        margin-top: 15px;
        display: flex;
        flex-direction: column;
        gap: 1px; /* 선 굵기 느낌 */
        max-height: 250px;
        overflow: auto;
        padding: 1px;
        background: var(--sm-border-editor); /* 선 색상 */
        border: 1px solid var(--sm-border-editor);
        border-radius: 4px;
    }
    .table-row-preview {
        display: flex;
        gap: 1px;
    }
    .table-cell-preview {
        flex: 1;
        min-width: 60px;
        background: var(--sm-bg-editor);
        display: flex;
    }
    .table-cell-input {
        width: 100%;
        border: none !important;
        background: transparent !important;
        color: var(--sm-color-text);
        padding: 6px 4px;
        font-size: 0.8rem;
        outline: none;
        text-align: center;
        font-family: inherit;
    }
    .table-cell-input:focus {
        background: rgba(51, 146, 255, 0.1) !important;
    }
    /* 첫 번째 줄(헤더) 특별 강조 */
    .table-row-preview:first-child .table-cell-preview {
        background: var(--sm-bg-toolbar);
    }
    .table-row-preview:first-child .table-cell-input {
        font-weight: bold;
        color: var(--sm-color-header);
    }
    .sm_modal_content input[type=number] {
        width: 80px;
        padding: 6px;
        margin-bottom: 10px;
        border: 1px solid var(--sm-border-editor);
        border-radius: 4px;
        background: var(--sm-bg-editor);
        color: var(--sm-color-text);
        font-family: inherit;
    }
    .sm_modal_content .sm_modal_label {
        display: inline-block;
        font-size: 0.9rem;
    }

    /* 탭 스타일 */
    .sm_modal_tabs {
        display: flex;
        gap: 10px;
        border-bottom: 1px solid var(--sm-border-editor);
        margin-bottom: 15px;
    }
    .sm_modal_tab {
        padding: 8px 16px;
        cursor: pointer;
        font-size: 0.9rem;
        color: var(--sm-btn-text);
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
    }
    .sm_modal_tab:hover {
        color: var(--sm-color-text);
    }
    .sm_modal_tab.active {
        color: var(--sm-color-header);
        border-bottom-color: var(--sm-color-header);
        font-weight: bold;
    }
    .sm_modal_tab_content {
        display: none;
    }
    .sm_modal_tab_content.active {
        display: block;
    }

    /* 설정 모달 전용 스타일 */
    .sm_settings_row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        gap: 15px;
    }
    .sm_settings_label {
        font-weight: 500;
        font-size: 0.95rem;
        color: var(--sm-color-text);
        flex: 1;
    }
    .sm_settings_value {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 140px;
        justify-content: flex-end;
    }
    .sm_settings_select {
        padding: 5px 10px;
        border-radius: 4px;
        background: var(--sm-bg-editor);
        color: var(--sm-color-text);
        border: 1px solid var(--sm-border-editor);
        outline: none;
        cursor: pointer;
        font-family: inherit;
    }
    .sm_settings_range {
        -webkit-appearance: none;
        width: 100px;
        height: 4px;
        background: var(--sm-border-editor);
        border-radius: 2px;
        outline: none;
    }
    .sm_settings_range::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        background: var(--sm-color-header);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .sm_settings_info_box {
        background: var(--sm-bg-toolbar);
        border-radius: 8px;
        padding: 15px;
        margin-top: 14%;
        border: 1px solid var(--sm-border-editor);
    }
    .sm_settings_info_header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
    }
    .sm_settings_info_logo {
        width: 42px;
        height: 42px;
        border-radius: 6px;
        object-fit: cover;
    }
    .sm_settings_info_title {
        font-size: 1.2rem;
        font-weight: bold;
        color: var(--sm-color-text);
    }
    .sm_settings_info_content {
        font-size: 0.85rem;
        line-height: 1.5;
        color: var(--sm-color-text);
        opacity: 0.8;
        font-family: 'JetBrains Mono', monospace;
    }
    .sm_modal_create_btn {
        width: 100%;
        margin-top: 15px;
        padding: 10px;
        background: var(--sm-color-header);
        color: var(--sm-color-text-secondary);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        transition: background 0.2s;
    }
    .sm_modal_create_btn:hover {
        background: var(--sm-color-header);
    }
    .sm_modal_create_btn:disabled {
        background: var(--sm-btn-disabled);
        color: var(--sm-color-text);
        cursor: not-allowed;
    }
    .no-drag, .no-drag * {
        -webkit-user-select: none !important;
        user-select: none !important;
    }
`;
// 테마 설정 구성 (새로운 요소 추가 시 여기에만 한 줄 추가하면 됨)
const THEME_CONFIG = [
    {
        var: "--sm-color-header",
        key: "sm-editor-custom-main",
        default: "#3392FF",
        label: "main",
        inputId: "#sm-editor-main-color"
    },
    {
        var: "--sm-color-text",
        key: "sm-editor-custom-text",
        default: "#333333",
        label: "text",
        inputId: "#sm-editor-text-color"
    },
    {
        var: "--sm-bg-editor",
        key: "sm-editor-custom-bg",
        default: "#ffffff",
        label: "bg",
        inputId: "#sm-editor-bg-color"
    },
    {var: "--sm-bg-toolbar", key: "sm-editor-custom-bg", default: "#ffffff", label: "bg"}, // 배경색 연동
    {
        var: "--sm-btn-text",
        key: "sm-editor-custom-btn",
        default: "#333333",
        label: "btn",
        inputId: "#sm-editor-btn-color"
    },
    {
        var: "--sm-color-text-secondary",
        key: "sm-editor-custom-text-secondary",
        default: "#ffffff",
        label: "text-secondary",
        inputId: "#sm-editor-text-secondary-color"
    }
];

// 테마 전환 헬퍼 함수
function setEditorTheme(theme) {
    document.body.classList.remove("dark", "light", "custom");

    if (theme === "custom") {
        document.body.classList.add("custom");
        // 저장된 커스텀 색상들을 자동으로 순회하며 적용
        THEME_CONFIG.forEach(item => {
            const savedVal = localStorage.getItem(item.key);
            if (savedVal) document.body.style.setProperty(item.var, savedVal);
            else if (item.default) document.body.style.setProperty(item.var, item.default);
        });
    } else {
        document.body.classList.add(theme === "dark" ? "dark" : "light");
        // 커스텀 인라인 스타일 일괄 제거
        THEME_CONFIG.forEach(item => document.body.style.removeProperty(item.var));
    }

    localStorage.setItem("sm-editor-theme", theme);
}

// 저장된 테마 불러오기
function loadEditorTheme() {
    const savedTheme = localStorage.getItem("sm-editor-theme") || "light";
    // setEditorTheme 내부에서 커스텀 컬러 처리까지 하도록 통합함
    setEditorTheme(savedTheme);
    return savedTheme;
}

// 전역에 등록
if (typeof window !== 'undefined') {
    window.setEditorTheme = setEditorTheme;
    window.loadEditorTheme = loadEditorTheme;
}
var targetScroll = 0;
var currentScroll = 0;
var isRunning = false;
var scrollSource = null; // 'editor' | 'preview'
var lastSetTop = {editor: -1, preview: -1};
const lerpFactor = 0.2;

const LOADING_CSS = `
    .sm-loading-overlay {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: var(--sm-bg-editor, #ffffff);
        display: flex; flex-direction: column; justify-content: center; align-items: center;
        z-index: 100; transition: opacity 0.2s ease-out;
    }
    .sm-spinner {
        width: 30px; height: 30px;
        border: 3px solid var(--sm-border-editor, #e1e4e8);
        border-top: 3px solid var(--sm-color-header, #3392FF);
        border-radius: 50%;
        animation: sm-spin 0.8s linear infinite;
    }
    @keyframes sm-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
`;

export async function init_codemirror(parent, initialDoc = "") {
    // 로딩 스타일 주입
    const loadingStyle = document.createElement("style");
    loadingStyle.textContent = LOADING_CSS;
    document.head.appendChild(loadingStyle);

    // 로더 생성 및 표시 (부모 요소에 상대적으로 배치)
    if (parent) parent.style.position = "relative";
    const loader = document.createElement("div");
    loader.className = "sm-loading-overlay";
    loader.innerHTML = '<div class="sm-spinner"></div>';
    const loadingText = document.createElement("span");
    loadingText.style.color = "var(--sm-color-text)";
    loadingText.textContent = "Loading...";
    loader.appendChild(loadingText);
    parent.appendChild(loader);

    const CM = await ensure_codemirror();
    const {EditorView, EditorState, basicSetup, keymap, undoDepth, redoDepth, indentWithTab} = CM;

    const style = document.createElement("style");
    style.textContent = cm_css;
    document.head.appendChild(style);

    const toolbar_style = document.createElement("style");
    toolbar_style.textContent = TOOLBAR_CSS;
    document.head.appendChild(toolbar_style);

    const cm_style = document.createElement("style");
    cm_style.textContent = cm_styles;
    document.head.appendChild(cm_style);

    const googleFont = document.createElement("link");
    googleFont.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@400;500;600;700&display=swap";
    googleFont.rel = "stylesheet";
    document.head.appendChild(googleFont);

    // SevenMark 렌더링 스타일 주입 여부 결정
    const sm_use_render_css = window.sm_use_render_css !== undefined ? window.sm_use_render_css : true;
    if (sm_use_render_css) {
        const render_style = document.createElement("style");
        render_style.id = "sm-render-style";
        render_style.textContent = SM_RENDER_CSS;
        document.head.appendChild(render_style);
    }

    //폭조절 사용여부
    const cm_use_sep_handle_line = window.cm_use_sep_handle_line !== undefined ? window.cm_use_sep_handle_line : false;
    const sep_handle = document.getElementById("sm-editor-sep-handle-line");
    if (sep_handle) {
        if (cm_use_sep_handle_line === false) {
            // 보이지는 않지만 '빈 공간'으로 남겨둠
            sep_handle.style.visibility = "hidden";
            sep_handle.style.pointerEvents = "none";
            sep_handle.style.flex = "0 0 1rem"; // 빈 간격 크기
            sep_handle.style.margin = "0";
        } else {
            sep_handle.style.visibility = "visible";
            sep_handle.style.pointerEvents = "auto";
            sep_handle.style.flex = "0 0 3px";
            sep_handle.style.margin = "0 8px";
        }
    }
    //폰트사이즈로드
    const fontSize = localStorage.getItem("sm-editor-font-size") || "12";
    document.documentElement.style.setProperty("--sm-editor-font-size", `${fontSize}pt`);
    const fixedHeightEditor = EditorView.theme({
        "&": {height: "100%"},
        "& .cm-scroller": {overflow: "auto", flex: "1"}
    });

    const koPhrases = {
        "Find": "찿을내용", "Replace": "바꿀내용", "replace": "바꾸기", "replace all": "모두 바꾸기",
        "all": "모두 선택", "match case": "대소문자 구분", "by word": "단어 단위", "regexp": "정규표현식",
        "next": "다음", "previous": "이전", "close": "닫기", "replace with": "바꿀 내용"
    };

    const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged || update.selectionSet) {
            const raw = update.state.doc.toString();
            const highlighter = (typeof cm_highlighter !== 'undefined' ? cm_highlighter : window.cm_highlighter);
            const renderer = (typeof sm_renderer !== 'undefined' ? sm_renderer : window.sm_renderer);

            if (typeof highlighter !== 'function' || typeof renderer !== 'function') {
                console.warn("SevenMark WASM functions not yet available.");
                return;
            }

            const ast = JSON.parse(highlighter(raw));
            const html = renderer(raw);
            const {from, to} = update.state.selection.main;

            const activeType = findActiveType(ast, from, to);

            // 툴바 버튼 활성화 상태 업데이트 통합
            const toolbar = document.getElementById("sm-toolbar");
            if (toolbar) {
                toolbar.querySelectorAll("[data-ast-type]").forEach(btn => btn.classList.remove("active"));
                activeType.forEach(type => {
                    const btn = toolbar.querySelector(`[data-ast-type="${type}"]`);
                    if (btn) btn.classList.add("active");
                });
            }

            const preview = document.getElementById("sm-editor-preview");
            if (!preview) return;

            if (update.docChanged) {
                preview.innerHTML = html;
                wrapTables(preview);
            }

            // 프리뷰 하이라이트 동기화
            const previewBlocks = preview.querySelectorAll("[data-start]");
            previewBlocks.forEach(block => {
                const start = parseInt(block.dataset.start);
                const end = parseInt(block.dataset.end);

                let shouldHighlight = false;
                if (from !== to) {
                    shouldHighlight = Math.max(start, from) < Math.min(end, to);
                }

                if (shouldHighlight) {
                    block.classList.add("highlight");
                } else {
                    block.classList.remove("highlight");
                }

                //커서 위치
                let isCursorInside = (from === to && from >= start && from < end);
                if (isCursorInside) {
                    block.classList.add("cursor-active");
                } else {
                    block.classList.remove("cursor-active");
                }
            });

            // 스크롤 동기화 (내용 변경 시)
            if (update.docChanged && scrollSource !== 'preview') {
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
                smHighlightField,
                keymap.of([indentWithTab])
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

    // 프리뷰 클릭 시 에디터 커서 이동 (역방향 동기화)
    preview.addEventListener("click", (e) => {
        const target = e.target.closest("[data-start]");
        if (target) {
            const pos = parseInt(target.getAttribute("data-start"));
            if (!isNaN(pos)) {
                view.dispatch({
                    selection: {anchor: pos, head: pos},
                    scrollIntoView: true
                });
                view.focus();
            }
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
    setup_sep_handle_line();

    // 초기화 완료 후 로더 제거 (부드러운 전환)
    loader.style.opacity = "0";
    setTimeout(() => {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, 200);

    return view;
}

function setup_sep_handle_line() {
    const sep_handle_line = document.getElementById("sm-editor-sep-handle-line");
    if (!sep_handle_line) return;

    sep_handle_line.addEventListener("mousedown", (e) => {
        e.preventDefault();
        sep_handle_line.classList.add("dragging");

        const onMouseUp = () => {
            sep_handle_line.classList.remove("dragging");
            document.removeEventListener("mousemove", handleResize);
            document.removeEventListener("mouseup", onMouseUp);
            if (window.cm_instances) {
                window.cm_instances.forEach(view => view.requestMeasure());
            }
        };

        document.addEventListener("mousemove", handleResize);
        document.addEventListener("mouseup", onMouseUp);
    });
}

let resizeRafId = null;
let lastClientX = 0;

function handleResize(e) {
    lastClientX = e.clientX;
    if (resizeRafId) return;

    resizeRafId = requestAnimationFrame(() => {
        const editor = document.getElementById("sm-editor-raw");
        const preview = document.getElementById("sm-editor-preview");
        if (!editor || !preview) {
            resizeRafId = null;
            return;
        }

        const container = editor.parentElement;
        const containerRect = container.getBoundingClientRect();

        let newWidth = lastClientX - containerRect.left;

        const minWidth = 368;
        const maxWidth = containerRect.width - 368;

        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > maxWidth) newWidth = maxWidth;

        editor.style.flex = `0 0 ${newWidth}px`;
        resizeRafId = null;
    });
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
        view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: text}});
    }
}

// 전역에서 접근할 수 있도록 window 객체에 등록
if (typeof window !== 'undefined') {
    window.get_editor_text = get_editor_text;
    window.set_editor_text = set_editor_text;
}

function setup_toolbar(CM) {
    const {openSearchPanel, closeSearchPanel, undo, redo} = CM;
    const parent = document.getElementById("sm-editor-raw");
    if (!parent || document.getElementById("sm-toolbar")) return;
    parent.style.position = "relative"; // 모달을 위한 상대 좌표계 설정

    const toolbar = document.createElement("div");
    toolbar.id = "sm-toolbar";
    toolbar.className = "sm_toolbar";
    parent.prepend(toolbar);

    const Buttons = [
        {
            id: "sm-toolbar-color",
            astType: "Styled",
            className: "sm_toolbar_btn",
            text: "palette",
            title: "스타일",
            type: "paramList",
            popupTitle: "스타일 설정",
            params: [
                {name: "color", label: "글자 색상", type: "color", default: "#000000"},
                {name: "size", label: "글자 크기", type: "number", default: 16, min: 8, max: 72, suffix: "px"},
                {name: "bg_color", label: "배경 색상", type: "color", default: "rgba(0, 0, 0, 0)"}
            ],
            getInitialValues: (view) => {
                const {state} = view;
                const {from, to} = state.selection.main;
                const raw = state.doc.toString();

                // AST를 사용하여 현재 위치를 감싸는 가장 안쪽의 Styled 노드 찾기
                const ast = JSON.parse(window.cm_highlighter(raw));
                const targetNode = findNodeByType(ast, from, to, "Styled");

                if (!targetNode) return null;

                // 헤더 라인(첫 줄)만 추출하여 스타일 파싱
                const tagContent = raw.slice(targetNode.span.start, targetNode.span.end);
                const headerLine = tagContent.split('\n')[0];
                
                const result = {};
                const styleMatch = headerLine.match(/style="([^"]*)"/);
                if (styleMatch) {
                    const styleStr = styleMatch[1];

                    const colorMatch = styleStr.match(/color:\s*([^;"]+)/);
                    if (colorMatch) result.color = colorMatch[1].trim();

                    const sizeMatch = styleStr.match(/font-size:\s*(\d+)px/);
                    if (sizeMatch) result.size = parseInt(sizeMatch[1]);

                    const bgMatch = styleStr.match(/background-color:\s*([^;"]+)/);
                    if (bgMatch) result.bg_color = bgMatch[1].trim();
                }

                return Object.keys(result).length > 0 ? result : null;
            },
                        onApply: (values) => {
                            const {color, size, bg_color} = values;
                            const view = window.cm_instances?.[window.cm_instances.length - 1];
                            if (view) {
                                const {state} = view;
                                const {from, to} = state.selection.main;
                                const text = state.doc.toString();
                                const selectedText = state.sliceDoc(from, to);
            
                                // AST를 사용하여 현재 위치를 감싸는 가장 안쪽의 Styled 노드 찾기
                                const ast = JSON.parse(window.cm_highlighter(text));
                                const targetNode = findNodeByType(ast, from, to, "Styled");
            
                                const buildAttrStr = (baseAttrs = {}) => {
                                    const merged = {...baseAttrs};
                                    if (color) merged.color = color;
                                    if (size) merged.size = size;
                                    if (bg_color) merged.bg_color = bg_color;
            
                                    let str = "";
                                    if (merged.color) str += `color:${merged.color}; `;
                                    if (merged.size) str += `font-size:${merged.size}px; `;
                                    if (merged.bg_color) str += `background-color:${merged.bg_color}; `;
                                    return str.trim();
                                };
            
                                if (targetNode) {
                                    // === 기존 태그 수정 ===
                                    const start = targetNode.span.start;
                                    const end = targetNode.span.end;
                                    const fullTag = text.slice(start, end);
                                    const headerEndRelative = fullTag.indexOf('\n');
                                    const headerEnd = headerEndRelative !== -1 ? start + headerEndRelative : end;
            
                                    const headerContent = text.slice(start, headerEnd);
                                    const styleMatch = headerContent.match(/style="([^"]*)"/);
            
                                    const currentAttrs = {};
                                    if (styleMatch) {
                                        const styleStr = styleMatch[1];
                                        const cMatch = styleStr.match(/color:\s*([^;"]+)/);
                                        if (cMatch) currentAttrs.color = cMatch[1].trim();
                                        const sMatch = styleStr.match(/font-size:\s*(\d+)px/);
                                        if (sMatch) currentAttrs.size = parseInt(sMatch[1]);
                                        const bMatch = styleStr.match(/background-color:\s*([^;"]+)/);
                                        if (bMatch) currentAttrs.bg_color = bMatch[1].trim();
                                    }
            
                                    const newAttrStr = buildAttrStr(currentAttrs);
                                    const newHeader = `{{{#style="${newAttrStr}"`;
            
                                    // 원래 헤더의 {{{#style="..." 부분까지만 교체 범위로 설정
                                    const headerMatch = headerContent.match(/\{\{\{#style="[^"]*"/);
                                    let replaceTo = start + (headerMatch ? headerMatch[0].length : 9); // 9는 {{{#style 길이
            
                                    view.dispatch({
                                        changes: {
                                            from: start,
                                            to: replaceTo,
                                            insert: newHeader
                                        }
                                    });
            
                                } else {
                                    // === 신규 태그 생성 ===
                                    const newAttrStr = buildAttrStr({});
                                    const openTag = `{{{#style="${newAttrStr}"\n`;
                                    const closeTag = `\n}}}`;
                                    view.dispatch({
                                        changes: {from, to, insert: `${openTag}${selectedText}${closeTag}`},
                                        selection: {anchor: from + openTag.length + (from === to ? 0 : selectedText.length)}
                                    });
                                }
                                view.focus();
                            }
                        }        },
        {
            id: "sm-toolbar-bold",
            astType: "Bold",
            className: "sm_toolbar_btn",
            text: "format_bold",
            title: "굵게",
            onClick: () => toggleSyntax("**", "**", "Bold")
        },
        {
            id: "sm-toolbar-italic",
            astType: "Italic",
            className: "sm_toolbar_btn",
            text: "format_italic",
            title: "이탤릭체",
            onClick: () => toggleSyntax("*", "*", "Italic")
        },
        {
            id: "sm-toolbar-underline",
            astType: "Underline",
            className: "sm_toolbar_btn",
            text: "format_underlined",
            title: "밑줄",
            onClick: () => toggleSyntax("__", "__", "Underline")
        },
        {
            id: "sm-toolbar-strike",
            astType: "Strikethrough",
            className: "sm_toolbar_btn",
            text: "strikethrough_s",
            title: "취소선",
            onClick: () => toggleSyntax("~~", "~~", "Strikethrough")
        },
        {id: "sm-separator", className: "sm_toolbar_btn sm_toolbar_separator"},
        {
            id: "sm-toolbar-superscript",
            astType: "Superscript",
            className: "sm_toolbar_btn",
            text: "superscript",
            title: "상위첨자",
            onClick: () => toggleSyntax("^^", "^^", "Superscript")
        },
        {
            id: "sm-toolbar-subscript",
            astType: "Subscript",
            className: "sm_toolbar_btn",
            text: "subscript",
            title: "하위첨자",
            onClick: () => toggleSyntax(",,", ",,", "Subscript")
        },
        {
            id: "sm-toolbar-latex",
            astType: "TeX",
            className: "sm_toolbar_btn",
            text: "function",
            title: "수식",
            type: "dropdown",
            options: [
                {text: "인라인 수식", icon: "functions", onClick: () => toggleSyntax("{{{#tex", "}}}", "TeX")},
                {text: "블록 수식", icon: "functions", onClick: () => toggleSyntax("{{{#tex #block\n", "\n}}}", "TeX")},
            ]
        },
        {id: "sm-separator", className: "sm_toolbar_btn sm_toolbar_separator"},
        {
            id: "sm-toolbar-headings",
            astType: "Header",
            className: "sm_toolbar_btn",
            text: "format_size",
            title: "머릿말",
            type: "dropdown",
            options: [
                {
                    text: "제목 1 (가장 크게)",
                    icon: "format_size",
                    size: "1.5rem",
                    onClick: () => toggleSyntax("# ", "", "Header")
                },
                {
                    text: "제목 2 (크게)",
                    icon: "format_size",
                    size: "1.4rem",
                    onClick: () => toggleSyntax("## ", "", "Header")
                },
                {
                    text: "제목 3 (중간)",
                    icon: "format_size",
                    size: "1.3rem",
                    onClick: () => toggleSyntax("### ", "", "Header")
                },
                {
                    text: "제목 4 (작게)",
                    icon: "format_size",
                    size: "1.2rem",
                    onClick: () => toggleSyntax("#### ", "", "Header")
                },
                {
                    text: "제목 5 (더 작게)",
                    icon: "format_size",
                    size: "1.1rem",
                    onClick: () => toggleSyntax("##### ", "", "Header")
                },
                {
                    text: "제목 6 (가장 작게)",
                    icon: "format_size",
                    size: "1.0rem",
                    onClick: () => toggleSyntax("###### ", "", "Header")
                },
            ]
        },
        {
            id: "sm-toolbar-hline",
            astType: "HLine",
            className: "sm_toolbar_btn",
            text: "horizontal_rule",
            title: "가로선",
            type: "dropdown",
            options: [
                {text: "가로선 3개", icon: "horizontal_rule", onClick: () => wrapSelection("---", "")},
                {text: "가로선 4개", icon: "horizontal_rule", onClick: () => wrapSelection("----", "")},
                {text: "가로선 5개", icon: "horizontal_rule", onClick: () => wrapSelection("-----", "")},
                {text: "가로선 6개", icon: "horizontal_rule", onClick: () => wrapSelection("------", "")},
                {text: "가로선 7개", icon: "horizontal_rule", onClick: () => wrapSelection("-------", "")},
                {text: "가로선 8개", icon: "horizontal_rule", onClick: () => wrapSelection("--------", "")},
                {text: "가로선 9개", icon: "horizontal_rule", onClick: () => wrapSelection("---------", "")},
            ]
        },
        {
            id: "sm-toolbar-quotes",
            astType: "BlockQuote",
            className: "sm_toolbar_btn",
            text: "format_quote",
            title: "인용",
            onClick: () => toggleSyntax("{{{#quote\n", "\n}}}", "BlockQuote")
        },
        {
            id: "sm-toolbar-code",
            astType: "Code",
            className: "sm_toolbar_btn",
            text: "code",
            title: "코드",
            onClick: () => toggleSyntax("{{{#code #lang=\"javascript\"\n", "\n}}}", "Code")
        },
        {
            id: "sm-toolbar-literal",
            astType: "Literal",
            className: "sm_toolbar_btn",
            text: "data_object",
            title: "리터럴 (세븐마크 문법 처리안함)",
            onClick: () => toggleSyntax("{{{\n", "\n}}}", "Literal")
        },
        {
            id: "sm-toolbar-folder",
            astType: "Fold",
            className: "sm_toolbar_btn",
            text: "folder",
            title: "폴드(접을수 있는 영역)",
            onClick: () => toggleSyntax("{{{#fold\n[[여기에 요약 텍스트 입력]]\n[[", "]]\n}}}", "Fold", "여기에 내용을 작성하세요.")
        },
        {
            id: "sm-toolbar-list",
            astType: "List",
            className: " sm_toolbar_btn",
            text: "format_list_numbered",
            title: "리스트",
            type: "dropdown",
            options: [
                {
                    text: "번호 리스트",
                    icon: "format_list_numbered",
                    onClick: () => toggleSyntax("{{{#list #1\n[[항목 1]]\n[[항목 2]]\n[[항목 3]]\n", "}}}", "List")
                },
                {
                    text: "소문자 abc",
                    icon: "format_list_bulleted",
                    onClick: () => toggleSyntax("{{{#list #a\n[[항목 1]]\n[[항목 2]]\n[[항목 3]]\n", "}}}", "List")
                },
                {
                    text: "대문자 ABC",
                    icon: "format_list_bulleted",
                    onClick: () => toggleSyntax("{{{#list #A\n[[항목 1]]\n[[항목 2]]\n[[항목 3]]\n", "}}}", "List")
                },
                {
                    text: "로마숫자 (소문자)",
                    icon: "format_list_bulleted",
                    onClick: () => toggleSyntax("{{{#list #i\n[[항목 1]]\n[[항목 2]]\n[[항목 3]]\n", "}}}", "List")
                },
                {
                    text: "로마숫자 (대문자)",
                    icon: "format_list_bulleted",
                    onClick: () => toggleSyntax("{{{#list #I\n[[항목 1]]\n[[항목 2]]\n[[항목 3]]\n", "}}}", "List")
                },
            ]
        },
        {
            id: "sm-separator",
            className: "sm_toolbar_separator"
        },
        {
            id: "sm-toolbar-table",
            astType: "Table",
            className: "sm_toolbar_btn",
            text: "table_chart",
            title: "테이블",
            type: "dropdown",
            options: [
                {text: "테이블 생성", icon: "add", onClick: () => makingTableModal()},
                {text: "테이블 편집", icon: "table_edit", onClick: () => openTableEditorModal()}
            ]
        },
        {
            id: "sm-toolbar-ruby",
            astType: "Ruby",
            className: "sm_toolbar_btn",
            html: "<ruby>猫<rt>ねこ</rt></ruby>",
            title: "루비 문자",
            onClick: () => {
                const cminst = window.cm_instances[window.cm_instances.length - 1];
                const {from, to} = cminst.state.selection.main;
                const selection = cminst.state.sliceDoc(from, to);
                toggleSyntax(`{{{#ruby #ruby="${selection.length === 0 ? "ねこ" : "원하는 내용을 넣으십시오"}"`, " }}}", "Ruby", "猫")
            }
        },
        {
            id: "sm-toolbar-footnote",
            astType: "Footnote",
            className: "sm_toolbar_btn",
            text: "note",
            title: "각주",
            onClick: () => toggleSyntax("{{{#fn ", " }}}", "Footnote")
        }
    ];
    Buttons.forEach((button) => {
        if (button.id === "sm-separator") {
            const sep = document.createElement("div");
            sep.className = "sm_toolbar_separator";
            toolbar.appendChild(sep);
            return;
        }
        switch (button.type) {
            case "dropdown":
                const dropdown = create_dropdown(button);
                toolbar.appendChild(dropdown);
                return;
            case "paramList":
                const paramList = create_paramList(button);
                toolbar.appendChild(paramList);
                return;
        }

        const btn = document.createElement("button");
        btn.id = button.id;
        btn.className = button.className;
        if (button.astType) btn.dataset.astType = button.astType;
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
        if (config.astType) btn.dataset.astType = config.astType;
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

    function create_paramList(config) {
        const container = document.createElement("div");
        container.className = "sm_dropdown";

        const btn = document.createElement("button");
        btn.id = config.id;
        btn.className = config.className;
        if (config.astType) btn.dataset.astType = config.astType;
        btn.innerHTML = `<span class="material-symbols-outlined">${config.text}</span>`;
        btn.title = config.title;

        // Popup Content
        const content = document.createElement("div");
        content.className = "sm_dropdown_content sm_param_popup";
        Object.assign(content.style, {
            padding: "15px",
            minWidth: "220px",
            backgroundColor: "var(--sm-bg-editor, #fff)",
            border: "1px solid var(--sm-color-header, #ccc)",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            flexDirection: "column",
            gap: "12px"
        });

        // Optional Title
        if (config.popupTitle) {
            const title = document.createElement("div");
            title.textContent = config.popupTitle;
            Object.assign(title.style, {
                fontWeight: "bold",
                fontSize: "0.95em",
                color: "var(--sm-color-text, #333)",
                borderBottom: "1px solid #eee",
                paddingBottom: "8px",
                marginBottom: "4px"
            });
            content.appendChild(title);
        }

        const inputs = {};

        // Generate Params
        if (config.params) {
            config.params.forEach(param => {
                const row = document.createElement("div");
                Object.assign(row.style, {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                });

                const label = document.createElement("label");
                label.textContent = param.label;
                label.style.fontSize = "0.9em";
                label.style.color = "var(--sm-color-text, #333)";
                row.appendChild(label);

                const inputWrapper = document.createElement("div");
                inputWrapper.style.display = "flex";
                inputWrapper.style.alignItems = "center";
                inputWrapper.style.gap = "5px";

                let input;
                if (param.type === 'color') {
                    // 실제 값을 담을 input (외부에서는 이 값을 참조함)
                    input = document.createElement("input");
                    input.type = "hidden";
                    input.value = param.default || "#000000";

                    // 초기값 파싱 (rgba 또는 hex)
                    let initialHex = "#000000";
                    let initialAlpha = 1;
                    const defVal = input.value;

                    if (defVal.startsWith("rgba")) {
                        const parts = defVal.match(/[\d.]+/g);
                        if (parts && parts.length >= 3) {
                            const r = parseInt(parts[0]).toString(16).padStart(2, '0');
                            const g = parseInt(parts[1]).toString(16).padStart(2, '0');
                            const b = parseInt(parts[2]).toString(16).padStart(2, '0');
                            initialHex = `#${r}${g}${b}`;
                            if (parts.length >= 4) initialAlpha = parseFloat(parts[3]);
                        }
                    } else if (defVal.startsWith("#")) {
                        initialHex = defVal;
                        if (initialHex.length === 4) { // #RGB -> #RRGGBB
                            initialHex = "#" + initialHex[1] + initialHex[1] + initialHex[2] + initialHex[2] + initialHex[3] + initialHex[3];
                        }
                    }

                    // UI: 색상 선택기
                    const colorInput = document.createElement("input");
                    colorInput.type = "color";
                    colorInput.value = initialHex;
                    Object.assign(colorInput.style, {
                        border: "none",
                        padding: "0",
                        background: "none",
                        cursor: "pointer",
                        width: "24px",
                        height: "24px"
                    });

                    // UI: 투명도 슬라이더
                    const alphaInput = document.createElement("input");
                    alphaInput.type = "range";
                    alphaInput.min = "0";
                    alphaInput.max = "1";
                    alphaInput.step = "0.01";
                    alphaInput.value = initialAlpha;
                    Object.assign(alphaInput.style, {
                        width: "60px",
                        cursor: "pointer"
                    });

                    // UI: 값 표시
                    const valDisplay = document.createElement("span");
                    valDisplay.textContent = initialAlpha === 1 ? initialHex : `rgba(..., ${initialAlpha})`;
                    Object.assign(valDisplay.style, {
                        fontSize: "0.75em",
                        color: "#666",
                        width: "65px",
                        textAlign: "right",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                    });

                    // 값 업데이트 함수
                    const updateValue = () => {
                        const hex = colorInput.value;
                        const r = parseInt(hex.slice(1, 3), 16);
                        const g = parseInt(hex.slice(3, 5), 16);
                        const b = parseInt(hex.slice(5, 7), 16);
                        const a = alphaInput.value;

                        // alpha가 1이면 hex로, 아니면 rgba로 저장 (선택 사항이나 깔끔함을 위해)
                        // 여기서는 항상 통일성을 위해 rgba 권장하거나, 
                        // 기존 로직과 호환성을 위해 1일땐 hex를 쓸 수도 있음.
                        // 일단 요청하신 rgba 반환을 위해 rgba 포맷 사용.
                        // 다만, hex만 지원하던 기존 로직과 충돌 방지를 위해 alpha가 1이면 hex로 할 수도 있음.
                        // 여기서는 무조건 rgba로 변환하여 반환
                        const rgbaVal = `rgba(${r}, ${g}, ${b}, ${a})`;
                        input.value = rgbaVal;

                        valDisplay.textContent = (a == 1) ? hex : `${a}`;
                    };
                    // 초기 한번 실행하여 input.value 포맷 통일 (선택)
                    // updateValue(); 

                    colorInput.addEventListener("input", updateValue);
                    alphaInput.addEventListener("input", updateValue);

                    inputWrapper.appendChild(colorInput);
                    inputWrapper.appendChild(alphaInput);
                    inputWrapper.appendChild(valDisplay);

                } else if (param.type === 'number') {
                    input = document.createElement("input");
                    input.type = "number";
                    input.value = param.default || 0;
                    if (param.min !== undefined) input.min = param.min;
                    if (param.max !== undefined) input.max = param.max;
                    Object.assign(input.style, {
                        width: "50px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        padding: "4px",
                        fontSize: "0.9em"
                    });
                    inputWrapper.appendChild(input);

                    if (param.suffix) {
                        const suffix = document.createElement("span");
                        suffix.textContent = param.suffix;
                        suffix.style.fontSize = "0.9em";
                        suffix.style.color = "#666";
                        inputWrapper.appendChild(suffix);
                    }
                } else {
                    input = document.createElement("input");
                    input.type = "text";
                    input.value = param.default || "";
                    Object.assign(input.style, {
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        padding: "4px",
                        width: "120px"
                    });
                    inputWrapper.appendChild(input);
                }

                inputs[param.name] = input;
                row.appendChild(inputWrapper);
                content.appendChild(row);
            });
        }

        // Apply Button
        const applyBtn = document.createElement("button");
        applyBtn.textContent = "적용하기";
        Object.assign(applyBtn.style, {
            marginTop: "5px",
            width: "100%",
            border: "none",
            background: "var(--sm-color-header, #3392FF)",
            color: "var(--sm-color-text, #fff)",
            padding: "8px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.9em",
            fontWeight: "500",
            transition: "opacity 0.2s"
        });
        applyBtn.onmouseover = () => applyBtn.style.opacity = "0.9";
        applyBtn.onmouseout = () => applyBtn.style.opacity = "1";

        applyBtn.addEventListener("click", () => {
            const values = {};
            for (const key in inputs) {
                values[key] = inputs[key].value;
            }
            if (config.onApply) config.onApply(values);
            container.classList.remove("show");
        });

        content.appendChild(applyBtn);

        // Interaction
        content.addEventListener("click", (e) => e.stopPropagation());

        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = container.classList.contains("show");

            document.querySelectorAll(".sm_dropdown").forEach(d => {
                d.classList.remove("show");
            });

            if (!isOpen) {
                container.classList.add("show");
            }

            const view = window.cm_instances?.[window.cm_instances.length - 1];

            let dynDefaults = {};
            if (config.getInitialValues && view) {
                dynDefaults = config.getInitialValues(view) || {};
            }

            // 동적으로 계산된 기본값을 입력 필드에 반영
            if (config.params) {
                config.params.forEach(param => {
                    const input = inputs[param.name];
                    if (input) {
                        // 동적 기본값이 있으면 사용, 없으면 원래 기본값 사용
                        const newVal = dynDefaults.hasOwnProperty(param.name) ? dynDefaults[param.name] : (param.default || "");
                        input.value = newVal;

                        // 컬러 타입인 경우 옆의 텍스트 라벨도 갱신
                        if (param.type === 'color' && input.nextElementSibling) {
                            input.nextElementSibling.textContent = newVal;
                        }
                    }
                });
            }
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
                if (view) {
                    undo(view);
                    view.focus();
                }
            }
        },
        {
            id: "sm-editor-redo", className: "sm_toolbar_btn", text: "redo", title: "다시하기", onClick: () => {
                const view = window.cm_instances[window.cm_instances.length - 1];
                if (view) {
                    redo(view);
                    view.focus();
                }
            }
        },
        {
            id: "sm-toolbar-search", className: "sm_toolbar_btn", text: "search", title: "검색", onClick: () => {
                const view = window.cm_instances[window.cm_instances.length - 1];
                if (view) {
                    if (view.dom.querySelector(".cm-search")) closeSearchPanel(view);
                    else {
                        openSearchPanel(view);
                        setTimeout(() => view.dom.querySelector(".cm-search input")?.focus(), 10);
                    }
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
                    <h3 style="margin-bottom:20px; border-bottom: 2px solid var(--sm-color-header); padding-bottom: 10px;">Editor Settings</h3>
                    <div style="display:flex; flex-direction:column; gap:5px;">
                        
                        <div class="sm_settings_row">
                            <span class="sm_settings_label">에디터 테마</span>
                            <div class="sm_settings_value">
                                <select id="sm-editor-theme-select" class="sm_settings_select">
                                    <option value="light" ${!document.body.classList.contains('dark') ? 'selected' : ''}>라이트</option>
                                    <option value="dark" ${document.body.classList.contains('dark') ? 'selected' : ''}>다크</option>
                                    <option value="custom" ${document.body.classList.contains('custom') ? 'selected' : ''}>사용자 지정</option>
                                </select>
                            </div>
                        </div>

                        <div class="sm_settings_row">
                            <span class="sm_settings_label">기본 폰트 크기</span>
                            <div class="sm_settings_value">
                                <input type="range" id="sm-editor-font-size" class="sm_settings_range" min="8" max="24" value="${getEditorFontSize()}">
                                <span id="fnt-size" style="min-width: 35px; text-align: right;">${getEditorFontSize()}pt</span>
                            </div>
                        </div>
                       <div class="hidden" id="custom-theme-options" style="margin-bottom: 20px;">
                            <h3 style="margin-bottom:15px; border-bottom: 2px solid var(--sm-color-header); padding-bottom: 8px; font-size: 1.1rem;">커스텀 테마 설정</h3>
                            <div class="sm_settings_row" style="margin-bottom: 0;">
                                <span class="sm_settings_label">주 색상 (Primary)</span>
                                <div class="sm_settings_value">
                                    <input type="color" id="sm-editor-main-color" class="sm_settings_color"
                                        style="cursor: pointer; border: none; background: transparent; width: 42px; height: 32px;"
                                        value="${getComputedStyle(document.body).getPropertyValue('--sm-color-header').trim() || '#3392FF'}">
                                </div>
                            </div>
                            <div class="sm_settings_row" style="margin-bottom: 0;">
                                <span class="sm_settings_label">텍스트 색상</span>
                                <div class="sm_settings_value">
                                    <input type="color" id="sm-editor-text-color" class="sm_settings_color"
                                        style="cursor: pointer; border: none; background: transparent; width: 42px; height: 32px;"
                                        value="${getComputedStyle(document.body).getPropertyValue('--sm-color-text').trim() || '#333'}">
                                </div>
                            </div>
                            <div class="sm_settings_row" style="margin-bottom: 0;">
                                <span class="sm_settings_label">텍스트 보조 색상</span>
                                <div class="sm_settings_value">
                                    <input type="color" id="sm-editor-text-secondary-color" class="sm_settings_color"
                                        style="cursor: pointer; border: none; background: transparent; width: 42px; height: 32px;"
                                        value="${getComputedStyle(document.body).getPropertyValue('--sm-color-text-secondary').trim() || 'white'}">
                                </div>
                            </div>
                            <div class="sm_settings_row" style="margin-bottom: 0;">
                                <span class="sm_settings_label">버튼 색상</span>
                                <div class="sm_settings_value">
                                    <input type="color" id="sm-editor-btn-color" class="sm_settings_color"
                                        style="cursor: pointer; border: none; background: transparent; width: 42px; height: 32px;"
                                        value="${getComputedStyle(document.body).getPropertyValue('--sm-btn-text').trim() || '#333'}">
                                </div>
                            </div>
                            <div class="sm_settings_row" style="margin-bottom: 0;">
                                <span class="sm_settings_label">배경 색상</span>
                                <div class="sm_settings_value">
                                    <input type="color" id="sm-editor-bg-color" class="sm_settings_color"
                                        style="cursor: pointer; border: none; background: transparent; width: 42px; height: 32px;"
                                        value="${getComputedStyle(document.body).getPropertyValue('--sm-bg-editor').trim() || '#fff'}">
                                </div>
                            </div>
                            <div class="sm_settings_row" style="margin-bottom: 0;">
                                <button class="sm_modal_create_btn" id="sm-theme-reset-btn">기본값으로</button>
                                <button class="sm_modal_create_btn" id="sm-theme-save-btn">테마 다운로드</button>
                                <button class="sm_modal_create_btn" id="sm-theme-load-btn">테마 업로드</button>
                            </div>
                        </div>
                        <div class="sm_settings_info_box">
                            <div class="sm_settings_info_header">
                                <img src="${smBridgeLogo}" alt="logo" class="sm_settings_info_logo">
                                <span class="sm_settings_info_title">SM Bridge</span>
                            </div>
                            <div id="sm-editor-info" class="sm_settings_info_content">
                                <!-- Info dynamically loaded -->
                            </div>
                        </div>
                    </div>
                `, (modal) => {
                    const select = modal.querySelector("#sm-editor-theme-select");
                    const customRow = modal.querySelector("#custom-theme-options");
                    const colorMain = modal.querySelector("#sm-editor-main-color");
                    const colorText = modal.querySelector("#sm-editor-text-color");
                    const colorBg = modal.querySelector("#sm-editor-bg-color");
                    const colorBtn = modal.querySelector("#sm-editor-btn-color");
                    const colorTextSecondary = modal.querySelector("#sm-editor-text-secondary-color");
                    const themeResetBtn = modal.querySelector("#sm-theme-reset-btn");
                    const themeSaveBtn = modal.querySelector("#sm-theme-save-btn");
                    const themeLoadBtn = modal.querySelector("#sm-theme-load-btn");

                    const updateCustomUI = (val) => {
                        if (val === "custom") customRow.classList.remove("hidden");
                        else customRow.classList.add("hidden");
                    };

                    // 초기 상태 반영
                    updateCustomUI(select.value);

                    select.addEventListener("change", () => {
                        window.setEditorTheme(select.value);
                        updateCustomUI(select.value);
                    });

                    colorMain.addEventListener("input", (e) => {
                        const color = e.target.value;
                        document.body.style.setProperty("--sm-color-header", color);
                        localStorage.setItem("sm-editor-custom-main", color);
                    });

                    colorText.addEventListener("input", (e) => {
                        const color = e.target.value;
                        document.body.style.setProperty("--sm-color-text", color);
                        localStorage.setItem("sm-editor-custom-text", color);
                    });

                    colorBg.addEventListener("input", (e) => {
                        const color = e.target.value;
                        document.body.style.setProperty("--sm-bg-editor", color);
                        document.body.style.setProperty("--sm-bg-toolbar", color);
                        localStorage.setItem("sm-editor-custom-bg", color);
                    });

                    colorBtn.addEventListener("input", (e) => {
                        const color = e.target.value;
                        document.body.style.setProperty("--sm-btn-text", color);
                        localStorage.setItem("sm-editor-custom-btn", color);
                    });

                    colorTextSecondary.addEventListener("input", (e) => {
                        const color = e.target.value;
                        document.body.style.setProperty("--sm-color-text-secondary", color);
                        localStorage.setItem("sm-editor-custom-text-secondary", color);
                    });

                    themeResetBtn.addEventListener("click", () => {
                        if (confirm("기본값으로 되돌리시겠습니까?")) {
                            THEME_CONFIG.forEach(item => {
                                document.body.style.setProperty(item.var, item.default);
                                localStorage.setItem(item.key, item.default);

                                if (item.inputId) {
                                    const input = modal.querySelector(item.inputId);
                                    if (input) input.value = item.default;
                                }
                            });
                        }
                    });

                    themeSaveBtn.addEventListener("click", () => {
                        const themeData = {};
                        // label 기준으로 중복 제거하여 데이터 생성
                        THEME_CONFIG.forEach(item => {
                            themeData[item.label] = document.body.style.getPropertyValue(item.var).trim() || item.default;
                        });

                        const blob = new Blob([JSON.stringify(themeData, null, 2)], {type: "application/json"});
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "theme.json";
                        a.click();
                        URL.revokeObjectURL(url);
                    });

                    themeLoadBtn.addEventListener("click", () => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "application/json";
                        input.click();
                        input.addEventListener("change", (e) => {
                            const file = e.target.files[0];
                            const reader = new FileReader();
                            reader.onload = (re) => {
                                try {
                                    const themeData = JSON.parse(re.target.result);
                                    THEME_CONFIG.forEach(item => {
                                        const newVal = themeData[item.label];
                                        if (newVal) {
                                            document.body.style.setProperty(item.var, newVal);
                                            localStorage.setItem(item.key, newVal);
                                            // input 값 갱신 추가
                                            if (item.inputId) {
                                                const input = modal.querySelector(item.inputId);
                                                if (input) input.value = newVal;
                                            }
                                        }
                                    });
                                    // UI 갱신 (테마 다시 세팅)
                                    window.setEditorTheme("custom");
                                } catch (err) {
                                    alert("유효하지 않은 테마 파일입니다.");
                                }
                            };
                            reader.readAsText(file);
                        });
                    });

                    const fontSizeInput = modal.querySelector("#sm-editor-font-size");
                    const fontSizeDisplay = modal.querySelector("#fnt-size");

                    fontSizeInput.addEventListener("input", (e) => {
                        const size = e.target.value;
                        document.documentElement.style.setProperty("--sm-editor-font-size", `${size}pt`);
                        setEditorFontSize(size);
                        fontSizeDisplay.textContent = `${size}pt`;
                    });

                    const infoContainer = modal.querySelector("#sm-editor-info");
                    const infoFunc = typeof get_crate_info !== 'undefined' ? get_crate_info : window.get_crate_info;

                    try {
                        const crateInfo = JSON.parse(infoFunc());
                        infoContainer.innerHTML = `
                            <strong>Version:</strong> ${crateInfo.version}<br>
                            <strong>Authors:</strong> ${crateInfo.author.join(", ")}<br>
                            <strong>About:</strong> ${crateInfo.description}
                        `;
                    } catch (err) {
                        infoContainer.textContent = "Information unavailable.";
                    }
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

function wrapTables(container) {
    if (!container) return;
    container.querySelectorAll('.sm-table').forEach(table => {
        if (table.parentElement.classList.contains('sm-table-wrapper')) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'sm-table-wrapper';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    });
}

function wrapSelection(before, after = before) {
    const view = window.cm_instances[window.cm_instances.length - 1];
    if (!view) return;
    const {state} = view;
    const {from, to} = state.selection.main;
    const selectedText = state.sliceDoc(from, to);
    const isWrap = selectedText.startsWith(before) && selectedText.endsWith(after);

    if (isWrap && from !== to) {
        view.dispatch(state.replaceSelection(selectedText.slice(before.length, -after.length)));
    } else {
        view.dispatch({
            changes: {from, to, insert: `${before}${selectedText}${after}`},
            selection: {anchor: from + before.length + (from === to ? 0 : selectedText.length)}
        });
    }
    view.focus();
}

function toggleSyntax(before, after, astType, defaultContent = '') {
    const view = window.cm_instances[window.cm_instances.length - 1];
    if (!view) return;
    const {state} = view;
    const {from, to} = state.selection.main;
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
            changes: {from: start, to: end, insert: content},
            selection: {
                anchor: Math.max(start, from - before.length),
                head: Math.min(start + content.length, to - before.length)
            }
        });
    } else {
        // 노드가 없음 -> Wrap (적용)
        let selectedText = state.sliceDoc(from, to);
        if (selectedText.length === 0) {
            selectedText = defaultContent;
        }
        view.dispatch({
            changes: {from, to, insert: `${before}${selectedText}${after}`},
            selection: {anchor: from + before.length + (from === to ? 0 : selectedText.length)}
        });
    }
    view.focus();
}

export function get_cm_ast() {
    const view = window.cm_instances[window.cm_instances.length - 1];
    if (!view) return;
    const {state} = view;
    const raw = state.doc.toString();
    return JSON.parse(window.cm_highlighter(raw));
}

if (typeof window !== 'undefined') {
    window.get_cm_ast = get_cm_ast;
}

function findNodeByType(nodes, from, to, targetType) {
    if (!nodes) return null;
    for (const node of nodes) {
        const type = Object.keys(node)[0];
        const data = node[type];
        if (data && data.span) {
            // 선택 영역이 노드 범위 안에 완전히 포함되는지 확인
            if (from >= data.span.start && to <= data.span.end) {
                if (data.children) {
                    const found = findNodeByType(data.children, from, to, targetType);
                    if (found) return found;
                }
                if (type === targetType) return data;
            }
        }
    }
    return null;
}

function createModal(content, onMount, isClosingWarning = false) {
    const sm_ed_area = document.getElementById("sm-editor-raw");
    if (sm_ed_area.querySelector(".sm_modal")) {
        return; // 이미 생성된 경우 무시 (DOM 생성 전 체크)
    }
    const modal = document.createElement("div");
    modal.className = "sm_modal";
    modal.innerHTML = `
        <div class="sm_modal_content" style="width: 600px; min-height: 450px; display: flex; flex-direction: column; box-sizing: border-box;">
            <span class="sm_modal_close">&times;</span>
            <div class="sm_modal_inner_scroll" style="flex: 1; overflow-y: auto; padding: 5px 10px 5px 0; box-sizing: border-box;">
                ${content}
            </div>
        </div>
    `;
    const closeBtn = modal.querySelector(".sm_modal_close");
    closeBtn.addEventListener("click", () => {
        if (isClosingWarning) {
            if (!confirm("모든 변경사항이 저장되지 않을 수 있습니다. 정말로 종료하시겠습니까?")) return;
        }
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


function setEditorFontSize(fontSize) {
    document.documentElement.style.setProperty("--sm-editor-font-size", `${fontSize}pt`);
    localStorage.setItem("sm-font-size", fontSize);
}

function getEditorFontSize() {
    return localStorage.getItem("sm-font-size") || "12";
}

function makingTableModal() {
    const modalContent = `
            <h3>테이블 생성</h3>
            <div class="sm_modal_tabs">
                <div class="sm_modal_tab active" data-tab="manual">직접 생성</div>
                <div class="sm_modal_tab" data-tab="file">파일 불러오기</div>
            </div>

            <!-- 직접 생성 탭 -->
            <div id="tab-manual" class="sm_modal_tab_content active" style="width: 100%; box-sizing: border-box;">
                <div style="display: grid; grid-template-columns: 200px 1fr; gap: 30px; margin-bottom: 25px; align-items: center;">
                    <div style="background: var(--sm-bg-editor); padding: 15px; border-radius: 8px; border: 1px solid var(--sm-border-editor); display: flex; flex-direction: column; align-items: center;">
                        <div class="sm_modal_label" style="margin-bottom: 10px; font-size: 0.85rem; white-space: nowrap;">그리드 드래그 선택</div>
                        <div id="table-grid-picker" class="sm_grid_picker" style="display: grid; grid-template-columns: repeat(10, 1fr); gap: 2px; width: 160px; height: 160px;">
                            ${Array.from({length: 100}).map((_, i) => `<div class="sm_grid_cell" data-row="${Math.floor(i / 10)}" data-col="${i % 10}" style="width: 100%; height: 100%; background: var(--sm-border-editor); border-radius: 1px; cursor: pointer;"></div>`).join("")}
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 15px; padding-right: 10px;">
                        <div id="sm-table-leftbox" style="margin-left: 23%">
                            <div style="display: flex; align-items: center; gap: 15px; ">
                                <label class="sm_modal_label" style="width: 80px; white-space: nowrap;">행 (Rows):</label> 
                                <input type="number" id="table-rows" value="3" min="1" max="50" style="flex: 1; max-width: 100px; padding: 6px 10px; border-radius: 4px; border: 1px solid var(--sm-border-editor);">
                            </div>
                            <div style="display: flex; align-items: center; gap: 15px; ">
                                <label class="sm_modal_label" style="width: 80px; white-space: nowrap;">열 (Cols):</label> 
                                <input type="number" id="table-cols" value="3" min="1" max="20" style="flex: 1; max-width: 100px; padding: 6px 10px; border-radius: 4px; border: 1px solid var(--sm-border-editor);">
                            </div>
                            <div id="table-size-indicator" style="font-size: 1.5rem; font-weight: bold; color: var(--sm-color-header); margin-top: 5px;">3 × 3</div>
                        </div>
                    </div>
                </div>
                <div class="sm_modal_label" style="margin-bottom: 10px; white-space: nowrap; font-weight: bold; display: block; width: 100%;">데이터 입력 및 미리보기 (샘플/헤더)</div>
                <div id="table-preview" style="height: 200px; overflow: auto; border: 1px solid var(--sm-border-editor); border-radius: 8px; padding: 15px; background: var(--sm-bg-quote); width: 100%; box-sizing: border-box;"></div>
                <button id="create-table-btn" class="sm_modal_create_btn" style="margin-top: 25px; width: 100%; padding: 15px; font-size: 1rem; font-weight: bold;">테이블 삽입</button>
            </div>

            <!-- 파일 불러오기 탭 -->
            <div id="tab-file" class="sm_modal_tab_content">
                <div style="margin-bottom: 20px;">
                    <div id="file-drop-zone" style="border: 2px dashed var(--sm-border-editor); border-radius: 8px; padding: 25px; text-align: center; background: var(--sm-bg-editor); cursor: pointer; transition: all 0.2s;" onclick="document.getElementById('table-file-input').click()">
                        <span class="material-symbols-rounded" style="font-size: 32px; opacity: 0.5; margin-bottom: 8px; display: block;">upload_file</span>
                        <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 5px;">CSV 또는 엑셀 파일을 선택하세요.</p>
                        <p id="file-name-display" style="font-size: 0.8rem; color: var(--sm-color-header); font-weight: bold;"></p>
                    </div>
                    <input type="file" id="table-file-input" accept=".csv, .xlsx, .xls" style="display: none;">
                </div>

                <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
                    <div class="sm_modal_label" style="font-size: 0.8rem;">데이터 미리보기</div>
                    <div id="sheet-select-container" class="hidden" style="align-items: center; gap: 8px;">
                        <label class="sm_modal_label" style="font-size: 0.75rem;">시트:</label>
                        <select id="sheet-select" class="sm_settings_select" style="padding: 2px 5px; font-size: 0.75rem; width: 100px;"></select>
                    </div>
                </div>
                
                <div id="file-preview-area" style="height: 150px; overflow: auto; border: 1px solid var(--sm-border-editor); border-radius: 6px; padding: 10px; background: var(--sm-bg-quote); font-size: 0.7rem;">
                    <p style="text-align: center; opacity: 0.4; margin-top: 50px;">파일을 불러오면 미리보기가 표시됩니다.</p>
                </div>

                <button id="import-table-btn" class="sm_modal_create_btn" style="margin-top: 20px; width: 100%; padding: 12px;" disabled>파일로 생성</button>
            </div>
    `;

    createModal(modalContent, (modal) => {
        const tabs = modal.querySelectorAll(".sm_modal_tab");
        const contents = modal.querySelectorAll(".sm_modal_tab_content");

        // 탭 전환 로직
        tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                tabs.forEach(t => t.classList.remove("active"));
                contents.forEach(c => c.classList.remove("active"));

                tab.classList.add("active");
                modal.querySelector(`#tab-${tab.dataset.tab}`).classList.add("active");
            });
        });

        // 직접 생성 로직
        const rowsInput = modal.querySelector("#table-rows");
        const colsInput = modal.querySelector("#table-cols");
        const preview = modal.querySelector("#table-preview");
        const createBtn = modal.querySelector("#create-table-btn");
        const gridPicker = modal.querySelector("#table-grid-picker");
        const sizeIndicator = modal.querySelector("#table-size-indicator");
        const gridCells = gridPicker.querySelectorAll(".sm_grid_cell");

        const updatePreview = () => {
            const rows = parseInt(rowsInput.value) || 0;
            const cols = parseInt(colsInput.value) || 0;
            sizeIndicator.textContent = `${rows} x ${cols}`;

            // 그리드 피커 하이라이트 업데이트
            gridCells.forEach(cell => {
                const r = parseInt(cell.dataset.row);
                const c = parseInt(cell.dataset.col);
                if (r < rows && c < cols) {
                    cell.style.background = "var(--sm-color-header)";
                    cell.style.opacity = "0.7";
                } else {
                    cell.style.background = "var(--sm-border-editor)";
                    cell.style.opacity = "1";
                }
            });

            preview.innerHTML = "";
            const displayRows = Math.min(rows, 10);
            const displayCols = Math.min(cols, 10);

            for (let i = 0; i < displayRows; i++) {
                const row = document.createElement("div");
                row.className = "table-row-preview";
                row.style.display = "flex";
                row.style.gap = "2px";
                row.style.marginBottom = "2px";
                for (let j = 0; j < displayCols; j++) {
                    const input = document.createElement("input");
                    input.type = "text";
                    input.className = "table-cell-input";
                    input.value = (i === 0) ? `H${j + 1}` : "";
                    input.style.width = "40px";
                    input.style.fontSize = "0.7rem";
                    input.dataset.row = i;
                    input.dataset.col = j;
                    row.appendChild(input);
                }
                preview.appendChild(row);
            }

            createBtn.disabled = (rows <= 0 || cols <= 0);

            if (rows > 10 || cols > 10) {
                const notice = document.createElement("div");
                notice.style.fontSize = "0.75rem";
                notice.style.marginTop = "5px";
                notice.style.opacity = "0.6";
                notice.textContent = `* ${rows}x${cols} 테이블이 생성됩니다.`;
                preview.appendChild(notice);
            }
        };

        let isFixed = false;
        gridPicker.addEventListener("mousemove", (e) => {
            if (isFixed) return; // 고정되어 있으면 값 변경 안 함
            const cell = e.target.closest(".sm_grid_cell");
            if (cell) {
                const r = parseInt(cell.dataset.row) + 1;
                const c = parseInt(cell.dataset.col) + 1;
                rowsInput.value = r;
                colsInput.value = c;
                updatePreview();
            }
        });
        gridPicker.addEventListener("click", () => {
            isFixed = !isFixed;
            // 시각적 피드백: 고정 시 테두리 색상 변경
            if (isFixed) {
                gridPicker.style.border = "2px solid var(--sm-color-header)";
                gridPicker.style.boxShadow = "0 0 8px rgba(3, 102, 214, 0.3)";
            } else {
                gridPicker.style.border = "";
                gridPicker.style.boxShadow = "";
            }
        });

        rowsInput.addEventListener("input", updatePreview);
        colsInput.addEventListener("input", updatePreview);
        updatePreview();
        createBtn.addEventListener("click", () => {
            const rows = parseInt(rowsInput.value) || 1;
            const cols = parseInt(colsInput.value) || 1;

            let tableText = "{{{#table\n";
            for (let i = 0; i < rows; i++) {
                tableText += "[[";
                for (let j = 0; j < cols; j++) {
                    const input = modal.querySelector(`.table-cell-input[data-row="${i}"][data-col="${j}"]`);
                    const value = input ? input.value : "";
                    tableText += `[[ ${value} ]] `;
                }
                tableText += "]]\n";
            }
            tableText += "}}}";

            const view = window.cm_instances[window.cm_instances.length - 1];
            if (view) {
                const {from, to} = view.state.selection.main;
                view.dispatch({
                    changes: {from, to, insert: tableText},
                    selection: {anchor: from + tableText.length}
                });
                view.focus();
            }
            modal.remove();
        });

        // 파일 업로드 관련 (placeholder)
        const fileInput = modal.querySelector("#table-file-input");
        const fileNameDisplay = modal.querySelector("#file-name-display");
        // 엑셀 및 CSV 타입 체크
        const excelTypes = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
            "application/vnd.ms-excel",                                        // .xls
            "text/csv"                                                         // .csv
        ];
        if (fileInput) {
            fileInput.addEventListener("change", (e) => {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    fileNameDisplay.textContent = `선택된 파일: ${file.name}`;

                    // MIME 타입 또는 확장자로 판별 (MIME 타입이 비어있는 경우가 많음)
                    const isCsv = file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv");
                    const isExcel = excelTypes.includes(file.type) || file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls");

                    if (isCsv || isExcel) {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                            try {
                                const data = new Uint8Array(event.target.result);
                                const fileDropZone = modal.querySelector("#file-drop-zone");
                                const importBtn = modal.querySelector("#import-table-btn");
                                const sheetSelect = modal.querySelector("#sheet-select");
                                const sheetSelectContainer = modal.querySelector("#sheet-select-container");
                                const previewArea = modal.querySelector("#file-preview-area");
                                let pickSheet = "";

                                const renderFilePreview = (rows) => {
                                    previewArea.innerHTML = "";
                                    if (!rows || rows.length === 0) return;
                                    const table = document.createElement("table");
                                    table.style.width = "100%";
                                    table.style.borderCollapse = "collapse";
                                    table.style.fontSize = "0.65rem";
                                    rows.slice(0, 10).forEach((row) => {
                                        const tr = document.createElement("tr");
                                        const startCol = isCsv ? 0 : 1;
                                        row.slice(startCol).forEach(cell => {
                                            const td = document.createElement("td");
                                            td.style.border = "1px solid var(--sm-border-editor)";
                                            td.style.padding = "2px 4px";
                                            td.textContent = String(cell).substring(0, 20);
                                            tr.appendChild(td);
                                        });
                                        table.appendChild(tr);
                                    });
                                    previewArea.appendChild(table);
                                };

                                if (!isCsv) {
                                    importBtn.disabled = true;
                                    fileDropZone.style.pointerEvents = "none";
                                    fileDropZone.style.opacity = "0.5";

                                    previewArea.innerHTML = `
                                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding-top: 30px;">
                                            <div style="border: 3px solid var(--sm-border-editor); border-top: 3px solid var(--sm-color-header); border-radius: 50%; width: 24px; height: 24px; animation: sm-spin 1s linear infinite;"></div>
                                            <span style="margin-top: 10px; font-size: 0.8rem; opacity: 0.8;">워크시트 로딩 중...</span>
                                        </div>
                                        <style>@keyframes sm-spin {0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}</style>
                                    `;

                                    const sheetNames = await loadExcelSheet(data);

                                    fileDropZone.style.pointerEvents = "auto";
                                    fileDropZone.style.opacity = "1";
                                    sheetSelectContainer.classList.remove("hidden");
                                    sheetSelect.innerHTML = "";
                                    sheetNames.forEach(sheetName => {
                                        const option = document.createElement("option");
                                        option.value = sheetName;
                                        option.textContent = sheetName;
                                        sheetSelect.appendChild(option);
                                    });
                                    pickSheet = sheetNames[0] || "";

                                    const updateExcelPreview = async (sheet) => {
                                        // 미리보기 로딩 표시
                                        previewArea.innerHTML = `
                                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding-top: 30px;">
                                                <div style="border: 3px solid var(--sm-border-editor); border-top: 3px solid var(--sm-color-header); border-radius: 50%; width: 24px; height: 24px; animation: sm-spin 1s linear infinite;"></div>
                                                <span style="margin-top: 10px; font-size: 0.8rem; opacity: 0.8;">데이터 로딩 중...</span>
                                            </div>
                                        `;
                                        try {
                                            const resultJson = await loadExcelData(data, sheet);
                                            let rows = [];
                                            try {
                                                rows = JSON.parse(resultJson).Ok || [];
                                            } catch (e) {
                                                throw Error("데이터를 불러올 수 없습니다.");
                                            }
                                            // 첫 번째 열이 모두 비어있는지 확인 (사용자 실수 보정)
                                            const isFirstColEmpty = rows.length > 0 && rows.every(r => r[0] === null || r[0] === undefined || String(r[0]).trim() === "");
                                            renderFilePreview(isFirstColEmpty ? rows.map(row => row.slice(1)) : rows);
                                        } catch (e) {
                                        }
                                    };

                                    sheetSelect.addEventListener("change", () => {
                                        pickSheet = sheetSelect.value;
                                        updateExcelPreview(pickSheet);
                                    });
                                    updateExcelPreview(pickSheet);
                                    importBtn.disabled = false;
                                } else {
                                    sheetSelectContainer.classList.add("hidden");
                                    try {
                                        const resultJson = await loadCsvData(data);
                                        renderFilePreview(JSON.parse(resultJson).Ok || []);
                                    } catch (e) {
                                    }
                                    importBtn.disabled = false;
                                }

                                // 이전 리스너 제거 후 새로 등록 (중복 방지)
                                const newImportBtn = importBtn.cloneNode(true);
                                importBtn.parentNode.replaceChild(newImportBtn, importBtn);

                                newImportBtn.addEventListener("click", async () => {
                                    // 버튼 로딩 상태 전환
                                    const originalBtnText = newImportBtn.innerHTML;
                                    newImportBtn.disabled = true;
                                    newImportBtn.innerHTML = `<div style="display: inline-block; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; width: 14px; height: 14px; animation: sm-spin 1s linear infinite; vertical-align: middle; margin-right: 8px;"></div>생성 중...`;
                                    newImportBtn.style.cursor = "wait";

                                    try {
                                        let resultJson;
                                        if (isCsv) {
                                            resultJson = await loadCsvData(data);
                                        } else {
                                            resultJson = await loadExcelData(data, pickSheet);
                                        }

                                        const result = JSON.parse(resultJson);
                                        let rows = result.Ok || result;

                                        if (!Array.isArray(rows)) {
                                            newImportBtn.disabled = true;
                                            throw new Error(result.Err || "데이터를 불러올 수 없습니다.");
                                        }

                                        if (Array.isArray(rows) && rows.length === 0) {
                                            newImportBtn.disabled = true;
                                            throw new Error("데이터가 없습니다.");
                                        }

                                        const cleanCellValue = (cell) => {
                                            if (typeof cell !== "string") return cell;
                                            if (cell.includes(" : ")) {
                                                const parts = cell.split(" : ");
                                                const commonType = ["String", "Float", "Int", "Bool", "Empty", "Error", "DateTime"];
                                                if (commonType.includes(parts[parts.length - 1])) {
                                                    return parts.slice(0, -1).join(" : ");
                                                }
                                            }
                                            return cell;
                                        }

                                        // 첫 번째 행이 파일명(메타데이터)인지 확인하여 제거
                                        if (rows.length > 1) {
                                            const firstRow = rows[0];
                                            const firstVal = cleanCellValue(firstRow[0]);
                                            const isFirstCellValid = firstVal !== null && firstVal !== undefined && String(firstVal).trim() !== "";
                                            const isRestEmpty = firstRow.slice(1).every(c => {
                                                const val = cleanCellValue(c);
                                                return val === null || val === undefined || String(val).trim() === "";
                                            });
                                            if (isFirstCellValid && isRestEmpty) rows = rows.slice(1);
                                        }

                                        // 첫 번째 열이 비어있는지 확인
                                        let startCol = 0;
                                        if (rows.length > 0) {
                                            const isFirstColEmpty = rows.every(r => {
                                                const val = cleanCellValue(r[0]);
                                                return val === null || val === undefined || String(val).trim() === "";
                                            });
                                            if (isFirstColEmpty) startCol = 1;
                                        }

                                        let tableText = "{{{#table\n";
                                        for (let i = 0; i < rows.length; i++) {
                                            tableText += "[[ ";
                                            for (let j = startCol; j < rows[i].length; j++) {
                                                tableText += `[[ ${cleanCellValue(rows[i][j])} ]] `;
                                            }
                                            tableText += "]]\n";
                                        }
                                        tableText += "}}}";

                                        const view = window.cm_instances[window.cm_instances.length - 1];
                                        if (view) {
                                            const {from, to} = view.state.selection.main;
                                            view.dispatch({
                                                changes: {from, to, insert: tableText},
                                                selection: {anchor: from + tableText.length}
                                            });
                                            view.focus();
                                        }
                                        modal.remove();
                                    } catch (err) {
                                        alert("에러: " + err);
                                        // 에러 발생 시 버튼 상태 복구
                                        newImportBtn.disabled = false;
                                        newImportBtn.innerHTML = originalBtnText;
                                        newImportBtn.style.cursor = "pointer";
                                    }
                                });
                            } catch (error) {
                                console.error("데이터 처리 에러:", error);
                                fileNameDisplay.innerHTML = `<span style='color: red;'>에러: ${error}</span>`;
                            }
                        };
                        reader.onerror = () => {
                            fileNameDisplay.innerHTML = "<span style='color: red;'>파일을 읽는 중 에러가 발생했습니다.</span>";
                        };
                        reader.readAsArrayBuffer(e.target.files[0]);
                    } else {
                        fileNameDisplay.innerHTML = "<span style='color: red;'>지원하지 않는 파일 형식입니다.</span>";
                    }
                }
            });
        }
    }, true);
}

function openTableEditorModal() {
    const view = window.cm_instances[window.cm_instances.length - 1];
    if (!view) return;
    const {state} = view;
    const {from, to} = state.selection.main;
    const raw = state.doc.toString();
    const ast = JSON.parse(window.cm_highlighter(raw));

    function findNodeByType(nodes, from, to, targetType) {
        if (!nodes) return null;
        for (const node of nodes) {
            const type = Object.keys(node)[0];
            const data = node[type];
            if (data && data.span) {
                if (from >= data.span.start && to <= data.span.end) {
                    // 자식 노드에서 먼저 찾음 (가장 안쪽 노드 우선)
                    if (data.children) {
                        const found = findNodeByType(data.children, from, to, targetType);
                        if (found) return found;
                    }
                    if (type === targetType) return {...data, type};
                }
            }
        }
        return null;
    }

    // 대비되는 색상(검정/흰색) 계산 함수
    const getContrastColor = (colorProp) => {
        let r, g, b;
        if (!colorProp) return 'var(--sm-color-text)'; // Fallback

        if (colorProp.indexOf('#') === 0) {
            let hex = colorProp.slice(1);
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            if (hex.length !== 6) return 'var(--sm-color-text)';
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        } else if (colorProp.startsWith('rgb')) {
            const parts = colorProp.match(/\d+/g);
            if (!parts || parts.length < 3) return 'var(--sm-color-text)';
            r = parseInt(parts[0]);
            g = parseInt(parts[1]);
            b = parseInt(parts[2]);
        } else {
            return 'var(--sm-color-text)';
        }
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? 'black' : 'white';
    };

    const tableNode = findNodeByType(ast, from, to, "Table");
    if (!tableNode) {
        alert("현재 위치한 요소는 테이블이 아니라서\n테이블 편집 모드를 실행할 수 없습니다.");
        return;
    }

    // 테이블 데이터 파싱 (재귀적 추출)
    let grid = [];
    const collectCells = (node) => {
        let cells = [];
        if (node.children) {
            node.children.forEach(c => {
                const type = Object.keys(c)[0];
                if (type === "Cell") cells.push(c[type]);
                else cells = cells.concat(collectCells(c[type]));
            });
        }
        return cells;
    };

    const collectRows = (node) => {
        let rows = [];
        console.log("collectRows called with node:", node);
        if (node.children) {
            console.log("node.children:", node.children);
            node.children.forEach(c => {
                const type = Object.keys(c)[0];
                console.log("  - child type:", type, "| child:", c);
                if (type === "Row") rows.push(c[type]);
                else if (type !== "Cell") rows = rows.concat(collectRows(c[type]));
            });
        }
        console.log("collectRows returning:", rows.length, "rows");
        return rows;
    };

    const rows = [];
    if (tableNode.children) {
        tableNode.children.forEach(child => {
            const type = Object.keys(child)[0];
            console.log("Direct child type:", type, "| child:", child);
            if (type === "Row") {
                rows.push(child[type]);
            }
        });
    }
    console.log("Total rows extracted:", rows.length);
    rows.forEach((rowData) => {
        const cells = [];
        if (rowData.children) {
            rowData.children.forEach(child => {
                const type = Object.keys(child)[0];
                if (type === "Cell") {
                    cells.push(child[type]);
                }
            });
        }

        const gridRow = [];
        cells.forEach((cellData) => {
            // [[ ... ]] 내부 내용 추출: span 범위 내에서 정확한 대괄호 위치를 찾아 추출
            const cellText = raw.slice(cellData.span.start, cellData.span.end);
            const startIdx = cellText.indexOf("[[");
            const endIdx = cellText.lastIndexOf("]]");

            let content;
            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                content = cellText.slice(startIdx + 2, endIdx).trim();
            } else {
                // 안전장치: 대괄호를 못 찾은 경우 기존 방식 시도
                content = cellText.trim();
                if (content.startsWith("[[")) content = content.slice(2);
                if (content.endsWith("]]")) content = content.slice(0, -2);
                content = content.trim();
            }

            let colspan = 1;
            let rowspan = 1;

            // 속성 반복 파싱
            while (true) {
                const xMatch = content.match(/^#x="(\d+)"\s*/);
                if (xMatch) {
                    colspan = parseInt(xMatch[1]);
                    content = content.replace(/^#x="\d+"\s*/, "").trim();
                    continue;
                }
                const yMatch = content.match(/^#y="(\d+)"\s*/);
                if (yMatch) {
                    rowspan = parseInt(yMatch[1]);
                    content = content.replace(/^#y="\d+"\s*/, "").trim();
                    continue;
                }
                break;
            }

            gridRow.push({content, colspan, rowspan});
        });
        grid.push(gridRow);
    });

    console.log("Table Editor Debug:");
    console.log("- tableNode:", tableNode);
    console.log("- rows found:", rows.length);
    console.log("- grid:", grid);


    const modalContent = `
        <h3 style="margin-bottom:15px; border-bottom: 2px solid var(--sm-color-header); padding-bottom: 8px;">테이블 에디터</h3>
        <!-- 조작 버튼들 -->
        <div style="display: flex; gap: 8px; margin-bottom: 12px; align-items: center;">
            <button id="te-undo-btn" class="sm_modal_create_btn" style="width: 36px; background: var(--sm-bg-toolbar); border: 1px solid var(--sm-border-editor); height: 36px; padding: 0; display: flex; align-items: center; justify-content: center; margin-top: 0;" title="되돌리기 (Ctrl+Z)"><span class="material-symbols-outlined" style="font-size: 18px; color: var(--sm-color-header);">undo</span></button>
            <button id="te-redo-btn" class="sm_modal_create_btn" style="width: 36px; background: var(--sm-bg-toolbar); border: 1px solid var(--sm-border-editor); height: 36px; padding: 0; display: flex; align-items: center; justify-content: center; margin-top: 0;" title="다시하기 (Ctrl+Y)"><span class="material-symbols-outlined" style="font-size: 18px; color: var(--sm-color-header);">redo</span></button>
            <div style="flex: 1;"></div>
            <button id="te-merge-btn" class="sm_modal_create_btn" style="padding: 0 15px; height: 36px; font-size: 0.8rem; width: auto; margin-top: 0;">셀 합치기</button>
            <button id="te-unmerge-btn" class="sm_modal_create_btn" style="padding: 0 15px; height: 36px; font-size: 0.8rem; width: auto; margin-top: 0;">셀 분할</button>
            <button id="te-deselect-btn" class="sm_modal_create_btn" style="padding: 0 15px; background: var(--sm-bg-editor); color: var(--sm-color-text); border: 1px solid var(--sm-border-editor); height: 36px; font-size: 0.8rem; width: auto; margin-top: 0;">선택 해제</button>
        </div>

        <div id="te-grid-container" style="height: 250px; overflow: auto; border: 1px solid var(--sm-border-editor); border-radius: 6px; background: var(--sm-bg-editor); margin-bottom: 15px; padding: 10px;">
            <table id="te-edit-table" style="border-collapse: collapse; width: 100%; user-select: none; background: var(--sm-bg-editor);">
                <!-- Table rows will be injected here -->
            </table>
        </div>

        <div style="background: var(--sm-bg-quote); padding: 12px; border-radius: 6px; margin-bottom: 15px; border: 1px solid var(--sm-border-editor);">
            <div class="sm_modal_label" style="font-size: 0.75rem; color: var(--sm-color-header); margin-bottom: 5px;">문법 미리보기 (SevenMark):</div>
            <pre id="te-syntax-preview" style="margin: 0; font-size: 0.75rem; color: var(--sm-color-code); white-space: pre-wrap; word-break: break-all; height: 80px; overflow-y: auto; font-family: monospace;"></pre>
        </div>

        <button id="te-apply-btn" class="sm_modal_create_btn" style="width: 100%; font-weight: bold; height: 50px; font-size: 1rem;">에디터에 최종 적용</button>
    `;

    createModal(modalContent, (modal) => {
        const table = modal.querySelector("#te-edit-table");
        const syntaxPreview = modal.querySelector("#te-syntax-preview");
        const mergeBtn = modal.querySelector("#te-merge-btn");
        const unmergeBtn = modal.querySelector("#te-unmerge-btn");
        const deselectBtn = modal.querySelector("#te-deselect-btn");
        const applyBtn = modal.querySelector("#te-apply-btn");

        let selection = {start: null, end: null, active: false};
        let currentGrid = JSON.parse(JSON.stringify(grid));

        //히스토리 저장 Ctrl+Z Ctrl+Y
        let history = [];
        let historyIndex = -1;
        const undoBtn = modal.querySelector("#te-undo-btn");
        const redoBtn = modal.querySelector("#te-redo-btn");
        const updateHistoryButtons = () => {
            if (undoBtn) {
                undoBtn.disabled = historyIndex <= 0;
                undoBtn.style.opacity = undoBtn.disabled ? "0.3" : "1";
            }
            if (redoBtn) {
                redoBtn.disabled = historyIndex >= history.length - 1;
                redoBtn.style.opacity = redoBtn.disabled ? "0.3" : "1";
            }
        };

        const saveHistory = () => {
            // 현재 상태가 히스토리의 마지막과 같다면 저장하지 않음 (중복 방지)
            const currentState = JSON.stringify(currentGrid);
            if (historyIndex >= 0 && history[historyIndex] === currentState) return;

            historyIndex++;
            history.splice(historyIndex, history.length - historyIndex);
            history.push(currentState);
            updateHistoryButtons();
        };

        const undo = () => {
            if (historyIndex > 0) {
                historyIndex--;
                currentGrid = JSON.parse(history[historyIndex]);
                renderTable();
                updateHistoryButtons();
            }
        };

        const redo = () => {
            if (historyIndex < history.length - 1) {
                historyIndex++;
                currentGrid = JSON.parse(history[historyIndex]);
                renderTable();
                updateHistoryButtons();
            }
        };

        undoBtn.addEventListener("click", undo);
        redoBtn.addEventListener("click", redo);
        // 초기 상태 저장
        saveHistory();

        const renderTable = () => {
            table.innerHTML = "";
            let occupied = [];
            for (let i = 0; i < 100; i++) occupied[i] = []; // 여유있게 할당
            currentGrid.forEach((row, r) => {
                const tr = document.createElement("tr");
                let currentCol = 0;
                row.forEach((cell) => {
                    while (occupied[r][currentCol]) currentCol++;

                    const td = document.createElement("td");
                    td.style.border = "1px solid var(--sm-border-editor)";
                    td.style.padding = "8px";
                    td.style.minWidth = "80px";
                    td.style.height = "40px";
                    td.style.textAlign = "center";
                    td.style.background = "var(--sm-bg-quote)";
                    td.style.color = "var(--sm-color-text)";
                    td.classList.add("no-drag");

                    const editArea = document.createElement("div");
                    editArea.contentEditable = "false";
                    editArea.style.outline = "none";
                    editArea.style.minHeight = "1.2em";
                    editArea.style.width = "100%"; // 셀 꽉 채우기
                    editArea.textContent = cell.content;

                    let originalValue = cell.content;

                    editArea.addEventListener("dblclick", () => {
                        originalValue = cell.content; // 편집 시작 시 원본 저장
                        editArea.contentEditable = "true";
                        editArea.focus();

                        const selection = window.getSelection();
                        const range = document.createRange();
                        range.selectNodeContents(editArea);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    });

                    let isCanceling = false;

                    editArea.addEventListener("keydown", (e) => {
                        if (e.key === "Escape") {
                            isCanceling = true;
                            cell.content = originalValue; // 데이터 복구
                            editArea.textContent = originalValue; // UI 복구
                            updateSyntax(); // 미리보기 복구
                            editArea.contentEditable = "false";
                            editArea.blur();
                            isCanceling = false;
                        }

                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            editArea.blur();
                        }
                    });

                    editArea.addEventListener("blur", () => {
                        if (!isCanceling) {
                            if (originalValue !== editArea.textContent) {
                                cell.content = editArea.textContent;
                                saveHistory(); // 내용 변경 시 히스토리 저장
                                originalValue = cell.content; // 기준값 업데이트
                            }
                        }
                        editArea.contentEditable = "false";
                    });

                    td.appendChild(editArea);

                    td.colSpan = cell.colspan;
                    td.rowSpan = cell.rowspan;
                    td.dataset.r = r;
                    td.dataset.c = currentCol;

                    for (let x = 0; x < cell.colspan; x++) {
                        for (let y = 0; y < cell.rowspan; y++) {
                            if (!occupied[r + y]) occupied[r + y] = [];
                            occupied[r + y][currentCol + x] = true;
                        }
                    }

                    editArea.addEventListener("input", (e) => {
                        cell.content = e.target.textContent;
                        updateSyntax();
                    });

                    td.addEventListener("mousedown", () => {
                        if (editArea.contentEditable === "true") return; // 드래그불가 해결
                        selection.active = true;
                        selection.start = {r, c: parseInt(td.dataset.c)};
                        selection.end = {r, c: parseInt(td.dataset.c)};
                        updateSelectionUI();
                    });

                    td.addEventListener("mouseenter", () => {
                        if (selection.active) {
                            selection.end = {r, c: parseInt(td.dataset.c)};
                            updateSelectionUI();
                        }
                    });

                    tr.appendChild(td);
                    currentCol += cell.colspan;
                });
                table.appendChild(tr);
            });
            updateSyntax();
        };

        const updateSelectionUI = () => {
            const tds = table.querySelectorAll("td");
            // 현재 테마의 헤더 색상(선택 색상)을 가져와 대비색 계산
            const themeHeaderColor = getComputedStyle(document.body).getPropertyValue('--sm-color-header').trim();
            const contrastTextColor = getContrastColor(themeHeaderColor);

            if (!selection.start || !selection.end) {
                tds.forEach(t => {
                    t.style.background = "var(--sm-bg-quote)";
                    t.style.color = "var(--sm-color-text)";
                    t.style.outline = "";
                });
                return;
            }
            const rStart = Math.min(selection.start.r, selection.end.r);
            const rEnd = Math.max(selection.start.r, selection.end.r);
            const cStart = Math.min(selection.start.c, selection.end.c);
            const cEnd = Math.max(selection.start.c, selection.end.c);

            tds.forEach(td => {
                const r = parseInt(td.dataset.r);
                const c = parseInt(td.dataset.c);
                const rs = parseInt(td.rowSpan || 1);
                const cs = parseInt(td.colSpan || 1);

                const inRange = (r + rs - 1 >= rStart && r <= rEnd && c + cs - 1 >= cStart && c <= cEnd);
                if (inRange) {
                    td.style.backgroundColor = "var(--sm-color-header)";
                    td.style.color = contrastTextColor; // 대비되는 텍스트 색상 적용
                    td.style.opacity = "0.8";
                    td.style.outline = "2px solid white";
                    td.style.outlineOffset = "-2px";
                } else {
                    td.style.backgroundColor = "var(--sm-bg-quote)";
                    td.style.color = "var(--sm-color-text)";
                    td.style.opacity = "1";
                    td.style.outline = "";
                }
            });
        };

        const updateSyntax = () => {
            let out = "{{{#table\n";
            currentGrid.forEach(row => {
                out += "[[ ";
                row.forEach(cell => {
                    let tags = "";
                    if (cell.colspan > 1) tags += `#x="${cell.colspan}" `;
                    if (cell.rowspan > 1) tags += `#y="${cell.rowspan}" `;
                    out += `[[${tags} ${cell.content}]] `;
                });
                out += "]]\n";
            });
            out += "}}}";
            syntaxPreview.textContent = out;
        };

        const handleMouseUp = () => {
            selection.active = false;
        };
        window.addEventListener("mouseup", handleMouseUp);

        mergeBtn.addEventListener("click", () => {
            if (!selection.start || !selection.end) return;
            const rStart = Math.min(selection.start.r, selection.end.r);
            const rEnd = Math.max(selection.start.r, selection.end.r);
            const cStart = Math.min(selection.start.c, selection.end.c);
            const cEnd = Math.max(selection.start.c, selection.end.c);

            const targetColspan = (cEnd - cStart + 1);
            const targetRowspan = (rEnd - rStart + 1);

            let newGrid = [];
            for (let r = 0; r < currentGrid.length; r++) {
                let newRow = [];
                let logicCol = 0;
                for (let i = 0; i < currentGrid[r].length; i++) {
                    const cell = currentGrid[r][i];
                    if (r === rStart && logicCol === cStart) {
                        newRow.push({content: cell.content, colspan: targetColspan, rowspan: targetRowspan});
                    } else {
                        const inMergeRange = (r >= rStart && r <= rEnd && logicCol >= cStart && logicCol <= cEnd);
                        if (!inMergeRange) {
                            newRow.push(cell);
                        }
                    }
                    logicCol += cell.colspan;
                }
                if (newRow.length > 0) newGrid.push(newRow);
            }
            currentGrid = newGrid;
            selection.start = null;
            selection.end = null;
            saveHistory(); // 합치기 후 히스토리 저장
            renderTable();
        });

        // 단축키 리스너
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'z') {
                    e.preventDefault();
                    undo();
                } else if (e.key.toLowerCase() === 'y') {
                    e.preventDefault();
                    redo();
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);

        unmergeBtn.addEventListener("click", () => {
            if (!selection.start || !selection.end) return;

            // 1. 현재 그리드를 Dense Array로 변환 (모든 셀 좌표화)
            let denseGrid = [];
            let occupied = [];
            for (let r = 0; r < currentGrid.length; r++) occupied[r] = [];

            for (let r = 0; r < currentGrid.length; r++) {
                let cIndex = 0;
                for (let i = 0; i < currentGrid[r].length; i++) {
                    while (occupied[r][cIndex]) cIndex++; // 이미 차지된 자리 스킵
                    const cell = currentGrid[r][i];
                    if (!denseGrid[r]) denseGrid[r] = [];

                    // 2D 배열에 정보 채우기
                    for (let y = 0; y < cell.rowspan; y++) {
                        for (let x = 0; x < cell.colspan; x++) {
                            const targetR = r + y;
                            const targetC = cIndex + x;
                            if (!denseGrid[targetR]) denseGrid[targetR] = [];
                            if (!occupied[targetR]) occupied[targetR] = [];

                            occupied[targetR][targetC] = true;
                            denseGrid[targetR][targetC] = {
                                content: (x === 0 && y === 0) ? cell.content : "",
                                colspan: cell.colspan,
                                rowspan: cell.rowspan,
                                isOrigin: (x === 0 && y === 0),
                                originR: r,
                                originC: cIndex
                            };
                        }
                    }
                    cIndex += cell.colspan;
                }
            }

            // 2. 선택 영역 내의 '병합된 셀'을 찾아 분할 (1x1로 초기화)
            const rStart = Math.min(selection.start.r, selection.end.r);
            const rEnd = Math.max(selection.start.r, selection.end.r);
            const cStart = Math.min(selection.start.c, selection.end.c);
            const cEnd = Math.max(selection.start.c, selection.end.c);

            let hasChanged = false;
            for (let r = rStart; r <= rEnd; r++) {
                for (let c = cStart; c <= cEnd; c++) {
                    if (denseGrid[r] && denseGrid[r][c]) {
                        const cell = denseGrid[r][c];
                        // 병합된 셀의 원본(isOrigin)인 경우만 처리
                        if (cell.isOrigin && (cell.colspan > 1 || cell.rowspan > 1)) {
                            // 범위 체크: 셀 전체가 선택 영역에 포함되는지 확인 (선택적)
                            // 여기서는 단순히 선택된 영역에 걸친 병합셀을 모두 쪼갭니다.

                            // 분할 로직: 해당 셀이 차지하던 영역을 모두 개별 1x1 셀로 변경
                            for (let y = 0; y < cell.rowspan; y++) {
                                for (let x = 0; x < cell.colspan; x++) {
                                    const tr = r + y;
                                    const tc = c + x;
                                    if (denseGrid[tr] && denseGrid[tr][tc]) {
                                        denseGrid[tr][tc] = {
                                            content: (x === 0 && y === 0) ? cell.content : "", // 내용은 첫 셀에만 유지하고 나머지는 빈값
                                            colspan: 1,
                                            rowspan: 1,
                                            isOrigin: true,
                                            originR: tr,
                                            originC: tc
                                        };
                                    }
                                }
                            }
                            hasChanged = true;
                        }
                    }
                }
            }

            if (!hasChanged) return;

            // 3. Dense Array를 다시 SevenMark Table Grid 포맷으로 변환
            let newGrid = [];
            for (let r = 0; r < denseGrid.length; r++) {
                let newRow = [];
                if (!denseGrid[r]) continue;

                for (let c = 0; c < denseGrid[r].length; c++) {
                    const cell = denseGrid[r][c];
                    if (!cell) continue;

                    // 원본 시작점인 경우에만 추가 (나머지는 다른 셀의 colspan/rowspan에 의해 커버됨)
                    // 분할된 셀들은 모두 1x1, isOrigin=true가 되었으므로 모두 추가됨
                    if (cell.isOrigin) {
                        // 만약 이 셀이 위쪽 행의 rowspan에 의해 덮여야 하는 위치라면?
                        // 이미 위에서 분할 처리했으므로 denseGrid 상태가 정답임.
                        // 다만 재구성 시 '덮이는' 셀은 건너뛰어야 함.
                        // denseGrid 로직상 isOrigin이 true면 덮이는 셀이 아님.
                        newRow.push({
                            content: cell.content,
                            colspan: cell.colspan,
                            rowspan: cell.rowspan
                        });
                    }
                }
                if (newRow.length > 0) newGrid.push(newRow);
            }

            currentGrid = newGrid;
            saveHistory();
            renderTable();
        });

        deselectBtn.addEventListener("click", () => {
            selection.start = null;
            selection.end = null;

            updateSelectionUI();
        });

        applyBtn.addEventListener("click", () => {
            updateSyntax();
            const finalSyntax = syntaxPreview.textContent;
            view.dispatch({
                changes: {from: tableNode.span.start, to: tableNode.span.end, insert: finalSyntax},
                selection: {anchor: tableNode.span.start + finalSyntax.length}
            });
            modal.remove();
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("keydown", handleKeyDown);
            view.focus();
        });

        renderTable();
    }, true);
}

if (typeof window !== 'undefined') {
    window.openTableEditorModal = openTableEditorModal;
    window.makingTableModal = makingTableModal;
    // 전역에 등록하여 ReferenceError 방지
    window.init_codemirror = init_codemirror;
}