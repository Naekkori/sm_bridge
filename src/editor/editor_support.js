import { EditorView, basicSetup } from "https://esm.sh/codemirror";
import { EditorState, StateField, StateEffect } from "https://esm.sh/@codemirror/state";
import { Decoration } from "https://esm.sh/@codemirror/view";
import { sm_renderer, cm_highlighter } from "./sm_bridge.js";

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

export function init_codemirror(parent, initialDoc = "") {
    const fixedHeightEditor = EditorView.theme({
        "&": { height: "100%" },
        "& .cm-scroller": { overflow: "auto" }
    });

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
                fixedHeightEditor,
                smHighlightField
            ]
        }),
        parent: parent
    });

    return view;
}

window.init_codemirror = init_codemirror;
