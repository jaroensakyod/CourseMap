# CourseMap — instructions for Claude

This folder is a student's map-video studio (Remotion + open map data), cloned from
https://github.com/jaroensakyod/CourseMap. The student is a beginner on the **Claude Pro plan**. Talk **Thai**, short
sentences, say in one line what each step does before running it, and show results (stills, clip paths) rather than
code.

## 1. When the student says "ติดตั้ง" / "ติดตั้งให้หน่อย" / "install" / "เช็กเครื่อง"

1. Run `node setup/doctor.mjs` if Node exists (otherwise go to step 2). If everything is ✓, say the machine is ready
   and offer `npm run demo`.
2. Check the folder path: Windows must be short and ASCII (e.g. `C:\maps\CourseMap`), Mac without spaces
   (e.g. `~/maps/CourseMap`). If not, explain why and ask them to move the folder (or re-clone there) first.
3. Read the machine and pick settings (see "Fit the tools to this computer" below), then run the installer for their
   OS **as a background command** (it takes 15–40 min; the work is downloads):
   - **Windows:** `powershell -NoProfile -ExecutionPolicy Bypass -File setup\windows.ps1`
     If `winget` is missing: ask them to update "App Installer" in Microsoft Store, then run again.
     winget may open a UAC prompt — tell them to click **Yes**.
   - **Mac:** first check `xcode-select -p` and `command -v brew` (also `/opt/homebrew/bin/brew`). If Command Line
     Tools are missing, run `xcode-select --install` and tell them to click Install in the pop-up. If Homebrew is
     missing it needs their Mac password, which you cannot type: ask them to open Terminal and paste
     `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`, then tell you
     when it is done. Then run `bash setup/mac.sh`.
   - Re-running is safe (nothing is overwritten). `SKIP_DATA=1` / `SKIP_WHISPER=1` skip the long downloads when you
     only need to repair something.
4. Read the installer output. For each `!!` line: fix it (re-run the failed part: `npm install`,
   `npm run sfx-lib`, `npm run setup:data`, `npm run setup:whisper`, or the render test
   `npx remotion still MapTest out/test.png --frame=140`) and run `node setup/doctor.mjs` again.
5. **Gemini key:** ask them to open `.env` (Windows `notepad .env`, Mac `open -e .env`), paste the key after
   `GEMINI_API_KEY=` and save. Free key: https://aistudio.google.com/apikey. **Never** ask for the key in chat, never
   print, echo, copy or commit `.env`.
6. Finish with `npm run demo` (needs the key): Gemini voices EP.5, Whisper times the words, and the first 30 s render
   to `out/demo.mp4`. Open it for them. That proves the whole pipeline works.

### Fit the tools to this computer (during install, and whenever the student says the machine is slow)

Before running the installer, read the machine and tell the student in one short Thai paragraph what you found and
what you will set up. Re-check after any hardware change.

- **Read:** OS and version; CPU cores; RAM; GPU model and VRAM; free disk on the project drive.
  Windows: `Get-CimInstance Win32_VideoController | Select Name,AdapterRAM`, `Get-CimInstance Win32_ComputerSystem`
  (TotalPhysicalMemory), `(Get-PSDrive C).Free`, `nvidia-smi` if present. Mac: `sysctl -n machdep.cpu.brand_string
  hw.memsize hw.ncpu`, `system_profiler SPDisplaysDataType`, `df -h .`.
- **Choose and apply** (write the choices into `.env` / `remotion.config.ts`, never ask the student to edit code):

  | Machine | Render (`remotion.config.ts` + render:chunks) | Whisper (`.env` WHISPER_MODEL) | Advice |
  |---|---|---|---|
  | NVIDIA GPU, ≥16 GB RAM | vulkan (installer picks it), `--parts 3 --concurrency 5` | `large-v3`; offer the CUDA build (`references/audio.md`) after the first clip | 10-min episode ≈ 40 min |
  | Apple Silicon, ≥16 GB | angle (Metal), `--parts 3 --concurrency 4` | `large-v3` (whisper.cpp builds with Metal) | fast enough for long episodes |
  | Intel/AMD integrated GPU or Apple Silicon 8 GB | angle, `--parts 2 --concurrency 3` | `medium` (default) | Shorts in class, long episodes overnight |
  | <8 GB RAM or no usable GPU | CPU (installer removes the GL line), `Config.setConcurrency(2)`, `--parts 1 --concurrency 2` | `small` | Shorts only; render while away; close other apps |
  | <15 GB free disk | — | `small` | run with `SKIP_DATA=1`, fetch only the map layers the episode needs; clean `out/*.parts` |

