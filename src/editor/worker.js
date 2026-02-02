import init, { excel_get_worksheets, excel_open_book, open_csv, } from '../../../../sm_bridge.js';

export function worker_dummy() { }

let isInitialized = false;

self.onmessage = async (e) => {
    const { id, type, payload } = e.data;

    try {
        if (!isInitialized) {
            await init();
            isInitialized = true;
        }

        let result;

        switch (type) {
            case 'GET_SHEETS':
                result = excel_get_worksheets(payload.data);
                break;
            case 'OPEN_EXCEL':
                result = excel_open_book(payload.data, payload.sheetName);
                break;
            case 'OPEN_CSV':
                result = open_csv(payload.data);
                break;
            case 'SM_ENGINE':
            //TODO: 세븐마크 엔진 워커지원 추가 (대용량 문서 처리시 브라우저 멈춤 방지)
            //TODO: 함수명: sm_renderer()
            default:
                throw new Error(`Unknown command: ${type}`);
        }

        self.postMessage({ id, status: 'success', result });

    } catch (err) {
        self.postMessage({ id, status: 'error', error: err.toString() });
    }
};