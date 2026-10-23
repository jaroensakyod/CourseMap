// Start a new storyboard episode folder. Usage: node scripts/sb-new.mjs <channel/episode> "ชื่อตอน"   (npm run new -- …)
// Creates src/episodes/<channel>/<episode>/episode.json + beats.json (2 sample beats to overwrite).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const [slug, title = "ชื่อตอน"] = process.argv.slice(2);
if (!slug || !slug.includes("/")) throw new Error('usage: node scripts/sb-new.mjs <channel/episode> "ชื่อตอน"');
const dir = `src/episodes/${slug}`;
if (existsSync(`${dir}/beats.json`)) throw new Error(`${dir} already exists`);
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/episode.json`, JSON.stringify({ title, channel: "ประวัติศาสตร์บนแผนที่", raster: ["world", "sea2"], places: {}, views: {}, colors: { siam: "#ffc94a", enemy: "#e8443a" }, bed: "wind" }, null, 2) + "\n");
writeFileSync(
  `${dir}/beats.json`,
  `[
  {"id":"hook","text":"คำถามช็อกไม่เกินสามสิบตัวอักษร","hook":["บรรทัดแรก","บรรทัดสอง?"],"map":{"view":"thailand","paint":[{"area":"Thailand","color":"siam"}]},"panels":[{"scene":"palace-dawn","place":"bangkok"}],"speed":0.95},
  {"id":"b1","text":"ประโยคที่สอง เล่าเรื่องต่อ","card":["ป้ายเล็ก","หัวข้อใหญ่"],"chapter":"ช่วงที่ 1","year":"2310","map":{"view":"central","at":"เล่า","pins":[{"place":"ayutthaya","label":"อยุธยา","at":"เรื่อง"}]},"panels":[{"scene":"capital","at":"เล่า"}],"speed":0.95}
]
`,
);
console.log(`สร้าง ${dir}/episode.json + beats.json แล้ว → แก้ beats.json แล้วรัน: npm run episode -- ${slug}`);
