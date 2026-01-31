# SM Bridge

**SM Bridge**는 강력한 **SevenMark** 마크다운 엔진을 웹 환경에서 사용할 수 있도록 연결하는 현대적인 **WebAssembly (WASM)** 브릿지입니다. 
<br> 
Rust의 강력한 성능과 안전성을 바탕으로, 웹 브라우저에서도 초고속 렌더링과 WYSIWYG 에디팅 경험을 제공하며, 엑셀 및 CSV 데이터 처리 기능도 통합되어 있습니다.

---

## 주요 기능 (Key Features)

### 초고속 렌더링 (High-Performance Rendering)
- **Rust 기반**: `sevenmark-parser`와 `sevenmark-html`을 통해 순수 Rust로 작성된 파싱 및 렌더링 로직을 WASM으로 컴파일하여 실행합니다.
- **SevenMark 지원**: 표준 마크다운을 넘어선 SevenMark 만의 독자적인 문법과 확장을 완벽하게 지원합니다.

### 차세대 에디터 통합 (Next-Gen Editor Integration)
- **CodeMirror 지원**: AST(구문 트리)를 CodeMirror가 이해할 수 있는 포맷으로 실시간 변환하여, 강력한 **신택스 하이라이팅(Syntax Highlighting)** 및 **구문 분석** 기능을 제공합니다.
- **스마트 인젝션**: `sm_editor_injecter`를 통해 기존 웹 페이지의 DOM 요소에 즉시 에디터를 주입(Inject)하여 사용할 수 있습니다.

### 데이터 처리 (Data Processing Extension)
- **엑셀(Excel) 처리**: `calamine` 엔진을 통합하여 브라우저 환경에서 `.xlsx`, `.xls` 등 엑셀 파일을 즉시 파싱하고 데이터를 추출합니다.
- **CSV 처리**: 대용량 CSV 파일을 고속으로 읽어 2차원 배열 형태로 변환합니다.

---

## 📦 설치 및 빌드 (Installation & Build)

이 프로젝트는 Rust와 `wasm-pack`을 사용하여 빌드됩니다.

### 요구 사항
- Rust (Latest Stable)
- wasm-pack

### 빌드 명령어

```bash
# 개발용 빌드 (Web 타겟)
wasm-pack build --target web --dev

# 프로덕션 빌드 (build.bat 사용 권장)
./build.bat
# Linux/MacOS
./build.sh
```

---

## 사용 예제 (Usage)

JavaScript/TypeScript 환경에서 다음과 같이 자동화된 방식으로 전역에 등록하여 사용할 수 있습니다.

```javascript
import init, * as sm_bridge from './pkg/sm_bridge.js';

async function run() {
    await init();

    // 1. WASM 함수를 window 객체에 자동 등록 (권장 패턴)
    // sm_renderer, sm_editor_injecter 등이 모두 window에 등록됩니다.
    Object.entries(sm_bridge).forEach(([key, value]) => {
        if (key !== "default") window[key] = value;
    });

    // 2. 세븐마크 렌더링 사용
    const markdown = "# Hello SevenMark!\nThis is a rendering engine.";
    const html = sm_renderer(markdown);
    document.getElementById("preview").innerHTML = html;
    
    // 3. 에디터 주입 (WYSIWYG 및 하이라이팅 지원)
    // 특정 컨테이너에 CodeMirror 기반 SevenMark 에디터를 생성합니다.
    sm_editor_injecter("editor-container");
}

run();
```

### 주요 API (Global Functions)
| 함수명 | 설명 | 반환 타입 |
| :--- | :--- | :--- |
| `sm_renderer(raw)` | SevenMark 마크다운을 HTML로 변환 | `String` |
| `sm_editor_injecter(container_id, height?)` | 지정된 요소에 에디터 주입 | `void` |
| `cm_highlighter(raw)` | 에디터용 신택스 하이라이팅 데이터(JSON) 추출 | `String (JSON)` |
| `get_crate_info()` | 현재 브릿지 모듈의 메타데이터 정보 반환 | `String (JSON)` |
| `excel_get_worksheets(data)` | 엑셀 파일의 워크시트 이름 추출 (내부 유틸리티) | `String[]` |
| `excel_open_book(data, sheet)` | 특정 시트 데이터를 추출 (내부 유틸리티) | `String (JSON)` |
| `open_csv(data)` | CSV 데이터를 배열로 추출 (내부 유틸리티) | `String (JSON)` |

---

## 프로젝트 구조 (Project Structure)

```
sm_bridge/
├── src/
│   ├── lib.rs              # WASM 엔트리포인트 및 export 인터페이스
│   ├── editor/             # 에디터 인젝터 및 지원 모듈
│   └── editor/sheet.rs     # 엑셀/CSV 데이터 처리 로직
├── template/               # 에디터 구동을 위한 HTML/CSS/JS 템플릿
└── Cargo.toml              # 의존성 및 WASM 설정
```

---

<div align="center">
Powered by <a href="https://github.com/sevenwiki/sevenmark">SevenMark</a></sub>
</div>
