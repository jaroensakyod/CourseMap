import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { MapFrame } from "../components/Map";
import { Raster } from "../components/Raster";
import { AnchorCtx, CLEAR, font, GOLD, LayoutCtx } from "../episodes/thaihistory/news/kit";
import { SCENES } from "./scenes.gen";

// Every catalogue scene for 60 frames, in id order, over a plain map — for the preview sheet (scripts/sb-catalog.mjs).
export const SCENE_IDS = Object.keys(SCENES).sort();
export const SCENE_PREVIEW_FRAMES = SCENE_IDS.length * 60;
const ANCHOR: [number, number] = [100.5, 13.75];

export const ScenePreview = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const s = Math.min(width, height) / 1080;
  const i = Math.min(SCENE_IDS.length - 1, Math.floor(frame / 60));
  const id = SCENE_IDS[i];
  const S = SCENES[id];
  const start = i * 60;
  return (
    <LayoutCtx.Provider value={{ compact: true, panelScale: CLEAR.panelScale, panelHide: 0 }}>
      <AbsoluteFill style={{ background: "#02060d" }}>
        <MapFrame cam={{ lon: 100.8, lat: 15.5, scale: 2600 }} focusY={CLEAR.focusY}>
          <Raster layers={[{ name: "world" }]} />
          <AnchorCtx.Provider value={ANCHOR}>
            <S id={`pv${i}`} start={start} end={start + 200} cue={start + 20} anchor={ANCHOR} />
          </AnchorCtx.Provider>
        </MapFrame>
        <div style={{ position: "absolute", top: height * 0.5, left: 0, right: 0, textAlign: "center", fontFamily: font, fontSize: 56 * s, fontWeight: 900, color: GOLD }}>{id}</div>
      </AbsoluteFill>
    </LayoutCtx.Provider>
  );
};
