// One contact sheet of a composition: a still every N frames, tiled into a single JPG — the cheap way to check a
// whole episode (Claude reads ONE image instead of many). Usage:
//   node scripts/sheet.mjs <Composition> [--every 90] [--from 0] [--to end] [--cols 8] [--out out/sheet.jpg]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { every: { type: "string", default: "90" }, from: { type: "string", default: "0" }, to: { type: "string" }, cols: { type: "string", default: "8" }, out: { type: "string" } },
});
const [id] = positionals;
if (!id) throw new Error("usage: node scripts/sheet.mjs <Composition> [--every 90] [--from 0] [--to N] [--cols 8] [--out file.jpg]");
const out = values.out ?? `out/sheet-${id}.jpg`;
const tmp = `${out}.frames`;
mkdirSync(tmp, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id, chromiumOptions: { gl: "angle" } });
const to = Math.min(Number(values.to ?? composition.durationInFrames - 1), composition.durationInFrames - 1);
const frames = [];
for (let f = Number(values.from); f <= to; f += Number(values.every)) frames.push(f);
for (const [i, f] of frames.entries()) {
  await renderStill({ serveUrl, composition, frame: f, output: `${tmp}/${String(i).padStart(4, "0")}.jpg`, imageFormat: "jpeg", scale: 0.25, chromiumOptions: { gl: "angle" } });
  process.stdout.write(`\r  ${i + 1}/${frames.length} (frame ${f})`);
}
console.log("");
const cols = Number(values.cols);
const rows = Math.ceil(frames.length / cols);
execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", "1", "-i", `${tmp}/%04d.jpg`, "-vf", `tile=${cols}x${rows}:padding=4:color=black`, "-frames:v", "1", out]);
rmSync(tmp, { recursive: true, force: true });
console.log(`${out}  (${frames.length} frames: ${frames[0]}…${frames[frames.length - 1]} every ${values.every})`);
