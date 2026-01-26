use sevenmark_parser::core::parse_document;
use std::fs;
use std::time::Instant;

fn benchmark_parse(content: &str, iterations: u32) -> (f64, usize) {
    let document_len = content.len();

    // Warmup
    for _ in 0..3 {
        let _ = parse_document(content);
    }

    // Benchmark
    let start_time = Instant::now();
    let mut element_count = 0;
    for _ in 0..iterations {
        let result = parse_document(content);
        element_count = result.len();
    }
    let duration = start_time.elapsed();

    let avg_duration_ms = duration.as_secs_f64() * 1000.0 / iterations as f64;
    let throughput_kb_s = (document_len as f64 / 1024.0) / (avg_duration_ms / 1000.0);

    println!("Input: {} bytes", document_len);
    println!(
        "Parsed {} elements in {:.3} ms (avg)",
        element_count, avg_duration_ms
    );
    println!(
        "Total time for {} iterations: {:.3} s",
        iterations,
        duration.as_secs_f64()
    );
    println!();
    println!("Performance: {:.2} KB/s", throughput_kb_s);

    (throughput_kb_s, element_count)
}

fn main() {
    let input_content = fs::read_to_string("ToParse.txt").expect("ToParse.txt file not found");

    println!("{}", "=".repeat(60));
    println!("SevenMark Parser Benchmark");
    println!("{}", "=".repeat(60));

    let _ = benchmark_parse(&input_content, 100);

    println!("{}", "=".repeat(60));

    // 10x content size test
    println!();
    println!("Testing with 10x content size...");
    let large_content = input_content.repeat(10);
    let _ = benchmark_parse(&large_content, 10);
}
