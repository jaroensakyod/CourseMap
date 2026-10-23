// Check a storyboard episode BEFORE spending TTS quota or render time. Usage: node scripts/sb-check.mjs <slug>
// Prints errors (✗, must fix) and warnings (!, house standard) in one short list — fix them all in one edit.
import { readFileSync, existsSync } from "node:fs";
import { feature } from "topojson-client";

const slug = process.argv[2];
if (!slug) throw new Error("usage: node scripts/sb-check.mjs <slug>");
const dir = `src/episodes/${slug}`;
const ep = JSON.parse(readFileSync(`${dir}/episode.json`, "utf8"));
const beats = JSON.parse(readFileSync(`${dir}/beats.json`, "utf8"));
const timing = existsSync(`${dir}/timing.json`) ? JSON.parse(readFileSync(`${dir}/timing.json`, "utf8")) : [];
const catalog = JSON.parse(readFileSync("src/storyboard/catalog.json", "utf8"));
const placesTs = readFileSync("src/storyboard/places.ts", "utf8");
const gaz = new Set([...placesTs.matchAll(/\b([a-z]+): \[-?\d/g)].map((m) => m[1]));
const views = new Set([...placesTs.split("export const VIEWS")[1].matchAll(/\b([a-z]+): \[/g)].map((m) => m[1]));
const named = new Set(["red", "blue", "gold", "green", "purple", "gray", "orange", "teal", "white"]);
const atlas = JSON.parse(readFileSync("node_modules/world-atlas/countries-50m.json", "utf8"));
const countryNames = new Set(feature(atlas, atlas.objects.countries).features.flatMap((f) => [f.properties.name.toLowerCase(), String(f.id)]));
const sfx = new Set(JSON.parse(readFileSync("sfx/library.json", "utf8")).items.map((x) => x.id));
const T = new Map(timing.map((t) => [t.id, t]));
const real = timing.length && timing.every((t) => !t.draft);

const errs = [];
const warns = [];
const E = (id, m) => errs.push(`✗ ${id}: ${m}`);
const W = (id, m) => warns.push(`! ${id}: ${m}`);
const placeOk = (p) => Array.isArray(p) || ep.places?.[p] || gaz.has(String(p).toLowerCase().replace(/[\s_-]/g, ""));
const colorOk = (c) => !c || c.startsWith("#") || named.has(c) || ep.colors?.[c];
const areaOk = (a) => ep.areas?.[a] || countryNames.has(String(a).toLowerCase());
const viewOk = (v) => Array.isArray(v) || (typeof v === "object" && placeOk(v.place)) || ep.views?.[v] || views.has(String(v).toLowerCase()) || placeOk(v);
const words = (b) => (T.get(b.id)?.words ?? []).map((w) => w.w);
const cueOk = (b, at) => {
  if (!at) return true;
  if (real) return words(b).some((w) => w === at || w.includes(at));
  return b.text.replace(/\s/g, "").includes(at);
};

const ids = new Set();
const sceneUse = new Map();
let panels = 0;
let est = 0;
let lastPanelAt = 0;
for (const [i, b] of beats.entries()) {
  if (!b.id || ids.has(b.id)) E(b.id ?? `#${i}`, "id missing or duplicated");
  ids.add(b.id);
  if (!b.text) E(b.id, "no text");
  if (/\d/.test(b.text ?? "")) E(b.id, "text has digits — write numbers as Thai words (put digits in caption)");
  if (b.caption && b.caption.split(/\s+/).length !== b.text.split(/\s+/).length) E(b.id, `caption has ${b.caption.split(/\s+/).length} space-separated tokens, text has ${b.text.split(/\s+/).length} — they must match 1:1`);
  if (i === 0 && b.hook && b.hook.join("").length > 30) W(b.id, `hook is ${b.hook.join("").length} characters (house standard ≤ 30)`);
  const sec = T.get(b.id)?.sec ?? (b.text?.replace(/\s/g, "").length ?? 0) / 11.5 / (b.speed ?? 1);
  const at = (k) => est + sec * k;
  const m = b.map ?? {};
  if (m.view && !viewOk(m.view)) E(b.id, `unknown view "${JSON.stringify(m.view)}" — add it to episode.json views or use [w,s,e,n]`);
  if (!cueOk(b, m.at)) W(b.id, `map.at "${m.at}" not found in the spoken words`);
  for (const p of m.paint ?? []) {
    if (!areaOk(p.area)) E(b.id, `unknown area "${p.area}" — a country name (Thailand, Myanmar…) or episode.json areas`);
    if (!colorOk(p.color)) E(b.id, `unknown colour "${p.color}"`);
    if (!cueOk(b, p.at)) W(b.id, `paint.at "${p.at}" not in the words`);
  }
  for (const a of m.unpaint ?? []) if (!areaOk(a)) E(b.id, `unknown area "${a}" in unpaint`);
  for (const p of m.pins ?? []) (placeOk(p.place) ? null : E(b.id, `unknown place "${p.place}" — add to episode.json places`), cueOk(b, p.at) || W(b.id, `pin.at "${p.at}" not in the words`));
  for (const a of m.arrows ?? []) for (const p of a.route ?? []) if (!placeOk(p)) E(b.id, `unknown place "${p}" in arrow`);
  for (const f of m.flags ?? []) if (!placeOk(f.place)) E(b.id, `unknown place "${f.place}" in flag`);
  for (const r of m.rings ?? []) if (!placeOk(r.place)) E(b.id, `unknown place "${r.place}" in ring`);
  for (const p of b.panels ?? []) {
    panels++;
    if (!catalog[p.scene]) E(b.id, `unknown scene "${p.scene}" — pick one from references/scenes.md`);
    sceneUse.set(p.scene, (sceneUse.get(p.scene) ?? 0) + 1);
    if (p.place && !placeOk(p.place)) E(b.id, `unknown place "${p.place}" for panel`);
    if (!cueOk(b, p.at)) W(b.id, `panel.at "${p.at}" not in the words`);
    if (p.bed && !sfx.has(p.bed)) E(b.id, `unknown sound "${p.bed}"`);
    if (p.hit && !sfx.has(p.hit)) E(b.id, `unknown sound "${p.hit}"`);
    lastPanelAt = at(0.3);
  }
  for (const s of b.sfx ?? []) if (!sfx.has(s.id)) E(b.id, `unknown sound "${s.id}"`);
  if (b.overlay && !cueOk(b, b.overlay.at)) W(b.id, `overlay.at "${b.overlay.at}" not in the words`);
  if (!b.panels?.length && !b.overlay && !m.view && !m.paint && !m.pins && i > 0) W(b.id, "nothing new on screen in this beat (house standard: a new picture every 3–4 s)");
  if (at(1) - lastPanelAt > 12 && !b.overlay) W(b.id, `no new illustration for ${(at(1) - lastPanelAt).toFixed(0)} s`);
  if (b.portrait && !existsSync(`public/portraits/${b.portrait}.jpg`)) E(b.id, `portrait public/portraits/${b.portrait}.jpg not found`);
  est += sec + 0.6;
}
for (const [s, n] of sceneUse) if (n > 2) W(s, `scene used ${n} times (house standard: at most 2 per episode)`);
console.log(`${slug}: ${beats.length} beats · ~${Math.floor(est / 60)}:${String(Math.round(est % 60)).padStart(2, "0")} · ${panels} illustrations (${sceneUse.size} different) · timing: ${real ? "real VO" : timing.length ? "draft" : "none"}`);
for (const l of [...errs, ...warns]) console.log("  " + l);
console.log(errs.length ? `\n${errs.length} error(s) — fix before voicing` : warns.length ? `\nOK with ${warns.length} warning(s)` : "\nOK");
process.exit(errs.length ? 1 : 0);
