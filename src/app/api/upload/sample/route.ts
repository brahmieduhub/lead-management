import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const data = [
      ["NANOmyclassroom"],
      ["JR JUNE-MAINS-T-08-  OFFLINE RESULTS-01-08-2026-MAX-300M (STREAM -2)"],
      ["SNO", "ID", "STUDENT NAME", "MOBILE NO-1", "PHY", "CHE", "MAT", "TOT", "%", "RANK"],
      [1, 37601, "MOHAMMED AYAAZ KHAN", 8310684033, 56, 69, 60, 185, 61.67, 1],
      [2, 35658, "CHALLA AKSHAYA SPHOORTHI", 9849439535, 45, 66, 63, 174, 58.00, 2],
      [3, 37299, "MOHAMMED ALI YASEEN", 9885036366, 55, 65, 53, 173, 57.67, 3],
      [4, 38102, "K SAI PRANAV", 9440123456, 58, 62, 51, 171, 57.00, 4],
      [5, 36491, "V ANANYA REDDY", 9700987654, 52, 60, 54, 166, 55.33, 5],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Merge banner rows across all 10 columns for polished Excel presentation
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
    ];

    // Set column widths
    ws["!cols"] = [
      { wch: 6 },  // SNO
      { wch: 10 }, // ID
      { wch: 28 }, // STUDENT NAME
      { wch: 15 }, // MOBILE NO-1
      { wch: 8 },  // PHY
      { wch: 8 },  // CHE
      { wch: 8 },  // MAT
      { wch: 8 },  // TOT
      { wch: 10 }, // %
      { wch: 8 },  // RANK
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Offline Results");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="nanomyclassroom_results_sample.xlsx"',
      },
    });
  } catch (e) {
    console.error("Failed to generate sample xlsx:", e);
    return NextResponse.json({ error: "Failed to generate sample template" }, { status: 500 });
  }
}
