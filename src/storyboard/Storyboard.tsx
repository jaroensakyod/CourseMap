import type { FeatureCollection, MultiLineString } from "geojson";
import { useMemo, type ReactNode } from "react";
import { AbsoluteFill, Html5Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Arrow } from "../components/Arrow";
import { camAt, holdAndMove, panelHideAt, projectionFor, type Cam, type CamKey } from "../components/camera";
import { Caption } from "../components/Caption";
import { countries, country } from "../components/data";
import { PointLabel } from "../components/Labels";
import { MapFrame, useMap } from "../components/Map";
import { Raster } from "../components/Raster";
import { bbox, region } from "../components/Region";
import { Bed, Hit, SFX, Sfx } from "../components/Sound";
import { buildBeats, totalFrames } from "../components/subs.mjs";
import { useJson } from "../components/useJson";
import { AnchorCtx, CAPTION_TOP, clamp, CLEAR, font, GOLD, HeadCard, LAYOUT, LayoutCtx, RED, TopBar, view, type Head } from "../episodes/thaihistory/news/kit";
import catalog from "./catalog.json";
import { NAMED_COLORS, PLACES, VIEWS } from "./places";
import { SCENES } from "./scenes.gen";
import type { BBox, ColorRef, Episode, LonLat, PlaceRef, SbBeat } from "./types";

// Storyboard episode: everything on screen comes from beats.json + episode.json (types.ts). No scene code per episode.
export type SbData = { slug: string; episode: Episode; beats: SbBeat[]; timing: Parameters<typeof buildBeats>[0] };
type Catalog = Record<string, { th?: string; bed?: string; hit?: string; hitAt?: number; tags?: string[] }>;
const CAT = catalog as Catalog;

type Beat = ReturnType<typeof buildBeats>[number] & SbBeat;
const KEEP_PAD = 45; // map marks stay this long after their beat ends

export const sbFrames = (d: SbData) => totalFrames(buildBeats(d.timing, d.beats, LAYOUT), LAYOUT) + 45;

// Resolve names to coordinates / colours / views.
const mk = (ep: Episode) => {
  const place = (p: PlaceRef): LonLat => {
    if (Array.isArray(p)) return p;
    const k = p.toLowerCase().replace(/[\s_-]/g, "");
    const v = ep.places?.[p] ?? ep.places?.[k] ?? PLACES[k];
    if (!v) throw new Error(`storyboard: unknown place "${p}" — add it to episode.json "places"`);
    return v;
  };
  const color = (c?: ColorRef, fallback = GOLD) => (!c ? fallback : c.startsWith("#") ? c : ep.colors?.[c] ?? NAMED_COLORS[c] ?? fallback);
  const box = (v: NonNullable<NonNullable<SbBeat["map"]>["view"]>): BBox => {
    if (Array.isArray(v)) return v;
    if (typeof v === "string") {
      const b = ep.views?.[v] ?? VIEWS[v.toLowerCase()];
      if (b) return b;
      const [lon, lat] = place(v);
      return [lon - 2, lat - 2, lon + 2, lat + 2];
    }
    const [lon, lat] = place(v.place);
    const s = (v.span ?? 4) / 2;
    return [lon - s, lat - s, lon + s, lat + s];
  };
  return { place, color, box };
};

// Frame at which a word (or part of one) is spoken in a beat; falls back to `k` of the beat.
const cueOf = (b: Beat, word?: string, k = 0) => {
  if (!word) return Math.round(b.start + b.len * k);
  const w = (b.words ?? []).find((x: { w: string }) => x.w === word) ?? (b.words ?? []).find((x: { w: string }) => x.w.includes(word));
  return w ? Math.round(b.start + w.s * 30) : Math.round(b.start + b.len * 0.5);
};

type Panel = { key: string; scene: string; start: number; end: number; cue: number; anchor: LonLat; bed?: string; hit?: string; hitAt: number };
type Paint = { area: string; color: string | null; f: number; label?: string };
type Mark = { kind: "pin" | "arrow" | "flag" | "ring"; f: number; to: number; data: Record<string, unknown> };

