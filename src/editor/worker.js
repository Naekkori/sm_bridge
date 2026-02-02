import init, { excel_get_worksheets, excel_open_book, open_csv } from '../../../../sm_bridge.js';

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
            default:
                throw new Error(`Unknown command: ${type}`);
        }

        self.postMessage({ id, status: 'success', result });

    } catch (err) {
        self.postMessage({ id, status: 'error', error: err.toString() });
    }
};