// Preview sheets of every catalogue scene: renders ScenePreview once per scene (one bundle), crops the panel and tiles
// 24 per sheet → out/catalog/scenes-N.jpg. Usage: node scripts/sb-catalog.mjs   (npm run sb:catalog)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const dir = "out/catalog";
mkdirSync(`${dir}/f`, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "ScenePreview", chromiumOptions: { gl: "angle" } });
const n = composition.durationInFrames / 60;
for (let i = 0; i < n; i++) {
  const out = `${dir}/f/${String(i).padStart(3, "0")}.jpg`;
  await renderStill({ serveUrl, composition, frame: i * 60 + 50, output: out, imageFormat: "jpeg", scale: 0.5, chromiumOptions: { gl: "angle" } });
  process.stdout.write(`\r  ${i + 1}/${n}`);
}
console.log("");
for (let k = 0; k * 24 < n; k++) {
  const list = Array.from({ length: Math.min(24, n - k * 24) }, (_, j) => `${dir}/f/${String(k * 24 + j).padStart(3, "0")}.jpg`);
  const inputs = list.flatMap((f) => ["-i", f]);
  const crop = list.map((_, j) => `[${j}]crop=540:290:0:470,scale=360:-2[c${j}]`).join(";");
  const cols = 4;
  const rows = Math.ceil(list.length / cols);
  const pad = Array.from({ length: rows * cols - list.length }, (_, j) => `color=c=black:s=360x194:d=1[p${j}]`).join(";");
  const cells = [...list.map((_, j) => `[c${j}]`), ...Array.from({ length: rows * cols - list.length }, (_, j) => `[p${j}]`)];
  const grid = `${cells.join("")}xstack=inputs=${rows * cols}:layout=${Array.from({ length: rows * cols }, (_, j) => `${(j % cols) * 360}_${Math.floor(j / cols) * 194}`).join("|")}`;
  execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", [crop, pad, grid].filter(Boolean).join(";"), "-frames:v", "1", `${dir}/scenes-${k + 1}.jpg`]);
  console.log(`${dir}/scenes-${k + 1}.jpg`);
}
rmSync(`${dir}/f`, { recursive: true, force: true });
