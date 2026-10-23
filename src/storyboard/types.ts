// Storyboard format — Claude writes JSON only (beats.json + episode.json); src/storyboard/Storyboard.tsx draws it.
// Full guide with examples: .claude/skills/map-studio/references/storyboard.md
// "at" everywhere = a word (or part of a word) in the beat's spoken `text`; the event starts when that word is said.

export type LonLat = [number, number];
export type BBox = [number, number, number, number]; // west, south, east, north
export type PlaceRef = string | LonLat; // a key of episode.places / the gazetteer, or [lon, lat]
export type ColorRef = string; // "red" | "blue" | "gold" | "green" | "purple" | "gray" | a key of episode.colors | "#hex"

export type Episode = {
  title: string; // shown in the top bar when a beat sets no chapter
  channel?: string; // red badge, top left (default ประวัติศาสตร์บนแผนที่)
  layout?: "clear" | "classic"; // clear = house standard (default)
  raster?: string[]; // base imagery in public/raster, bottom first (default ["world", "sea2"])
  tiles?: { name: string; bbox: BBox }[]; // close-up imagery that fades in when the camera is inside its box
  rivers?: boolean; // Natural Earth rivers of the region (data/searivers.json), default true
  places?: Record<string, LonLat>;
  views?: Record<string, BBox>;
  areas?: Record<string, { ring: LonLat[]; clip?: string }>; // hand-drawn areas (approximate), optional clip country
  colors?: Record<string, string>;
  bed?: string; // default ambience under every scene that has none (sfx library id)
};

export type MapCue = {
  view?: string | BBox | { place: PlaceRef; span?: number }; // where the camera goes (span = degrees, default 4)
  zoom?: number; // extra zoom on the view (default 1; 0.8 = a little wider)
  at?: string;
  paint?: { area: string; color: ColorRef; at?: string; label?: string }[]; // stays until unpaint
  unpaint?: string[];
  pins?: { place: PlaceRef; label?: string; color?: ColorRef; at?: string; keep?: boolean }[];
  arrows?: { route: PlaceRef[]; color?: ColorRef; at?: string; dashed?: boolean; keep?: boolean }[];
  flags?: { place: PlaceRef; kind: "uk" | "fr" | "siam"; at?: string; keep?: boolean }[];
  rings?: { place: PlaceRef; color?: ColorRef; at?: string; r?: number }[];
  note?: string; // small grey note on the map, e.g. "แนวโดยประมาณ"
};

export type PanelCue = { scene: string; at?: string; place?: PlaceRef; cue?: string; bed?: string; hit?: string };

export type Overlay =
  | { kind: "stat"; value: string; label?: string; at?: string; color?: ColorRef }
  | { kind: "compare"; title?: string; left: [string, string]; right: [string, string]; at?: string }
  | { kind: "timeline"; title?: string; marks: [string, string][]; at?: string }
  | { kind: "quote"; text: string; by?: string; at?: string }
  | { kind: "list"; title?: string; items: string[]; at?: string }
  | { kind: "poll"; title?: string; options: string[]; at?: string };

export type SbBeat = {
  id: string;
  text: string; // what the TTS reads (numbers as Thai words)
  caption?: string; // what the captions show (same number of space-separated tokens as text)
  speed?: number;
  card?: [string, string] | [string, string, ColorRef]; // head card: small tag, big headline, colour
  stat?: string; // big number under the headline
  portrait?: string; // public/portraits/<path>.jpg (thaihistory/rama5 …)
  photo?: string; // label on the portrait (default ภาพประกอบ)
  chapter?: string; // top bar chapter name from this beat on
  year?: string; // top bar year from this beat on
  hook?: [string, string]; // big two-line title on the first frames (first beat only)
  map?: MapCue;
  panels?: PanelCue[];
  overlay?: Overlay;
  sfx?: { id: string; at?: string; volume?: number }[];
};