const plan = (d: SbData, width: number, height: number) => {
  const ep = d.episode;
  const R = mk(ep);
  // buildBeats keeps only timing + text fields: merge the storyboard fields (map, panels, card…) back by id.
  const raw = new Map(d.beats.map((x) => [x.id, x]));
  const beats = buildBeats(d.timing, d.beats, LAYOUT).map((x) => ({ ...raw.get(x.id), ...x })) as Beat[];
  const end = totalFrames(beats, LAYOUT) + 45;
  const cams: CamKey[] = [];
  const paints: Paint[] = [];
  const marks: Mark[] = [];
  const heads: Head[] = [];
  const panels: Panel[] = [];
  const overlays: { o: NonNullable<SbBeat["overlay"]>; f: number; to: number }[] = [];
  const sfx: { id: string; f: number; v: number }[] = [];
  const ui: [number, string, number][] = [];
  const bars: { f: number; chapter?: string; year?: string }[] = [];
  const notes: { f: number; to: number; text: string }[] = [];
  let lastAnchor: LonLat = R.place("bangkok");
  const clearLayout = (ep.layout ?? "clear") === "clear";
  beats.forEach((b, i) => {
    const next = beats[i + 1];
    const beatEnd = next ? next.start : end;
    if (b.chapter || b.year) bars.push({ f: b.start, chapter: b.chapter, year: b.year });
    const m = b.map;
    if (m?.view) {
      const bb = R.box(m.view);
      cams.push({ frame: cueOf(b, m.at), cam: view(bbox([[bb[0], bb[1]], [bb[2], bb[3]]]), width, height, m.zoom ?? 0.9, 0.08) });
      lastAnchor = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2];
      if (i > 0) ui.push([cueOf(b, m.at) - 10, SFX.whoosh, 0.18]);
    }
    for (const p of m?.paint ?? []) paints.push({ area: p.area, color: R.color(p.color), f: cueOf(b, p.at), label: p.label });
    for (const a of m?.unpaint ?? []) paints.push({ area: a, color: null, f: cueOf(b, m?.at) });
    for (const p of m?.pins ?? []) {
      const at = R.place(p.place);
      lastAnchor = at;
      marks.push({ kind: "pin", f: cueOf(b, p.at), to: p.keep ? end : beatEnd + KEEP_PAD, data: { at, label: p.label, color: R.color(p.color) } });
    }
    for (const a of m?.arrows ?? []) marks.push({ kind: "arrow", f: cueOf(b, a.at), to: a.keep ? end : beatEnd + KEEP_PAD, data: { points: a.route.map(R.place), color: R.color(a.color, RED), dashed: !!a.dashed } });
    for (const fl of m?.flags ?? []) marks.push({ kind: "flag", f: cueOf(b, fl.at), to: fl.keep ? end : beatEnd + KEEP_PAD, data: { at: R.place(fl.place), kind: fl.kind } });
    for (const r of m?.rings ?? []) marks.push({ kind: "ring", f: cueOf(b, r.at), to: beatEnd + KEEP_PAD, data: { at: R.place(r.place), color: R.color(r.color, RED), r: r.r ?? 0.3 } });
    if (m?.note) notes.push({ f: b.start, to: beatEnd + KEEP_PAD, text: m.note });
    if (b.card) {
      heads.push({ f: b.start, tag: b.card[0], head: b.card[1], color: R.color(b.card[2] as ColorRef | undefined, GOLD), stat: b.stat, portrait: b.portrait, photo: b.photo });
      ui.push([b.start, SFX.pop, 0.22]);
    }
    if (b.overlay) overlays.push({ o: b.overlay, f: cueOf(b, b.overlay.at), to: beatEnd + 10 });
    for (const p of b.panels ?? []) {
      const cat = CAT[p.scene] ?? {};
      const start = Math.max(b.start - 6, cueOf(b, p.at) - 6);
      panels.push({ key: `${b.id}-${panels.length}`, scene: p.scene, start, end: 0, cue: p.cue ? cueOf(b, p.cue) : start + 36, anchor: p.place ? R.place(p.place) : lastAnchor, bed: p.bed ?? cat.bed ?? ep.bed, hit: p.hit ?? cat.hit, hitAt: cat.hitAt ?? 36 });
    }
    for (const s of b.sfx ?? []) sfx.push({ id: s.id, f: cueOf(b, s.at), v: s.volume ?? 0.45 });
  });
  // A panel lasts until the next one (overlap 14 frames, no blink), at most 12 s, and gives way to an overlay card.
  panels.sort((a, b) => a.start - b.start);
  panels.forEach((p, i) => {
    const nxt = panels[i + 1];
    let e = Math.min(nxt ? nxt.start + 14 : end, p.start + 360);
    const ov = overlays.find((o) => o.f > p.start && o.f < e);
    if (ov) e = ov.f + 6;
    p.end = e;
  });
  cams.sort((a, b) => a.frame - b.frame);
  if (!cams.length || cams[0].frame > 0) cams.unshift({ frame: 0, cam: cams[0]?.cam ?? view(bbox([[97.3, 5.6], [105.7, 20.5]]), width, height, 0.9, 0.08) });
  const keys = clearLayout ? holdAndMove(cams, 30) : cams;
  const voice: [number, number][] = beats.map((b) => [b.start, b.end]);
  return { ep, R, beats, end, keys, paints, marks, heads, panels, overlays, sfx, ui, bars, notes, voice, clearLayout };
};
type Plan = ReturnType<typeof plan>;

