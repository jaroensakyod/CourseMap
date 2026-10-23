// One command per stage of a storyboard episode (no Claude tokens are spent by any of these):
//   node scripts/episode.mjs <slug>            check + draft timing + ONE contact sheet (no voice yet) — cheap preview
//   node scripts/episode.mjs <slug> --voice    Gemini TTS (batch) → Whisper align → snap → check → contact sheet
//   node scripts/episode.mjs <slug> --render   final render (render:chunks, resumable) → glitch check → −14 LUFS → .srt
// npm run episode -- <slug> [--voice | --render]
import "./env.mjs";
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { voice: { type: "boolean" }, render: { type: "boolean" }, every: { type: "string", default: "90" } } });
const [slug] = positionals;
if (!slug) throw new Error("usage: node scripts/episode.mjs <channel/episode> [--voice | --render]");
const id = "SB-" + slug.replace(/[^A-Za-z0-9]+/g, "-");
const flat = slug.replace(/[\\/]/g, "-");
const run = (msg, cmd, args, env = {}) => {
  console.log(`\n==> ${msg}`);
  execFileSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env }, shell: process.platform === "win32" });
};

if (values.render) {
  run("ตรวจ storyboard", "node", ["scripts/sb-check.mjs", slug]);
  run(`เรนเดอร์ ${id} (ล่มได้ — รันคำสั่งเดิมซ้ำจะต่อจากที่ค้าง)`, "node", ["scripts/render-chunks.mjs", id, `out/${flat}.mp4`, "--gl", "angle", "--loudness", "--glitch"]);
  run("ซับ .srt", "node", ["scripts/srt.mjs", slug, "--lead", "3", "--gap", "16"]);
  console.log(`\nเสร็จ → out/${flat}.mp4 · out/${slug}.srt`);
  process.exit(0);
}
if (values.voice) {
  if (!process.env.GEMINI_API_KEY) throw new Error("ไม่มี GEMINI_API_KEY ใน .env");
  run("พากย์เสียง (Gemini TTS แบบชุด)", "node", ["scripts/tts-gemini.mjs", slug, "Charon", "gemini-3.8-flash-lite-tts"], { BATCH: "1" });
  run("จับเวลารายคำ (Whisper)", "node", ["scripts/align.mjs", slug]);
  run("ขยับเวลาคำ", "node", ["scripts/snap-words.mjs", slug]);
}
run("ลงทะเบียนตอน", "node", ["scripts/sb-sync.mjs"]);
run("ตรวจ storyboard", "node", ["scripts/sb-check.mjs", slug]);
run("ภาพรวมทั้งตอน 1 แผ่น", "node", ["scripts/sheet.mjs", id, "--every", values.every, "--cols", "10", "--out", `out/${flat}-sheet.jpg`]);
console.log(`\nดูภาพรวม: out/${flat}-sheet.jpg${values.voice ? "" : "  (เวลายังเป็นแบบร่าง — พากย์จริงด้วย --voice)"}`);
