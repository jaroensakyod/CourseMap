// ตรวจว่าเครื่องพร้อมทำคลิปไหม — แสดงผลทีละข้อ ✓ / ✗ พร้อมวิธีแก้ ไม่แก้อะไรเอง และไม่แสดง API key
// Usage: node setup/doctor.mjs      (npm run doctor)
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statfsSync } from "node:fs";

const rows = [];
const check = (ok, label, fix) => rows.push([ok, label, fix]);
const run = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], shell: process.platform === "win32" }).trim();
  } catch {
    return "";
  }
};

const node = Number(process.versions.node.split(".")[0]);
check(node >= 18, `Node.js ${process.versions.node}`, "ลง Node.js LTS ใหม่ (สั่ง Claude: ติดตั้งให้หน่อย)");
const ff = run("ffmpeg", ["-version"]).split("\n")[0];
check(!!ff, ff ? ff.slice(0, 40) : "ffmpeg", "ลง ffmpeg (สั่ง Claude: ติดตั้งให้หน่อย)");
check(existsSync("node_modules/remotion"), "แพ็กเกจ Remotion (npm install)", "รัน: npm install");

const env = existsSync(".env") ? readFileSync(".env", "utf8") : "";
const key = (env.match(/^\s*GEMINI_API_KEY\s*=\s*(\S+)/m) ?? [])[1];
check(existsSync(".env"), "ไฟล์ .env", "คัดลอก .env.example เป็น .env");
check(!!key && key.length > 20, "Gemini API key ใน .env", "เปิด .env วาง key ต่อจาก GEMINI_API_KEY= แล้ว Save (ขอที่ https://aistudio.google.com/apikey)");

const raster = existsSync("public/raster") ? readdirSync("public/raster") : [];
check(["world.jpg", "sea2.jpg"].every((f) => raster.includes(f)), "ภาพดาวเทียมพื้นฐาน", "รัน: npm run setup:data");
const lib = existsSync("public/sfx/lib") ? readdirSync("public/sfx/lib").filter((f) => f.endsWith(".mp3")).length : 0;
check(lib >= 40, `คลังเสียงจริง (${lib} เสียง)`, "รัน: npm run sfx-lib");
check(existsSync("public/sfx/pop.wav"), "เสียง UI สังเคราะห์", "รัน: npm run sfx");
const model = (env.match(/^\s*WHISPER_MODEL\s*=\s*(\S+)/m) ?? [])[1] ?? "large-v3";
check(existsSync(`whisper.cpp/ggml-${model}.bin`), `Whisper โมเดล ${model} (จับเวลาคำพูด)`, "รัน: npm run setup:whisper");
check(existsSync("out/test.png"), "ภาพทดสอบ out/test.png", "รัน: npx remotion still MapTest out/test.png --frame=140");
try {
  const fs = statfsSync(".");
  const gb = (fs.bavail * fs.bsize) / 1e9;
  check(gb > 8, `พื้นที่ว่าง ${gb.toFixed(0)} GB`, "ควรว่างอย่างน้อย 8 GB (คลิป 10 นาที ~1 GB + ไฟล์ชั่วคราว)");
} catch {}
const cwd = process.cwd();
check(cwd.length < 40 && !/[^\x00-\x7F]/.test(cwd), `ตำแหน่งโฟลเดอร์ ${cwd}`, "ย้ายไป path สั้น ไม่มีภาษาไทย เช่น C:\\maps\\CourseMap หรือ ~/maps/CourseMap");

console.log("\nตรวจเครื่อง Map Studio\n");
for (const [ok, label, fix] of rows) console.log(`  ${ok ? "✓" : "✗"}  ${label}${ok ? "" : `\n       → ${fix}`}`);
const bad = rows.filter(([ok]) => !ok).length;
console.log(bad ? `\nยังขาด ${bad} ข้อ — บอก Claude ว่า "ติดตั้งให้หน่อย" หรือทำตามลูกศรด้านบน` : "\nพร้อมทำคลิปแล้ว 🎬");
process.exit(bad ? 1 : 0);