// A country by English name (Natural Earth, e.g. "Thailand", "Myanmar", "Laos") or ISO numeric id ("764").
export const countryByName = (name: string) => countries.features.find((f) => f.properties.name.toLowerCase() === name.toLowerCase()) ?? country(name);

// Painted areas: last event per area wins; colour changes cross-fade over 15 frames.
const Areas = ({ P }: { P: Plan }) => {
  const frame = useCurrentFrame();
  const { path, s } = useMap();
  const names = [...new Set(P.paints.map((p) => p.area))];
  return (
    <g>
      {names.map((name, i) => {
        const evs = P.paints.filter((p) => p.area === name && p.f <= frame + 15);
        if (!evs.length) return null;
        const cur = evs[evs.length - 1];
        const prev = evs[evs.length - 2];
        const k = interpolate(frame, [cur.f, cur.f + 15], [0, 1], clamp);
        const custom = P.ep.areas?.[name];
        let feat;
        try {
          feat = custom ? region(custom.ring) : countryByName(name);
        } catch {
          return null;
        }
        const d = path(feat) ?? "";
        const layer = (c: string | null, o: number) =>
          !c || o <= 0 ? null : (
            <g opacity={o}>
              <path d={d} fill={c} fillOpacity={0.3 * (0.9 + 0.1 * Math.sin(frame * 0.12 + i))} />
              <path d={d} fill="none" stroke={c} strokeWidth={12 * s} strokeOpacity={0.3} style={{ filter: `blur(${6 * s}px)` }} strokeLinejoin="round" />
              <path d={d} fill="none" stroke={c} strokeWidth={3 * s} strokeLinejoin="round" strokeDasharray={custom ? `${14 * s} ${8 * s}` : undefined} />
            </g>
          );
        return (
          <g key={name}>
            {prev && layer(prev.color, 1 - k)}
            {layer(cur.color, k)}
          </g>
        );
      })}
    </g>
  );
};

const Dot = ({ at, color, f, to }: { at: LonLat; color: string; f: number; to: number }) => {
  const frame = useCurrentFrame();
  const { projection, s } = useMap();
  const p = projection(at);
  if (!p) return null;
  const k = interpolate(frame, [f, f + 10, to, to + 10], [0, 1, 1, 0], clamp);
  return (
    <g transform={`translate(${p[0]},${p[1]})`} opacity={k}>
      <circle r={14 * 2.2 * (1 + 0.25 * Math.sin(frame * 0.25)) * s} fill={color} opacity={0.25} />
      <circle r={14 * s} fill={color} stroke="#fff" strokeWidth={3 * s} />
    </g>
  );
};

const FlagMark = ({ at, kind, f, to }: { at: LonLat; kind: string; f: number; to: number }) => {
  const frame = useCurrentFrame();
  const { projection, s } = useMap();
  const p = projection(at);
  if (!p) return null;
  const k = interpolate(frame, [f, f + 12, to, to + 12], [0, 1, 1, 0], clamp);
  const wave = Math.sin(frame * 0.3) * 4 * s;
  const cols = kind === "fr" ? ["#2a3f9a", "#f4f2ea", "#c9302c"] : kind === "uk" ? ["#b0262a"] : ["#c9302c"];
  return (
    <g transform={`translate(${p[0]},${p[1] + (1 - k) * 30 * s})`} opacity={k}>
      <line x1={0} y1={0} x2={0} y2={-80 * s} stroke="#f4f0e6" strokeWidth={4 * s} />
      {cols.map((c, i) => (
        <path key={i} d={`M${(i * 48 * s) / cols.length} ${-80 * s} q${(24 * s) / cols.length} ${-6 * s + wave} ${(48 * s) / cols.length} 0 v${30 * s} q${(-24 * s) / cols.length} ${6 * s - wave} ${(-48 * s) / cols.length} 0 Z`} fill={c} />
      ))}
    </g>
  );
};

