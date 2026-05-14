import type { RefObject } from "react";
import { useEffect, useState } from "react";

/**
 * Compute the scale needed to fit a 1920x1080 stage inside the current
 * viewport, leaving `marginX` / `marginY` of breathing room around it
 * (so absolutely-positioned UI like the progress bar isn't cropped).
 */
export function useStageScale(
  baseW = 1920,
  baseH = 1080,
  marginX = 80,
  marginY = 100,
  containerRef?: RefObject<HTMLElement | null>,
) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function update() {
      const rect = containerRef?.current?.getBoundingClientRect();
      const width = rect?.width ?? window.innerWidth;
      const height = rect?.height ?? window.innerHeight;
      const usefulW = Math.max(320, width - marginX * 2);
      const usefulH = Math.max(180, height - marginY * 2);
      setScale(Math.min(usefulW / baseW, usefulH / baseH));
    }
    update();
    const observed = containerRef?.current;
    const observer =
      observed && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(update)
        : null;
    if (observed && observer) observer.observe(observed);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [baseW, baseH, containerRef, marginX, marginY]);

  return scale;
}