- Final renders always pass `--gl angle` on Windows (house standard; Vulkan can ghost a frame); keep the installer's
  choice for stills and tests. If a render runs out of memory or the machine freezes, halve `--parts`/`--concurrency`
  and run the same command again (render:chunks resumes).
- Set `WHISPER_MODEL` before `npm run setup:whisper`; changing it later just downloads the new model on next use.
- Say what each choice costs in time ("คลิป 60 วิ เรนเดอร์ราว 5 นาทีบนเครื่องนี้") so the student can plan.

## 2. Making videos

- The production method is the skill in `.claude/skills/map-studio/SKILL.md` (read it, then only the
  `references/` file each step needs). Its **house standard** applies to every video: news look on real satellite
  imagery, a new picture every 3–4 s cued on the spoken word, illustration style v2, real library sound, **clear
  layout** (rule 9: compact head card, panel at 80 %, panel tucked away while the camera moves, `holdAndMove`), and
  **render safety** (rule 4: `npm run render:chunks`, resumable — if it stops, run the same command again).
- Worked example to copy from: `src/episodes/thaihistory/ep05/` (EP.5 วันปิยมหาราช, 10 min, 9:16):
  `script.md` → `sources.md` → `beats.json` → `timing.json` → `beatsKit.tsx` (timing, `wp()` word cues, `Empire`
  colour layer) → `kit5.tsx` (gunboats, flags, sea…) → `ch0.tsx`…`ch8.tsx` (one chapter each) → `Ep.tsx`
  (`clear` layout) → `Cover.tsx`, `description.md`. Shared scene pieces: `src/episodes/thaihistory/ep04/v2.tsx`,
  `ep04/ch1_kit.tsx`, `ep04/ch3_kit.tsx`, `src/components/Scene.tsx`. Compositions: `Ep05Clear`, `Ep05Demo`,
  `Ep05Cover`.
- Three approval gates, always: script → style stills → final render. Never upload anywhere. Only licensed map data,
  credited in the description; approximate borders/routes labelled approximate. AI images only for portraits of
  people (prefer public-domain photos).

## 3. Save the student's Pro-plan quota

- Prefer **Sonnet** for routine work (scenes from existing kits, fixes, captions, descriptions); Opus only for
  planning a new series or hard fact-checking. Do not spawn parallel agents on Pro.
- One episode per session; start a new session for the next episode. Do not read whole large files — grep, then read
  the part you need. Check visuals with **one** contact sheet (ffmpeg tile) instead of many single images.
- Reuse scenes and kits; write new scene code only when no existing piece fits.
- Start with a 60–90 s Short; a 10-min episode is homework once the Short works.
- Rendering and TTS do not use Claude quota — run them in the background and wait for the notification instead of
  polling.

## 4. Folder map

| Path | What |
|---|---|
| `setup/` | installers (`windows.ps1`, `windows.bat`, `mac.sh`), `doctor.mjs`, `data.mjs`, `whisper.mjs`, `demo.mjs` |
| `.claude/skills/map-studio/` | the production skill: SKILL.md + references (workflow, styles, data sources, audio, sound, pacing, recipes) |
| `src/components/` | shared components: camera (`holdAndMove`, `panelHideAt`), map, raster, labels, arrows, Scene (style v2), captions, sound |
| `src/episodes/thaihistory/` | the example channel: news kit (`news/kit.tsx`, `LayoutCtx`, `CLEAR`), episodes 1–5 |
| `src/episodes/test/`, `datatour/` | `MapTest` (install check) and a tour of every data layer |
| `scripts/` | tts-gemini, align, snap-words, srt, describe, thumb, sfx, sfx-lib, loudness, check-glitch, render-chunks, fetch-* |
| `sfx/library.json` | the sound library list (mp3s are downloaded by `npm run sfx-lib`, never committed) |
| `docs/` | student guide and class prompts |
| `public/` | portraits (committed); `raster/`, `data/`, `audio/`, `sfx/` are downloaded/generated |
| `out/` | renders (git-ignored) |
