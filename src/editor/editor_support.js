window.cm_instances = [];

// 전역 변수로 저장될 CodeMirror 모듈들
let CM = null;

async function ensure_codemirror() {
    if (CM) return CM;

    // 동적 임포트로 모듈 로드 (WASM이 주입한 importmap을 참조함)
    const [
        { EditorView, basicSetup },
        { EditorState, StateField },
        { Decoration, keymap },
        { undoDepth, redoDepth, undo, redo, indentWithTab },
        { openSearchPanel, closeSearchPanel }
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
.cm-sm-Header { color: var(--sm-color-header); font-weight: bold; border-bottom: 1px solid var(--sm-border-header); }
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
.cm-sm-Literal { color: var(--sm-color-literal); }
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
    /* SevenMark Preview CSS (태그 기반 스타일링) */

    #sm-editor-preview strong {
        font-weight: bold;
    }
    #sm-editor-preview em {
        font-style: italic;
    }
    #sm-editor-preview u {
        text-decoration: underline;
    }
    #sm-editor-preview del {
        text-decoration: line-through;
    }
    /*
    .sm-render-block code {
        font-family: 'Courier New', Courier, monospace;
        background-color: rgba(128, 128, 128, 0.1);
        padding: 2px 4px;
        border-radius: 3px;
    }*/
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
    #sm-editor-preview blockquote {
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
    /* 에디터 내부 헤더: 마진이 있으면 줄 번호 정렬이 틀어짐 */
    .sm-h1 { font-size: 1.8em; font-weight: bold; margin: 0; }
    .sm-h2 { font-size: 1.5em; font-weight: bold; margin: 0; }
    .sm-h3 { font-size: 1.25em; font-weight: bold; margin: 0; }
    .sm-h4 { font-size: 1.1em; font-weight: bold; margin: 0; }
    .sm-h5 { font-size: 1em; font-weight: bold; margin: 0; }
    .sm-h6 { font-size: 0.9em; font-weight: bold; margin: 0; }

    /* 테이블 */
    .sm-table {
        border-collapse: collapse;
        width: 100%;
        margin: 15px 0;
    }
    .sm-table th,
    .sm-table td {
        border: 1px solid #ddd;
        padding: 10px;
        text-align: left;
    }
    .sm-table th {
        background-color: rgba(128, 128, 128, 0.1);
        font-weight: bold;
    }
    .sm-table tr:nth-child(even) {
        background-color: rgba(128, 128, 128, 0.03);
    }
    .sm-table tr:hover {
        background-color: rgba(128, 128, 128, 0.08);
    }
    /* 섹션 및 접기 (details/summary) 스타일링 */
    .sm-section, .sm-fold {
        margin: 10px 0;
        border: 1px solid transparent;
        transition: all 0.2s;
    }
    .sm-section summary, .sm-fold summary {
        list-style: none; /* 기본 화살표 숨기기 */
        cursor: pointer;
        outline: none;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
    }
    /* Webkit 브라우저용 화살표 숨기기 */
    .sm-section summary::-webkit-details-marker,
    .sm-fold summary::-webkit-details-marker {
        display: none;
    }
    
    /* 기본 화살표 대신 커스텀 아이콘 (::before) */
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
    .sm-section[open] > summary::before, 
    .sm-fold[open] > summary::before {
        transform: rotate(90deg);
    }
    
    /* summary 내부의 헤더 마진 제거하여 화살표와 수평 맞춤 */
    .sm-section summary h1, 
    .sm-section summary h2, 
    .sm-section summary h3, 
    .sm-section summary h4, 
    .sm-section summary h5, 
    .sm-section summary h6 {
        display: inline;
        margin: 0 !important;
        padding: 0;
    }

    .sm-section-content {
        padding-left: 20px;
        margin-left: 5px;
        border-left: 1px solid rgba(128, 128, 128, 0.1);
    }
    
    .sm-section:hover {
        background-color: rgba(128, 128, 128, 0.02);
        border-radius: 4px;
    }
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
        background: var(--sm-bg-toolbar);
        color: var(--sm-color-text);
        font-family: inherit;
    }
    .sm_modal_content .sm_modal_label {
        display: inline-block;
        width: 40px;
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
        margin-top: 10px;
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
        color: var(--sm-color-header);
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
        background: #3392FF;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        transition: background 0.2s;
    }
    .sm_modal_create_btn:hover {
        background: #2b7acc;
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
    const { EditorView, EditorState, basicSetup, keymap, undoDepth, redoDepth, indentWithTab, openSearchPanel, closeSearchPanel } = CM;

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

    //폭조절 사용여부
    const cm_use_sep_handle_line = window.cm_use_sep_handle_line || false;
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
        "&": { height: "100%" },
        "& .cm-scroller": { overflow: "auto", flex: "1" }
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
            const { from, to } = update.state.selection.main;

            const activeType = findActiveType(ast, from, to);

            updateToolbarButtons(activeType);

            const preview = document.getElementById("sm-editor-preview");
            if (!preview) return;

            if (update.docChanged) {
                preview.innerHTML = html;
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
                    selection: { anchor: pos, head: pos },
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

function handleResize(e) {
    const editor = document.getElementById("sm-editor-raw");
    const preview = document.getElementById("sm-editor-preview");
    if (!editor || !preview) return;

    const container = editor.parentElement;
    const containerRect = container.getBoundingClientRect();

    let newWidth = e.clientX - containerRect.left;

    const minWidth = 368;
    const maxWidth = containerRect.width - 368;

    if (newWidth < minWidth) newWidth = minWidth;
    if (newWidth > maxWidth) newWidth = maxWidth;

    editor.style.flex = `0 0 ${newWidth}px`;
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
        },
        {
            id: "sm-toolbar-code",
            className: "sm_toolbar_btn",
            text: "code",
            title: "코드",
            onClick: () => toggleSyntax("{{{#code #lang=\"javascript\"\n", "\n}}}", "Code")
        },
        {
            id: "sm-toolbar-folder",
            className: "sm_toolbar_btn",
            text: "folder",
            title: "폴드(접을수 있는 영역)",
            onClick: () => toggleSyntax("{{{#fold\n[[여기에 요약 텍스트 입력]]\n[[여기에 내용 입력]]\n", "}}}", "Fold")
        },
        {
            id: "sm-toolbar-list",
            className: " sm_toolbar_btn",
            text: "format_list_numbered",
            title: "리스트",
            type: "dropdown",
            options: [
                { text: "번호 리스트", icon: "format_list_numbered", onClick: () => toggleSyntax("{{{#list #1\n[[항목 1]]\n[[항목 2]]\n[[항목 3]]\n", "}}}", "List") },
                { text: "소문자 abc", icon: "format_list_bulleted", onClick: () => toggleSyntax("{{{#list #a\n[[항목 1]]\n[[항목 2]]\n[[항목 3]]\n", "}}}", "List") },
                { text: "대문자 ABC", icon: "format_list_bulleted", onClick: () => toggleSyntax("{{{#list #A\n[[항목 1]]\n[[항목 2]]\n[[항목 3]]\n", "}}}", "List") },
                { text: "로마숫자 (소문자)", icon: "format_list_bulleted", onClick: () => toggleSyntax("{{{#list #i\n[[항목 1]]\n[[항목 2]]\n[[항목 3]]\n", "}}}", "List") },
                { text: "로마숫자 (대문자)", icon: "format_list_bulleted", onClick: () => toggleSyntax("{{{#list #I\n[[항목 1]]\n[[항목 2]]\n[[항목 3]]\n", "}}}", "List") },
            ]
        },
        {
            id: "sm-separator",
            className: "sm_toolbar_separator"
        },
        {
            id: "sm-toolbar-table",
            className: "sm_toolbar_btn",
            text: "table_chart",
            title: "테이블",
            onClick: () => {
                makingTableModal();
            }
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
                    <h3 style="margin-bottom:20px; border-bottom: 2px solid var(--sm-color-header); padding-bottom: 10px;">Editor Settings</h3>
                    <div style="display:flex; flex-direction:column; gap:5px;">
                        
                        <div class="sm_settings_row">
                            <span class="sm_settings_label">에디터 테마</span>
                            <div class="sm_settings_value">
                                <select id="sm-editor-theme-select" class="sm_settings_select">
                                    <option value="light" ${!document.body.classList.contains('dark') ? 'selected' : ''}>Light Mode</option>
                                    <option value="dark" ${document.body.classList.contains('dark') ? 'selected' : ''}>Dark Mode</option>
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
                    select.addEventListener("change", () => {
                        window.setEditorTheme(select.value);
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
            <div id="tab-manual" class="sm_modal_tab_content active">
                <div style="margin-bottom: 10px;">
                    <div style="margin-bottom: 5px;">
                        <label class="sm_modal_label">행:</label> <input type="number" id="table-rows" value="3" min="1" max="50">
                    </div>
                    <div>
                        <label class="sm_modal_label">열:</label> <input type="number" id="table-cols" value="3" min="1" max="20">
                    </div>
                </div>
                <div id="table-preview"></div>
                <button id="create-table-btn" class="sm_modal_create_btn">테이블 삽입</button>
            </div>

            <!-- 파일 불러오기 탭 (나중에 구현) -->
            <div id="tab-file" class="sm_modal_tab_content">
                <div style="padding: 20px 0; text-align: center;">
                    <p style="opacity: 0.7; margin-bottom: 15px;">CSV 또는 엑셀 파일을 업로드하여 테이블로 변환합니다.</p>
                    <input type="file" id="table-file-input" accept=".csv, .xlsx, .xls" style="display: none;">
                    <button class="sm_modal_create_btn" onclick="document.getElementById('table-file-input').click()">파일 선택</button>
                    <p id="file-name-display" style="margin-top: 10px; font-size: 0.85rem; color: var(--sm-color-header);"></p>
                </div>
                <button id="import-table-btn" class="sm_modal_create_btn" disabled>파일로 생성 (준비중)</button>
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

        const updatePreview = () => {
            const rows = parseInt(rowsInput.value) || 0;
            const cols = parseInt(colsInput.value) || 0;
            preview.innerHTML = "";

            const displayRows = Math.min(rows, 10);
            const displayCols = Math.min(cols, 10);

            for (let i = 0; i < displayRows; i++) {
                const row = document.createElement("div");
                row.className = "table-row-preview";
                for (let j = 0; j < displayCols; j++) {
                    const input = document.createElement("input");
                    input.type = "text";
                    input.className = "table-cell-input";
                    input.value = (i === 0) ? `헤더 ${j + 1}` : "";
                    input.dataset.row = i;
                    input.dataset.col = j;
                    const cell = document.createElement("div");
                    cell.className = "table-cell-preview";
                    cell.appendChild(input);
                    row.appendChild(cell);
                }
                preview.appendChild(row);
            }
            if (rows > 10 || cols > 10) {
                const notice = document.createElement("div");
                notice.style.fontSize = "0.8rem";
                notice.style.marginTop = "5px";
                notice.style.opacity = "0.7";
                notice.textContent = `* 프리뷰는 10x10까지만 표시됩니다. (현재: ${rows}x${cols})`;
                preview.appendChild(notice);
            }
        };

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
                const { from, to } = view.state.selection.main;
                view.dispatch({
                    changes: { from, to, insert: tableText },
                    selection: { anchor: from + tableText.length }
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
                    fileNameDisplay.textContent = `선택된 파일: ${e.target.files[0].name}`;
                    if (excelTypes.includes(e.target.files[0].type)) {
                        // 엑셀일경우 워크시를 선택해야 하므로 워크시트들 가져오기
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const data = e.target.result;
                            const sheetNames = window.get_worksheets(data);
                            //디버깅
                            console.log(sheetNames);
                        }
                    }
                }
            });
        }
    });
}
// 전역에 등록하여 ReferenceError 방지
window.init_codemirror = init_codemirror;