const RingMark = ({ at, color, r, f, to }: { at: LonLat; color: string; r: number; f: number; to: number }) => {
  const frame = useCurrentFrame();
  const { projection, s } = useMap();
  const p = projection(at);
  if (!p) return null;
  const k = interpolate(frame, [f, f + 12, to, to + 12], [0, 1, 1, 0], clamp);
  const rr = Math.max((r * projection.scale() * Math.PI) / 180, 30 * s) * (0.6 + 0.4 * k);
  return (
    <g opacity={k}>
      <circle cx={p[0]} cy={p[1]} r={rr} fill={color} fillOpacity={0.1} stroke={color} strokeWidth={10 * s} strokeOpacity={0.3} />
      <circle cx={p[0]} cy={p[1]} r={rr} fill="none" stroke={color} strokeWidth={3 * s} strokeDasharray={`${14 * s} ${9 * s}`} transform={`rotate(${frame * 0.6},${p[0]},${p[1]})`} />
    </g>
  );
};

const Marks = ({ P }: { P: Plan }) => {
  const frame = useCurrentFrame();
  return (
    <g>
      {P.marks.map((m, i) => {
        if (frame < m.f - 2 || frame > m.to + 14) return null;
        const d = m.data as Record<string, never>;
        if (m.kind === "pin")
          return (
            <g key={i}>
              <Dot at={d.at} color={d.color} f={m.f} to={m.to} />
              {d.label && frame < m.to && <PointLabel at={d.at} text={d.label} start={m.f + 4} color={d.color} size={0.8} />}
            </g>
          );
        if (m.kind === "arrow") return <Arrow key={i} points={d.points} start={m.f} end={m.f + 36} color={d.color} width={12} variant={d.dashed ? "dashed" : "solid"} opacity={interpolate(frame, [m.to, m.to + 12], [1, 0], clamp)} />;
        if (m.kind === "flag") return <FlagMark key={i} at={d.at} kind={d.kind} f={m.f} to={m.to} />;
        return <RingMark key={i} at={d.at} color={d.color} r={d.r} f={m.f} to={m.to} />;
      })}
    </g>
  );
};

const BigRivers = () => {
  const { path, projection, s } = useMap();
  const data = useJson<{ rivers: FeatureCollection<MultiLineString, { name: string; rank: number }> }>("data/searivers.json");
  if (!data) return null;
  const w = Math.min(Math.max(((projection.scale() * Math.PI) / 180) * 0.004, 1.6 * s), 7 * s);
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {data.rivers.features.map((f, i) => <path key={i} d={path(f) ?? ""} stroke="#7fd4ff" strokeWidth={w * (f.properties.rank <= 3 ? 1 : 0.6)} strokeOpacity={0.55} />)}
    </g>
  );
};

const Panels = ({ P }: { P: Plan }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {P.panels.map((p) => {
        if (frame < p.start - 2 || frame > p.end + 20) return null;
        const S = SCENES[p.scene];
        if (!S) return null;
        return (
          <AnchorCtx.Provider key={p.key} value={p.anchor}>
            <S id={`sb${p.key}`} start={p.start} end={p.end} cue={p.cue} anchor={p.anchor} />
          </AnchorCtx.Provider>
        );
      })}
    </>
  );
};

// Hook title over the first frames.
const HookTitle = ({ lines, until }: { lines: [string, string]; until: number }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const s = Math.min(width, height) / 1080;
  const o = interpolate(frame, [until - 2, until + 10], [1, 0], clamp);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: height * 0.1, opacity: o, fontFamily: font, color: "#fff", textAlign: "center", lineHeight: 1.25 }}>
      <div style={{ transform: `scale(${1 + 0.06 * Math.max(0, 1 - frame / 8)})`, textShadow: `0 ${6 * s}px ${30 * s}px rgba(0,0,0,0.9)` }}>
        <div style={{ fontSize: 96 * s, fontWeight: 900, color: GOLD }}>{lines[0]}</div>
        <div style={{ fontSize: 96 * s, fontWeight: 900, color: "#ff6b5f" }}>{lines[1]}</div>
      </div>
    </AbsoluteFill>
  );
};

