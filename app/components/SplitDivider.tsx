"use client";

import {
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import {
  clampSplitWidth,
  splitLimits,
  splitWidthForKey,
} from "@/app/lib/utils";

// The CSS variable the workspace grid reads for the card column width.
export const splitWidthVar = "--split-card-width";

type SplitDividerProps = {
  // The two-column grid; its first child is the card column.
  gridRef: RefObject<HTMLDivElement | null>;
  width: number | null;
  onChange: (width: number | null) => void;
};

function measure(grid: HTMLDivElement) {
  const cards = grid.firstElementChild as HTMLElement | null;
  return {
    width: cards?.getBoundingClientRect().width ?? 0,
    containerWidth: grid.clientWidth,
  };
}

// A vertical bar between the cards and the map (desktop only). Drag it,
// or focus it and use the arrow keys, to give either side more room.
// Double-click or Enter goes back to the default layout.
export function SplitDivider({ gridRef, width, onChange }: SplitDividerProps) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);

  // While dragging, the new width is written straight onto the grid's CSS
  // variable instead of React state: the workspace is a large tree, and
  // re-rendering it on every mouse move would make the drag stutter. The
  // final width goes through React (and localStorage) once, on release.
  function setLiveWidth(next: number) {
    gridRef.current?.style.setProperty(splitWidthVar, `${next}px`);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const grid = gridRef.current;
    if (!grid || event.button !== 0) return;

    event.preventDefault();
    // Capture keeps the move events coming to this bar even when the
    // pointer runs over the map, which would otherwise swallow them.
    event.currentTarget.setPointerCapture(event.pointerId);
    const { width: startWidth } = measure(grid);
    drag.current = { startX: event.clientX, startWidth };
    setLiveWidth(startWidth);
    document.body.style.cursor = "col-resize";
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const grid = gridRef.current;
    if (!drag.current || !grid) return;

    setLiveWidth(
      clampSplitWidth(
        drag.current.startWidth + event.clientX - drag.current.startX,
        grid.clientWidth,
      ),
    );
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const grid = gridRef.current;
    if (!drag.current || !grid) return;

    const moved = event.clientX - drag.current.startX;
    const startWidth = drag.current.startWidth;
    drag.current = null;
    document.body.style.cursor = "";
    // A click without movement puts the layout back as it was.
    if (moved === 0) {
      if (width === null) grid.style.removeProperty(splitWidthVar);
      else setLiveWidth(width);
      return;
    }
    onChange(clampSplitWidth(startWidth + moved, grid.clientWidth));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const grid = gridRef.current;
    if (!grid) return;

    const { width: current, containerWidth } = measure(grid);
    const next = splitWidthForKey(
      event.key,
      event.shiftKey,
      current,
      containerWidth,
    );
    if (next === null) return;

    event.preventDefault();
    onChange(next === "reset" ? null : next);
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the map"
      aria-valuemin={splitLimits.cardMinWidth}
      aria-valuenow={width ?? undefined}
      aria-valuetext={
        width === null ? "Default width" : `Cards ${width} pixels wide`
      }
      tabIndex={0}
      title="Drag to resize. Double-click to reset."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={() => onChange(null)}
      onKeyDown={handleKeyDown}
      className="group absolute inset-y-4 -left-6 hidden w-6 cursor-col-resize touch-none items-center justify-center outline-none lg:flex"
    >
      {/* A thin line that shows on hover and focus, with a grip in the
          middle that is always visible. */}
      <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-accent opacity-0 transition group-hover:opacity-60 group-focus-visible:opacity-100" />
      <span className="relative h-10 w-1.5 rounded-full bg-line-strong transition group-hover:bg-accent group-focus-visible:bg-accent" />
    </div>
  );
}
