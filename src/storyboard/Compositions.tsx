import { Composition } from "remotion";
import { SB_EPISODES } from "./registry.gen";
import { sbFrames, Storyboard } from "./Storyboard";
import { ScenePreview, SCENE_PREVIEW_FRAMES } from "./ScenePreview";

// Every storyboard episode as SB-<channel>-<episode> (9:16), plus the scene catalogue preview.
export const StoryboardCompositions = () => (
  <>
    {SB_EPISODES.map((e) => (
      <Composition key={e.id} id={e.id} component={Storyboard} defaultProps={{ data: e.data }} durationInFrames={sbFrames(e.data)} fps={30} width={1080} height={1920} />
    ))}
    <Composition id="ScenePreview" component={ScenePreview} durationInFrames={SCENE_PREVIEW_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