// Overlay cards sit in the illustration slot (the panel gives way while one shows).
const OverlayCard = ({ o, f, to }: { o: NonNullable<SbBeat["overlay"]>; f: number; to: number }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const s = Math.min(width, height) / 1080;
  if (frame < f || frame > to + 10) return null;
  const k = spring({ frame: frame - f, fps, config: { damping: 14 } });
  const out = interpolate(frame, [to, to + 10], [1, 0], clamp);
  const box = (children: ReactNode, title?: string) => (
    <div style={{ position: "absolute", left: 110 * s, right: 110 * s, top: height * 0.585, opacity: k * out, transform: `scale(${0.92 + 0.08 * k})`, fontFamily: font, color: "#fff", background: "rgba(8,14,26,0.92)", border: `${3 * s}px solid ${GOLD}`, borderRadius: 18 * s, padding: `${20 * s}px ${30 * s}px`, lineHeight: 1.35 }}>
      {title && <div style={{ fontSize: 30 * s, fontWeight: 700, color: GOLD, marginBottom: 8 * s }}>{title}</div>}
      {children}
    </div>
  );
  const pop = (i: number) => interpolate(frame, [f + 8 + i * 12, f + 18 + i * 12], [0, 1], clamp);
  switch (o.kind) {
    case "stat":
      return box(
        <div style={{ display: "flex", alignItems: "baseline", gap: 20 * s }}>
          <span style={{ fontSize: 150 * s, fontWeight: 900, color: GOLD, lineHeight: 1.05 }}>{o.value}</span>
          {o.label && <span style={{ fontSize: 44 * s, fontWeight: 700 }}>{o.label}</span>}
        </div>,
      );
    case "compare":
      return box(
        <div style={{ display: "flex", gap: 24 * s, alignItems: "stretch" }}>
          {[o.left, o.right].map(([a, b], i) => (
            <div key={i} style={{ flex: 1, opacity: pop(i), background: "rgba(255,255,255,0.07)", borderRadius: 14 * s, padding: `${14 * s}px ${18 * s}px`, borderTop: `${6 * s}px solid ${i ? "#3f8cff" : RED}` }}>
              <div style={{ fontSize: 30 * s, fontWeight: 700, opacity: 0.85 }}>{a}</div>
              <div style={{ fontSize: 44 * s, fontWeight: 900 }}>{b}</div>
            </div>
          ))}
        </div>,
        o.title,
      );
    case "timeline":
      return box(
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 * s, borderTop: `${4 * s}px solid ${GOLD}`, paddingTop: 14 * s }}>
          {o.marks.map(([y, t], i) => (
            <div key={i} style={{ flex: 1, opacity: pop(i), textAlign: "center" }}>
              <div style={{ fontSize: 40 * s, fontWeight: 900, color: GOLD }}>{y}</div>
              <div style={{ fontSize: 26 * s, fontWeight: 700 }}>{t}</div>
            </div>
          ))}
        </div>,
        o.title,
      );
    case "quote":
      return box(
        <div>
          <div style={{ fontSize: 44 * s, fontWeight: 700, lineHeight: 1.35 }}>“{o.text}”</div>
          {o.by && <div style={{ fontSize: 28 * s, opacity: 0.8, marginTop: 10 * s }}>— {o.by}</div>}
        </div>,
      );
    case "list":
      return box(
        <div style={{ display: "flex", flexDirection: "column", gap: 8 * s }}>
          {o.items.map((t, i) => (
            <div key={i} style={{ fontSize: 38 * s, fontWeight: 700, opacity: pop(i) }}>
              <span style={{ color: GOLD }}>{i + 1}</span> {t}
            </div>
          ))}
        </div>,
        o.title,
      );
    case "poll":
      return box(
        <div style={{ display: "flex", gap: 16 * s }}>
          {o.options.map((t, i) => (
            <div key={i} style={{ flex: 1, opacity: pop(i), textAlign: "center", border: `${3 * s}px solid ${GOLD}`, borderRadius: 14 * s, padding: `${12 * s}px ${8 * s}px` }}>
              <div style={{ fontSize: 40 * s, fontWeight: 900, color: GOLD }}>{["①", "②", "③", "④"][i]}</div>
              <div style={{ fontSize: 30 * s, fontWeight: 700 }}>{t}</div>
            </div>
          ))}
        </div>,
        o.title,
      );
  }
};

