use calamine::{Reader, open_workbook_auto_from_rs};
use std::io::Cursor;
pub fn excel_get_worksheets(data: &[u8]) -> Result<Vec<String>, String> {
    let reader = Cursor::new(data);
    let workbook =
        open_workbook_auto_from_rs(reader).map_err(|e| format!("Workbook open error: {}", e))?;
    Ok(workbook.sheet_names().to_vec())
}

pub fn excel_open_book(data: &[u8], sheet: &str) -> Result<Vec<Vec<String>>, String> {
    let reader = Cursor::new(data);
    let mut workbook =
        open_workbook_auto_from_rs(reader).map_err(|e| format!("Workbook open error: {}", e))?;

    let range = workbook
        .worksheet_range(sheet)
        .map_err(|e| format!("Sheet '{}' not found or error: {}", sheet, e))?;

    let rows = range
        .rows()
        .map(|row| row.iter().map(|cell| cell.to_string()).collect())
        .collect();

    Ok(rows)
}
pub fn open_csv(data: &[u8]) -> Result<Vec<Vec<String>>, String> {
    let reader = Cursor::new(data);
    let mut csv_reader = csv::Reader::from_reader(reader);
    let mut rows = Vec::new();

    for (i, result) in csv_reader.records().enumerate() {
        let record = result.map_err(|e| format!("CSV line {} error: {}", i + 1, e))?;
        rows.push(record.iter().map(|s| s.to_string()).collect());
    }

    Ok(rows)
}
