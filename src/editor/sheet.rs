use calamine::{Reader, open_workbook_auto_from_rs};
use std::io::Cursor;

pub fn excel_get_worksheets(data: &[u8]) -> Vec<String> {
    let reader = Cursor::new(data);
    let workbook = open_workbook_auto_from_rs(reader).unwrap();
    workbook
        .sheet_names()
        .iter()
        .map(|s| s.to_string())
        .collect()
}

pub fn excel_open_book(data: &[u8], sheet: &str) -> Vec<Vec<String>> {
    let reader = Cursor::new(data);
    let mut workbook = open_workbook_auto_from_rs(reader).unwrap();
    if let Ok(range) = workbook.worksheet_range(sheet) {
        let mut rows = Vec::new();
        for row in range.rows() {
            let mut row_vec = Vec::new();
            for cell in row {
                row_vec.push(cell.to_string());
            }
            rows.push(row_vec);
        }
        rows
    } else {
        Vec::new()
    }
}

pub fn open_csv(data: &[u8]) -> Vec<Vec<String>> {
    let reader = Cursor::new(data);
    let mut csv_reader = csv::Reader::from_reader(reader);
    let mut rows = Vec::new();
    for result in csv_reader.records() {
        if let Ok(record) = result {
            let row_vec = record.iter().map(|s| s.to_string()).collect();
            rows.push(row_vec);
        }
    }
    rows
}
