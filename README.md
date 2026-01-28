# SM Bridge

**SM Bridge**는 강력한 **SevenMark** 마크다운 엔진을 웹 환경에서 사용할 수 있도록 연결하는 현대적인 **WebAssembly (WASM)** 브릿지입니다. 
<br> 
Rust의 강력한 성능과 안전성을 바탕으로, 웹 브라우저에서도 초고속 렌더링과 WYSIWYG 에디팅 경험을 제공합니다.

---

## 주요 기능 (Key Features)

### 초고속 렌더링 (High-Performance Rendering)
- **Rust 기반**: `sevenmark-parser`와 `sevenmark-html`을 통해 순수 Rust로 작성된 파싱 및 렌더링 로직을 WASM으로 컴파일하여 실행합니다.
- **SevenMark 지원**: 표준 마크다운을 넘어선 SevenMark 만의 독자적인 문법과 확장을 완벽하게 지원합니다.

### 차세대 에디터 통합 (Next-Gen Editor Integration)
- **CodeMirror 지원**: `sevenmark-transform`을 통해 AST(구문 트리)를 CodeMirror가 이해할 수 있는 포맷으로 실시간 변환하여, 강력한 **신택스 하이라이팅(Syntax Highlighting)** 및 **구문 분석** 기능을 제공합니다.
- **스마트 인젝션**: `sm_editor_injecter`를 통해 기존 웹 페이지의 DOM 요소에 즉시 에디터를 주입(Inject)하여 사용할 수 있습니다.

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

# 프로덕션 빌드
wasm-pack build --target web --release
```

---

## 사용 예제 (Usage)

JavaScript/TypeScript 환경에서 다음과 같이 사용할 수 있습니다.

```javascript
import init, { sm_renderer, sm_editor_injecter } from './pkg/sm_bridge.js';

async function run() {
    await init();

    // 1. 마크다운 렌더링
    const markdown = "# Hello SevenMark!";
    const html = sm_renderer(markdown);
    console.log(html); // <h1>Hello SevenMark!</h1>

    // 2. 에디터 주입
    sm_editor_injecter("#editor-container");
}

run();
```

---

## 프로젝트 구조 (Project Structure)

```
sm_bridge/
├── crates/
│   ├── sevenmark-parser    #  파서 코어
│   ├── sevenmark-html      #  HTML 렌더러
│   └── sevenmark-transform #  데이터 변환기
├── src/
│   ├── lib.rs              #  WASM 엔트리포인트
│   └── editor/             #  에디터 관련 로직
└── Cargo.toml              #  의존성 및 워크스페이스 설정
```

---

<div align="center">
Powered by <a href="https://github.com/sevenwiki/sevenmark">SevenMark</a></sub>
</div>