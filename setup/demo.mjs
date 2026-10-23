// ทดลองทั้งสายการผลิตครั้งแรก: พากย์เสียง EP.5 ด้วย Gemini → จับเวลาคำ → เรนเดอร์ 30 วินาทีแรก → out/demo.mp4
// ต้องมี GEMINI_API_KEY ใน .env · ใช้ Gemini TTS ~8 ครั้ง (โควตาฟรีพอ) · ใช้เวลา ~10–20 นาทีตามเครื่อง
// Usage: node setup/demo.mjs        (npm run demo)
import "../scripts/env.mjs";
import { execFileSync } from "node:child_process";

if (!process.env.GEMINI_API_KEY) {
  console.log("ยังไม่มี GEMINI_API_KEY ใน .env — เปิดไฟล์ .env วาง key แล้ว Save ก่อน (ขอที่ https://aistudio.google.com/apikey)");
  process.exit(1);
}
const step = (msg, cmd, args, env = {}) => {
  console.log(`\n==> ${msg}`);
  execFileSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env }, shell: process.platform === "win32" });
};
const slug = "thaihistory/ep05";
step("1/4 พากย์เสียงด้วย Gemini TTS (ส่งเป็นชุด ประหยัดโควตา)", "node", ["scripts/tts-gemini.mjs", slug, "Charon", "gemini-3.8-flash-lite-tts"], { BATCH: "1" });
step("2/4 จับเวลารายคำด้วย Whisper", "node", ["scripts/align.mjs", slug]);
step("3/4 ขยับเวลาคำให้ตรงจังหวะพูด", "node", ["scripts/snap-words.mjs", slug]);
step("4/4 เรนเดอร์ 30 วินาทีแรก (Ep05Demo)", "npx", ["remotion", "render", "Ep05Demo", "out/demo.mp4"]);
console.log("\nเสร็จแล้ว → เปิดดู out/demo.mp4");
