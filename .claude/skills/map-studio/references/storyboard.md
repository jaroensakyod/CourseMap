# Storyboard episodes — JSON only, no scene code (the Pro-plan way)

A storyboard episode is two JSON files in `src/episodes/<channel>/<episode>/`. `src/storyboard/Storyboard.tsx` draws
everything from them in the house standard (news look, clear layout, style v2 scenes, real sound). **Never write TSX
for a storyboard episode.** If something truly cannot be expressed, say so and ask before writing code.

Worked example: `src/episodes/examples/ayutthaya-island/` (6 beats). Scene list: `references/scenes.md`.

## Workflow (each step is one command; none of them spends Claude tokens)

1. `npm run new -- <channel>/<episode> "ชื่อตอน"` → folder with both files.
2. Write `beats.json` (script + visuals in one pass, after the script gate) and `episode.json` (places, views, colours).
3. `npm run episode -- <slug>` → validator + draft timing + **one** contact sheet `out/<slug>-sheet.jpg`. Read that one
   image, fix every problem in ONE edit, repeat at most twice. (Style gate.)
4. `npm run episode -- <slug> --voice` → Gemini TTS (batch) + Whisper + sheet with real timing.
5. `npm run episode -- <slug> --render` → final video (resumable), glitch check, −14 LUFS, `.srt` (render gate).

## episode.json

```json
{ "title": "สงครามเก้าทัพ", "channel": "ประวัติศาสตร์บนแผนที่",
  "raster": ["world", "sea2"],                       // base imagery (public/raster); fetch others with npm run imagery
  "tiles": [{ "name": "mouthhls", "bbox": [100.44, 13.36, 100.7, 13.8] }],   // optional close-up HLS
  "places": { "latya": [98.9, 14.6] },               // extra places; built-in: src/storyboard/places.ts (bangkok, ayutthaya, mandalay …)
  "views":  { "west": [97.0, 12.5, 101.5, 17.5] },  // extra views [w,s,e,n]; built-in: thailand central north northeast south seasia burma …
  "areas":  { "lanna": { "ring": [[98,17.5],[101,17.5],[101,20.5],[98,20.5]], "clip": "Thailand" } },  // hand-drawn, approximate
  "colors": { "siam": "#ffc94a", "burma": "#e8443a" },
  "bed": "wind" }                                    // default ambience
```

## beats.json — one object per spoken sentence

```json
{ "id": "attack",                                   // unique, short
  "text": "พอศอ สองพันสามร้อยยี่สิบแปด พม่ายกทัพมาเก้าทัพ",       // what TTS reads: numbers as Thai words
  "caption": "พ.ศ. 2328 พม่ายกทัพมาเก้าทัพ",                  // on screen: SAME number of space-separated tokens as text
  "speed": 0.95,
  "chapter": "เก้าทัพ", "year": "2328",              // top bar from this beat on
  "card": ["พ.ศ. 2328", "พม่ายกมา 9 ทัพ", "red"],   // head card: tag, headline, colour (optional)
  "stat": "144,000",                                 // big number under the headline (optional)
  "portrait": "thaihistory/rama1", "photo": "ภาพถ่าย",   // public/portraits/<path>.jpg; label (optional)
  "map": {
    "view": "burma",            // or "west" / [w,s,e,n] / {"place":"kanchanaburi","span":3}; "zoom": 0.8 = wider
    "at": "พม่า",               // the camera moves when this word is said (default: beat start)
    "paint":   [{ "area": "Myanmar", "color": "burma", "at": "พม่า" }],     // stays until "unpaint"
    "unpaint": ["lanna"],
    "pins":    [{ "place": "kanchanaburi", "label": "ลาดหญ้า", "color": "gold", "at": "ลาดหญ้า", "keep": false }],
    "arrows":  [{ "route": ["mandalay", "tavoy", "kanchanaburi"], "color": "burma", "at": "ยก", "dashed": false }],
    "flags":   [{ "place": "chanthaburi", "kind": "fr", "at": "ยึด" }],      // uk | fr | siam
    "rings":   [{ "place": "ayutthaya", "color": "red", "r": 0.3, "at": "ล้อม" }],
    "note": "แนวโดยประมาณ" },                       // ALWAYS on approximate borders/routes
  "panels": [ { "scene": "march", "at": "ยกทัพ", "place": "mandalay" },
              { "scene": "wall-assault", "at": "เก้า" } ],               // ids from references/scenes.md
  "overlay": { "kind": "stat", "value": "9", "label": "ทัพ", "at": "เก้า" },
  "sfx": [{ "id": "war_drums", "at": "ยก" }] }
```

- `at` = a word or part of a word in **this beat's text** (after TTS, Whisper splits Thai its own way — `sb-check`
  warns when a cue word is not found; the event then falls back to mid-beat).
- Overlay kinds: `stat {value,label}` · `compare {title,left:[tag,text],right:[tag,text]}` ·
  `timeline {title,marks:[[year,text]…]}` · `quote {text,by}` · `list {title,items}` · `poll {title,options}`.
  An overlay takes the illustration slot until the beat ends.
- First beat: add `"hook": ["บรรทัด 1", "บรรทัด 2?"]` (≤ 30 characters, the shock question) and a strong map + scene.
- Last beat: answer + `poll` overlay.

## House rules the storyboard must follow

- A new picture every 3–4 s: ~1 panel per sentence, plus map moves/pins/arrows between. Long sentences get 2 panels
  (different `at` words). `sb-check` warns after 12 s without a new illustration.
- Same scene at most twice per episode. Pick scenes by meaning, then set `place` so the leader line points right.
- Camera moves 1–2 times per beat at most; every `view` change hides the panel while the camera travels.
- Countries by English name (Thailand, Myanmar, Laos, Cambodia, Vietnam, Malaysia, China …). Historical extents are
  `areas` rings + `"note": "แนวโดยประมาณ"`. Facts and numbers only from `sources.md`.
- Colours: one per side for the whole episode (episode.json `colors`), gold = Siam/Thailand by default.

## Token budget (Claude Pro)

Read this file + `scenes.md` once per episode. Write `beats.json` in one pass (~70–80 beats for 10 min). Check with
the one contact sheet, not single stills. Fix in one edit per round. Use Sonnet. One episode per session.
