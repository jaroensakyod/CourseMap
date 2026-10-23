// โหลดข้อมูลแผนที่ที่ตัวอย่างในคอร์สใช้ (ไม่เก็บใน git เพราะไฟล์ใหญ่) — รันซ้ำได้ ข้ามไฟล์ที่มีแล้ว
// Usage: node setup/data.mjs        (npm run setup:data)
// ภาพดาวเทียม NASA Blue Marble / NASA HLS (สาธารณสมบัติ) · แม่น้ำ Natural Earth · OpenStreetMap (ODbL)
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const jobs = [
  // [ไฟล์ที่ได้, คำอธิบาย, คำสั่ง node, ตัวแปรแวดล้อมเพิ่ม]
  ["public/raster/world.jpg", "ภาพดาวเทียมทั้งโลก (Blue Marble)", ["scripts/fetch-imagery.mjs", "bluemarble", "world"]],
  ["public/raster/sea.jpg", "อุษาคเนย์ (Blue Marble)", ["scripts/fetch-imagery.mjs", "bluemarble", "sea", "88", "2", "112", "28", "7500"]],
  ["public/raster/sea2.jpg", "อุษาคเนย์ถึงชวา (Blue Marble)", ["scripts/fetch-imagery.mjs", "bluemarble", "sea2", "88", "-8", "112", "28", "5400"]],
  ["public/raster/mouthhls.jpg", "ปากน้ำเจ้าพระยา ภาพ 30 ม. (NASA HLS)", ["scripts/fetch-imagery.mjs", "hls", "mouthhls", "100.44", "13.36", "100.70", "13.80", "2400"], { TIME: "2025-01-20" }],
  ["public/data/searivers.json", "แม่น้ำสายหลักอุษาคเนย์ (Natural Earth)", ["scripts/fetch-rivers.mjs", "searivers", "88", "-2", "112", "28"]],
  ["public/data/th-central.geojson", "แม่น้ำภาคกลาง (OpenStreetMap)", ["scripts/fetch-osm.mjs", "th-central", "99.4", "13.4", "101.6", "15.6", "bigrivers"]],
  ["public/data/th-ayut-island.geojson", "เกาะเมืองอยุธยา (OpenStreetMap)", ["scripts/fetch-osm.mjs", "th-ayut-island", "100.50", "14.30", "100.64", "14.42", "rivers"]],
  ["public/data/th-plain.json", "รวมแม่น้ำภาคกลางเป็นไฟล์เล็ก", ["src/episodes/thaihistory/th-rivers.mjs"]],
];

let failed = 0;
for (const [file, label, args, env] of jobs) {
  if (existsSync(file)) {
    console.log(`  OK  มีแล้ว: ${label}`);
    continue;
  }
  console.log(`  ..  กำลังโหลด: ${label}`);
  const r = spawnSync("node", args, { stdio: "inherit", env: { ...process.env, ...env } });
  if (r.status === 0 && existsSync(file)) console.log(`  OK  ${label}`);
  else {
    failed++;
    console.log(`  !!  โหลดไม่สำเร็จ: ${label} — รัน npm run setup:data ซ้ำทีหลังได้`);
  }
}
console.log(failed ? `\nข้อมูลขาด ${failed} ชุด (ส่วนอื่นใช้ได้ปกติ)` : "\nข้อมูลแผนที่ครบแล้ว");
process.exit(failed ? 1 : 0);
