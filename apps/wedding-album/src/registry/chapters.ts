import type { ChapterDef } from "./types";
import WeddingStoryChapter from "../chapters/01-wedding-story/WeddingStory";
import { narrations as weddingStoryNarrations } from "../chapters/01-wedding-story/narrations";

/**
 * Order = order of presentation.
 *
 * Each chapter MUST provide a `narrations: Narration[]` array. Its length
 * is the chapter's step count — there is no `totalSteps` to maintain
 * separately. This guarantees the audio synthesis pipeline, the runtime
 * stepper, and the chapter `.tsx` switch on `step` cannot drift apart.
 *
 * Visual styling (color, fonts) comes entirely from the active theme —
 * chapters never hard-code palette / font names. See THEMES.md.
 */
export const CHAPTERS: ChapterDef[] = [
  {
    id: "wedding-story",
    title: "婚纱电子相册",
    narrations: weddingStoryNarrations,
    Component: WeddingStoryChapter,
  },
];
