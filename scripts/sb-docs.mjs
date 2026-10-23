// Write .claude/skills/map-studio/references/scenes.md from src/storyboard/catalog.json (one line per scene, grouped
// by first tag) — the compact list Claude reads to pick scenes. Usage: node scripts/sb-docs.mjs
import { readFileSync, writeFileSync } from "node:fs";

const cat = JSON.parse(readFileSync("src/storyboard/catalog.json", "utf8"));
const groups = new Map();
for (const [id, c] of Object.entries(cat)) {
  const g = c.tags?.[0] ?? "อื่น ๆ";
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push(`- \`${id}\` ${c.th}${c.tags?.length > 1 ? ` · ${c.tags.slice(1).join(" ")}` : ""}`);
}
let md = `# Scene catalogue (${Object.keys(cat).length} illustrated scenes, style v2)\n\n`;
md += `Use the id in beats.json \`panels: [{ "scene": "<id>", "at": "<word>" }]\`. Any scene can be placed anywhere (\`place\`); the\n`;
md += `leader line points there. Sound (ambience bed, impact hit) comes with the scene. At most 2 uses of one scene per\n`;
md += `episode. Preview sheets: \`npm run sb:catalog\` → out/catalog/scenes-N.jpg. Never draw a king's face — scenes here\n`;
md += `show royalty from behind or far away only.\n\n`;
for (const [g, lines] of [...groups].sort((a, b) => b[1].length - a[1].length)) md += `## ${g}\n${lines.join("\n")}\n\n`;
writeFileSync(".claude/skills/map-studio/references/scenes.md", md);
console.log(`references/scenes.md — ${Object.keys(cat).length} scenes in ${groups.size} groups`);