const MapNote = ({ text, f, to }: { text: string; f: number; to: number }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const s = Math.min(width, height) / 1080;
  if (frame < f || frame > to + 10) return null;
  const o = interpolate(frame, [f, f + 10, to, to + 10], [0, 1, 1, 0], clamp);
  return <div style={{ position: "absolute", left: 50 * s, top: height * 0.53, opacity: o * 0.85, fontFamily: font, fontSize: 24 * s, color: "#fff", background: "rgba(8,14,26,0.6)", padding: `${2 * s}px ${12 * s}px`, borderRadius: 8 * s }}>{text}</div>;
};

const coverage = (cam: Cam, w: number, h: number, [x0, y0, x1, y1]: BBox) => {
  const p = projectionFor(cam, w, h);
  let n = 0;
  let inside = 0;
  for (let i = 0; i <= 17; i++)
    for (let j = 0; j <= 31; j++) {
      const q = p.invert!([(w * i) / 17, (h * j) / 31]);
      n++;
      if (q && q[0] >= x0 && q[0] <= x1 && q[1] >= y0 && q[1] <= y1) inside++;
    }
  return inside / n;
};

export const Storyboard = ({ data }: { data: SbData }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const P = useMemo(() => plan(data, width, height), [data, width, height]);
  const base = camAt(P.keys, frame);
  const cam = P.clearLayout ? { ...base, scale: base.scale * CLEAR.camScale } : base;
  const hide = P.clearLayout ? panelHideAt(P.keys, frame) : 0;
  const tileOpacity = (bb: BBox) => {
    let sum = 0;
    for (let d = 0; d < 10; d++) sum += Math.min(1, Math.max(0, (coverage(camAt(P.keys, Math.max(0, frame - d)), width, height, bb) - 0.8) * 5));
    return sum / 10;
  };
  const bar = [...P.bars].reverse().find((b) => frame >= b.f && b.chapter)?.chapter ?? P.ep.title;
  const year = [...P.bars].reverse().find((b) => frame >= b.f && b.year)?.year ?? "";
  const hook = P.beats[0]?.hook;
  const layout = P.clearLayout ? { compact: true, panelScale: CLEAR.panelScale, panelHide: hide } : { compact: false, panelScale: 1, panelHide: 0 };
  return (
    <LayoutCtx.Provider value={layout}>
      <AbsoluteFill style={{ background: "#02060d" }}>
        {P.beats.map((b) => (
          <Sequence key={b.id} from={b.start} durationInFrames={b.len + LAYOUT.gap}>
            <Html5Audio src={staticFile(b.file)} />
          </Sequence>
        ))}
        {P.ui.map(([f, src, v], i) => <Sfx key={`u${i}`} src={src} at={Math.max(0, f)} volume={v} />)}
        {P.panels.map((p) => (p.bed ? <Bed key={`b${p.key}`} id={p.bed} from={p.start} to={p.end} volume={0.16} voice={P.voice} duck={0.3} /> : null))}
        {P.panels.map((p) => (p.hit ? <Hit key={`h${p.key}`} id={p.hit} at={p.start + p.hitAt} volume={0.3} /> : null))}
        {P.sfx.map((x, i) => <Hit key={`s${i}`} id={x.id} at={x.f} volume={x.v} />)}
        <MapFrame cam={cam} focusY={P.clearLayout ? CLEAR.focusY : 0.5}>
          <Raster layers={[...(P.ep.raster ?? ["world", "sea2"]).map((name) => ({ name })), ...(P.ep.tiles ?? []).map((t) => ({ name: t.name, opacity: tileOpacity(t.bbox) }))]} />
          {P.ep.rivers !== false && <BigRivers />}
          <Areas P={P} />
          <Marks P={P} />
          <Panels P={P} />
        </MapFrame>
        {frame >= (P.beats[1]?.start ?? 0) - 4 && <TopBar chapter={bar} year={year} channel={P.ep.channel} />}
        {P.heads.length > 0 && <HeadCard heads={P.heads} from={P.heads[0].f} to={P.end} />}
        {P.overlays.map((o, i) => <OverlayCard key={i} {...o} />)}
        {P.notes.map((n, i) => <MapNote key={i} {...n} />)}
        {hook && <HookTitle lines={hook} until={P.beats[0].end} />}
        {P.beats.filter((b, i) => !(i === 0 && b.hook)).map((b) => (
          <Caption key={b.id} text={b.text} spoken={b.spoken} words={b.words} start={b.start} len={b.len} font={font} top={CAPTION_TOP} />
        ))}
      </AbsoluteFill>
    </LayoutCtx.Provider>
  );
};
