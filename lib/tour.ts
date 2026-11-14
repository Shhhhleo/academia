/**
 * Pure helpers for the in-app guided tour (components/app/app-tour.tsx):
 * where to put the step card next to a highlighted element, and how the
 * "already seen" flag is stored. No DOM access, so it is unit-tested.
 */

export type Placement = "right" | "left" | "bottom" | "top"

export interface Rect {
  top: number
  left: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

export interface CardPosition {
  top: number
  left: number
  /** "center" when there is no target; "sheet" when nothing fits beside it (pinned to the bottom). */
  placement: Placement | "center" | "sheet"
}

export const TOUR_VERSION = 1
export const TOUR_START_EVENT = "academia:tour-start"

export function tourStorageKey(userId: string) {
  return `academia:tour:v${TOUR_VERSION}:${userId}`
}

/** Ask the mounted tour to start from the first step (used by the account menu). */
export function startTour() {
  window.dispatchEvent(new Event(TOUR_START_EVENT))
}

const OPPOSITE: Record<Placement, Placement> = { right: "left", left: "right", bottom: "top", top: "bottom" }

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, Math.max(min, max)))
}

/** Grows a rect by `pad` on every side (the spotlight sits a little outside the element). */
export function padRect(r: Rect, pad: number): Rect {
  return { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 }
}

/**
 * Positions a card of `card` size beside `target` inside the viewport.
 * Tries the preferred side, then its opposite, then the remaining sides.
 * If no side has room, the card is pinned to the bottom of the screen.
 */
export function placeCard(
  target: Rect | null,
  card: Size,
  viewport: Size,
  preferred: Placement = "bottom",
  gap = 14,
  margin = 16,
): CardPosition {
  const maxLeft = viewport.width - margin - card.width
  const maxTop = viewport.height - margin - card.height

  if (!target) {
    return {
      top: clamp((viewport.height - card.height) / 2, margin, maxTop),
      left: clamp((viewport.width - card.width) / 2, margin, maxLeft),
      placement: "center",
    }
  }

  const order: Placement[] = [preferred, OPPOSITE[preferred]]
  for (const p of ["bottom", "right", "top", "left"] as Placement[]) if (!order.includes(p)) order.push(p)

  const centerX = target.left + target.width / 2
  const centerY = target.top + target.height / 2

  for (const p of order) {
    if (p === "right" && target.left + target.width + gap + card.width <= viewport.width - margin) {
      return { placement: p, left: target.left + target.width + gap, top: clamp(centerY - card.height / 2, margin, maxTop) }
    }
    if (p === "left" && target.left - gap - card.width >= margin) {
      return { placement: p, left: target.left - gap - card.width, top: clamp(centerY - card.height / 2, margin, maxTop) }
    }
    if (p === "bottom" && target.top + target.height + gap + card.height <= viewport.height - margin) {
      return { placement: p, top: target.top + target.height + gap, left: clamp(centerX - card.width / 2, margin, maxLeft) }
    }
    if (p === "top" && target.top - gap - card.height >= margin) {
      return { placement: p, top: target.top - gap - card.height, left: clamp(centerX - card.width / 2, margin, maxLeft) }
    }
  }

  return { placement: "sheet", top: Math.max(margin, maxTop), left: clamp((viewport.width - card.width) / 2, margin, maxLeft) }
}
