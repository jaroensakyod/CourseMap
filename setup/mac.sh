#!/bin/bash
# CourseMap — ตัวติดตั้งสำหรับ macOS (Apple Silicon หรือ Intel)
# รันจากโฟลเดอร์ที่ clone มา:  bash setup/mac.sh
# (หรือบอก Claude ในโฟลเดอร์นี้ว่า "ติดตั้งให้หน่อย")
#
# ลง Xcode Command Line Tools, Homebrew, git, Node.js, ffmpeg → npm install → .env → เลือกโหมดเรนเดอร์ → ภาพทดสอบ
# → คลังเสียง → ข้อมูลแผนที่ → Whisper → ตรวจเครื่อง. รันซ้ำได้ ไม่ลบงานเดิม. SKIP_WHISPER=1 / SKIP_DATA=1 ข้ามส่วนที่โหลดนาน

PROJECT="$(cd "$(dirname "$0")/.." && pwd)"
step() { printf '\n\033[36m==> %s\033[0m\n' "$1"; }
ok() { printf '    \033[32mOK\033[0m  %s\n' "$1"; }
warn() { printf '    \033[33m!!\033[0m  %s\n' "$1"; }
has() { command -v "$1" >/dev/null 2>&1; }
brew_env() { for b in /opt/homebrew/bin/brew /usr/local/bin/brew; do [ -x "$b" ] && eval "$("$b" shellenv)" && return; done; }

echo "โฟลเดอร์งาน: $PROJECT"
case "$PROJECT" in *" "*) warn "ชื่อโฟลเดอร์มีเว้นวรรค — แนะนำย้ายไป ~/maps/CourseMap แล้วรันใหม่";; esac

step "1/9 ลง Xcode Command Line Tools"
if xcode-select -p >/dev/null 2>&1; then ok "มีแล้ว"
else
  xcode-select --install
  echo "    มีหน้าต่างเด้งขึ้นมา ให้กด Install แล้วรอจนเสร็จ (5-15 นาที)"
  until xcode-select -p >/dev/null 2>&1; do sleep 10; done
  ok "ลงแล้ว"
fi

step "2/9 ลง Homebrew, git, Node.js, ffmpeg"
brew_env
if ! has brew; then
  echo "    กำลังลง Homebrew — จะถามรหัสผ่านเครื่อง Mac (พิมพ์แล้วไม่ขึ้นตัวอักษร เป็นเรื่องปกติ) แล้วกด Enter"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  brew_env
  has brew || { warn "ลง Homebrew ไม่สำเร็จ — ส่งภาพหน้าจอนี้ให้ครู"; exit 1; }
  grep -q 'brew shellenv' "$HOME/.zprofile" 2>/dev/null || echo "eval \"\$($(command -v brew) shellenv)\"" >> "$HOME/.zprofile"
fi
ok "Homebrew พร้อม"
for pkg in git node ffmpeg; do
  if has "$pkg"; then ok "$pkg มีแล้ว"; else echo "    กำลังลง $pkg ..."; brew install "$pkg" && ok "$pkg ลงแล้ว" || { warn "ลง $pkg ไม่สำเร็จ"; exit 1; }; fi
done
major=$(node -v | sed -E 's/^v([0-9]+).*/\1/')
[ "$major" -ge 18 ] || { warn "Node $(node -v) เก่าเกินไป — รัน: brew upgrade node"; exit 1; }

cd "$PROJECT" || exit 1
step "3/9 npm install (ครั้งแรก 2-5 นาที)"
npm install --no-audit --no-fund || { warn "npm install ไม่ผ่าน — ส่งภาพหน้าจอนี้ให้ครู"; exit 1; }
ok "ลงแพ็กเกจแล้ว"
node scripts/sb-sync.mjs >/dev/null

step "4/9 ไฟล์ .env (ที่ใส่ Gemini API key)"
if [ -f .env ]; then ok "มี .env แล้ว (ไม่ทับ)"; else cp .env.example .env; ok "สร้าง .env แล้ว"; fi

step "5/9 เลือกโหมดเรนเดอร์ (Mac ใช้ angle → Metal)"
echo "    ชิป: $(sysctl -n machdep.cpu.brand_string 2>/dev/null)"
chosen=""
for gl in angle swangle; do
  echo "    ลองโหมด $gl ... (ครั้งแรกจะโหลด Chrome สำหรับเรนเดอร์ก่อน)"
  start=$(date +%s)
  if npx remotion render MapTest out/gl-test.mp4 --frames=0-29 --gl=$gl --log=error >/dev/null 2>&1; then
    chosen=$gl; ok "$gl ใช้ได้ ($(( $(date +%s) - start )) วินาที)"; break
  fi
  warn "$gl ใช้ไม่ได้บนเครื่องนี้"
done
if [ -n "$chosen" ]; then sed -i '' -E "s/setChromiumOpenGlRenderer\(\"[a-z]+\"\)/setChromiumOpenGlRenderer(\"$chosen\")/" remotion.config.ts
else sed -i '' '/setChromiumOpenGlRenderer/d' remotion.config.ts; warn "ใช้โหมดพื้นฐาน (ช้ากว่าแต่ใช้ได้)"; fi
rm -f out/gl-test.mp4
# Final renders in this course pass --gl angle (house standard); on Mac angle is the Metal path anyway.

step "6/9 เรนเดอร์ภาพทดสอบ"
if npx remotion still MapTest out/test.png --frame=140 --log=error >/dev/null 2>&1; then ok "ได้ภาพ $PROJECT/out/test.png"
else warn "เรนเดอร์ไม่ผ่าน — บอก Claude ว่า \"เรนเดอร์ MapTest ไม่ผ่าน ช่วยแก้\""; fi

step "7/9 เสียงประกอบ (เสียง UI + คลังเสียงจริง Mixkit/Pixabay)"
node scripts/sfx.mjs >/dev/null
node scripts/sfx-lib.mjs && ok "คลังเสียงพร้อม" || warn "บางเสียงโหลดไม่ได้ — รัน npm run sfx-lib ซ้ำทีหลังได้"

step "8/9 ข้อมูลแผนที่ + Whisper (โหลดนานที่สุด)"
if [ -n "$SKIP_DATA" ]; then warn "ข้ามข้อมูลแผนที่ (SKIP_DATA) — รัน npm run setup:data ทีหลัง"; else node setup/data.mjs; fi
if [ -n "$SKIP_WHISPER" ]; then warn "ข้าม Whisper (SKIP_WHISPER) — รัน npm run setup:whisper ทีหลัง"
else node setup/whisper.mjs && ok "Whisper พร้อม" || warn "ลง Whisper ไม่สำเร็จ — รัน npm run setup:whisper ซ้ำ"; fi

step "9/9 ตรวจเครื่อง"
node setup/doctor.mjs

if ! grep -Eq '^[[:space:]]*GEMINI_API_KEY[[:space:]]*=[[:space:]]*[^[:space:]]{20,}' .env; then
  echo ""
  echo "    เปิด .env ใน TextEdit — วาง key ต่อจาก GEMINI_API_KEY= แล้วกด Cmd+S (ขอ key ฟรี: https://aistudio.google.com/apikey)"
  open -e "$PROJECT/.env"
fi
printf '\n\033[32m==================== เสร็จแล้ว ====================\033[0m\n'
echo " ต่อไป: ใส่ key ใน .env → บอก Claude ว่า \"ทดลองทำคลิปตัวอย่าง\" (npm run demo)"
echo "==================================================="
