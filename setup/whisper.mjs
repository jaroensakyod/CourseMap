// เตรียม Whisper (ตัวจับเวลาคำพูดให้ซับตรงปาก) ล่วงหน้า: ลง whisper.cpp + โหลดโมเดลตาม WHISPER_MODEL ใน .env
// ครั้งแรกโหลด ~1.5 GB (medium) — ทำตอนติดตั้ง จะได้ไม่ต้องรอตอนทำคลิปแรก
// Usage: node setup/whisper.mjs      (npm run setup:whisper)
import "../scripts/env.mjs";
import { downloadWhisperModel, installWhisperCpp } from "@remotion/install-whisper-cpp";

const model = process.env.WHISPER_MODEL ?? "medium";
const to = process.env.WHISPER_DIR ?? "whisper.cpp";
const version = process.env.WHISPER_VERSION ?? "1.5.5";
console.log(`ลง whisper.cpp ${version} → ${to}`);
await installWhisperCpp({ to, version, printOutput: false });
console.log(`โหลดโมเดล ${model} (ครั้งแรกนานหน่อย)`);
await downloadWhisperModel({ model, folder: to, printOutput: true });
console.log("Whisper พร้อมแล้ว");
