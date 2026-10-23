// ทดลองทั้งสายการผลิตครั้งแรก: พากย์ 4 ประโยคแรกของ EP.5 ด้วย Gemini → จับเวลาคำ → เรนเดอร์ช่วงเปิด ~27 วิ → out/demo.mp4
// ต้องมี GEMINI_API_KEY ใน .env · ใช้ Gemini TTS 1 ครั้ง · ใช้เวลา ~3–10 นาทีตามเครื่อง (Whisper แบบ CPU ก็ไหว)
// พากย์เฉพาะช่วงที่เรนเดอร์ (slug thaihistory/ep05demo) แล้วรวมเวลาคำกลับเข้า ep05/timing.json — ไม่เปลืองโควตาทั้งตอน
// Usage: node setup/demo.mjs        (npm run demo)
import "../scripts/env.mjs";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

if (!process.env.GEMINI_API_KEY) {
  console.log("ยังไม่มี GEMINI_API_KEY ใน .env — เปิดไฟล์ .env วาง key แล้ว Save ก่อน (ขอที่ https://aistudio.google.com/apikey)");
  process.exit(1);
}
const step = (msg, cmd, args, env = {}) => {
  console.log(`\n==> ${msg}`);
  execFileSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env }, shell: process.platform === "win32" });
};
const demo = "thaihistory/ep05demo";
step("1/5 พากย์ 4 ประโยคเปิดด้วย Gemini TTS", "node", ["scripts/tts-gemini.mjs", demo, "Charon", "gemini-3.8-flash-lite-tts"], { BATCH: "1" });
step("2/5 จับเวลารายคำด้วย Whisper", "node", ["scripts/align.mjs", demo]);
step("3/5 ขยับเวลาคำให้ตรงจังหวะพูด", "node", ["scripts/snap-words.mjs", demo]);

console.log("\n==> 4/5 รวมเวลาคำเข้า EP.5");
const full = "src/episodes/thaihistory/ep05/timing.json";
const fresh = new Map(JSON.parse(readFileSync(`src/episodes/${demo}/timing.json`, "utf8")).map((b) => [b.id, b]));
const merged = JSON.parse(readFileSync(full, "utf8")).map((b) => fresh.get(b.id) ?? b);
writeFileSync(full, JSON.stringify(merged, null, 2) + "\n");
console.log(`    แทน ${fresh.size} ช่วงแรกด้วยเสียงใหม่ของคุณ`);

step("5/5 เรนเดอร์ช่วงเปิด (Ep05Demo)", "npx", ["remotion", "render", "Ep05Demo", "out/demo.mp4"]);
console.log("\nเสร็จแล้ว → เปิดดู out/demo.mp4 · ทั้งตอน: npm run tts -- thaihistory/ep05 แล้ว render:chunks Ep05Clear");
