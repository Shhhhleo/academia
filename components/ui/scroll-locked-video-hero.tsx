"use client"

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"

// ─────────────────────────────────────────────────────────────
// Locked scroll-scrub video hero.
// While the hero is at the top of the page, the body is pinned with
// position:fixed and wheel / touch / keyboard input drives
// video.currentTime forward and backward. When the film reaches its end
// and the visitor keeps going, the lock releases and the page scrolls on;
// scrolling back up to the very top re-engages it. Reduced motion skips the
// lock entirely and shows the final frame.
// ─────────────────────────────────────────────────────────────

export interface MetroHeroProps {
  videoSrc?: string
  /** Optional portrait cut, used when the viewport is taller than it is wide. */
  mobileVideoSrc?: string
  /** Final-frame stills, shown before the video loads and for reduced motion. */
  poster?: string
  mobilePoster?: string
  title?: ReactNode
  scrollHint?: string
  tagline?: ReactNode
  /** Rendered with the tagline once the film has finished (e.g. CTA buttons). */
  actions?: ReactNode
  signature?: { name: string; url: string } | false
  /** Total input distance (px) needed to scrub the full video. Tune to taste. */
  scrubDistance?: number
  /** Element id to scroll to when "Skip intro" is pressed. */
  skipTo?: string
  className?: string
  style?: CSSProperties
}

const DEFAULT_VIDEO = "https://cdn.21st.dev/assets/mirror/21/21a77eac28eacbb7e142016eefeaa0b4a766619e51113629a3bc6df6af066c0f.mp4"
const COL_BG = "#05070d"
const COL_TEXT = "#f2f4f8"
const RELEASE_PX = 140

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

export default function MetroHero({
  videoSrc = DEFAULT_VIDEO,
  mobileVideoSrc,
  poster,
  mobilePoster,
  title = "THE CITY OPENS",
  scrollHint = "SCROLL",
  tagline = "Every door in the city is already open.",
  actions,
  signature = false,
  scrubDistance = 3200,
  skipTo,
  className,
  style,
}: MetroHeroProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const taglineRef = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const skipRef = useRef<() => void>(() => {})
  const [ready, setReady] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [portrait, setPortrait] = useState(false)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const mqPortrait = window.matchMedia("(max-aspect-ratio: 1/1)")
    const sync = () => {
      setReduced(mqMotion.matches)
      setPortrait(mqPortrait.matches)
    }
    sync()
    mqMotion.addEventListener("change", sync)
    mqPortrait.addEventListener("change", sync)
    return () => {
      mqMotion.removeEventListener("change", sync)
      mqPortrait.removeEventListener("change", sync)
    }
  }, [])

  const src = portrait && mobileVideoSrc ? mobileVideoSrc : videoSrc
  const still = portrait && mobilePoster ? mobilePoster : poster

  useEffect(() => {
    const video = videoRef.current
    const section = sectionRef.current
    if (!video || !section || reduced) return

    let duration = 0
    let rafId = 0
    let targetProgress = 0
    let currentProgress = 0
    let hasStartedScrolling = false
    let isSeeking = false
    let pendingTime: number | null = null
    let locked = false
    let lockedScrollY = 0
    let touchStartY = 0
    let overscroll = 0
    let finishedShown = false

    const onLoadedData = () => {
      duration = video.duration || 0
      setReady(true)
    }
    video.addEventListener("loadeddata", onLoadedData)
    if (video.readyState >= 2) onLoadedData()

    // iOS Safari often won't buffer any video data until playback starts. Since we
    // only ever seek, force a silent play-then-pause on mount to kick off loading.
    const p = video.play()
    if (p && typeof p.then === "function") p.then(() => video.pause()).catch(() => {})
    else video.pause()

    const onSeeked = () => {
      isSeeking = false
      if (pendingTime !== null) {
        const t = pendingTime
        pendingTime = null
        isSeeking = true
        video.currentTime = t
      }
    }
    video.addEventListener("seeked", onSeeked)

    function seekTo(t: number) {
      if (isSeeking) {
        pendingTime = t
        return
      }
      isSeeking = true
      video!.currentTime = t
    }

    function engageLock() {
      if (locked) return
      locked = true
      overscroll = 0
      lockedScrollY = window.scrollY
      const b = document.body.style
      b.position = "fixed"
      b.top = `-${lockedScrollY}px`
      b.left = "0"
      b.right = "0"
      b.width = "100%"
      b.overscrollBehavior = "none"
    }

    function releaseLock() {
      if (!locked) return
      locked = false
      const y = lockedScrollY
      const b = document.body.style
      b.position = ""
      b.top = ""
      b.left = ""
      b.right = ""
      b.width = ""
      b.overscrollBehavior = ""
      window.scrollTo(0, y)
    }

    // Only lock when the visitor is actually at the top (a reload mid-page must not jump).
    if (window.scrollY < 4) engageLock()
    else targetProgress = currentProgress = 1

    /** Feeds input into the scrub. Returns true when the input was consumed by the hero. */
    function addDelta(deltaY: number): boolean {
      if (!locked) {
        // Scrolling back up at the very top re-engages the film from its end.
        if (deltaY < 0 && window.scrollY <= 0) {
          engageLock()
        } else return false
      }
      if (deltaY > 0 && targetProgress >= 0.999) {
        overscroll += deltaY
        if (overscroll > RELEASE_PX) {
          releaseLock()
          return false
        }
        return true
      }
      overscroll = 0
      targetProgress = clamp(targetProgress + deltaY / scrubDistance, 0, 1)
      if (targetProgress > 0.001) hasStartedScrolling = true
      return true
    }

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return // pinch-zoom
      if (addDelta(e.deltaY)) e.preventDefault()
    }
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? 0
    }
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? touchStartY
      const deltaY = (touchStartY - y) * 1.6
      touchStartY = y
      if (addDelta(deltaY) && e.cancelable) e.preventDefault()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest("input, textarea, select, [contenteditable]")) return
      if (e.key === " " && target?.closest("button, a")) return
      const step: Record<string, number> = {
        ArrowDown: 0.12,
        ArrowUp: -0.12,
        PageDown: 0.35,
        PageUp: -0.35,
        " ": e.shiftKey ? -0.35 : 0.35,
        End: 1,
        Home: -1,
      }
      if (!(e.key in step)) return
      const delta = step[e.key] * scrubDistance
      if (!locked && !(delta < 0 && window.scrollY <= 0)) return
      if (delta > 0 && targetProgress >= 0.999) {
        releaseLock()
        e.preventDefault()
        window.scrollBy({ top: window.innerHeight * 0.85, behavior: "smooth" })
        return
      }
      if (addDelta(delta)) e.preventDefault()
    }

    skipRef.current = () => {
      targetProgress = 1
      currentProgress = 1
      hasStartedScrolling = true
      releaseLock()
      const el = skipTo ? document.getElementById(skipTo) : null
      requestAnimationFrame(() => {
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
        else window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
      })
    }

    window.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("keydown", onKey)

    function frame() {
      currentProgress += (targetProgress - currentProgress) * 0.18
      if (Math.abs(targetProgress - currentProgress) < 0.0005) currentProgress = targetProgress
      if (duration > 0) seekTo(currentProgress * (duration - 0.05))

      if (videoRef.current) videoRef.current.style.transform = `scale(${1 + currentProgress * 0.015})`
      if (titleRef.current) {
        const t = 1 - clamp(currentProgress / 0.3, 0, 1)
        titleRef.current.style.opacity = String(t)
        titleRef.current.style.transform = `translateY(${(1 - t) * -24}px) scale(${0.96 + t * 0.04})`
        titleRef.current.style.filter = `blur(${(1 - t) * 10}px)`
      }
      if (hintRef.current) hintRef.current.style.opacity = hasStartedScrolling ? "0" : "1"
      if (taglineRef.current) {
        const t = clamp((currentProgress - 0.8) / 0.18, 0, 1)
        taglineRef.current.style.opacity = String(t)
        taglineRef.current.style.transform = `translateY(${(1 - t) * 20}px)`
        taglineRef.current.style.filter = `blur(${(1 - t) * 8}px)`
        const shown = t > 0.6
        if (shown !== finishedShown) {
          finishedShown = shown
          setFinished(shown)
        }
      }
      if (progressBarRef.current) progressBarRef.current.style.transform = `scaleX(${currentProgress})`
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)

    return () => {
      video.removeEventListener("loadeddata", onLoadedData)
      video.removeEventListener("seeked", onSeeked)
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("keydown", onKey)
      cancelAnimationFrame(rafId)
      releaseLock()
    }
  }, [scrubDistance, reduced, src, skipTo])

  const showEnd = reduced || finished

  return (
    <div
      ref={sectionRef}
      className={className}
      style={{
        position: "relative",
        height: "100dvh",
        minHeight: 560,
        width: "100%",
        overflow: "hidden",
        background: COL_BG,
        touchAction: reduced ? "auto" : "none",
        ...style,
      }}
    >
      {reduced ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={still} alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <video
          key={src}
          ref={videoRef}
          src={src}
          poster={still}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: ready ? 1 : 0.999,
            transformOrigin: "center center",
            willChange: "transform",
            touchAction: "none",
            pointerEvents: "none",
          }}
        />
      )}

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(5,7,13,0.55), rgba(5,7,13,0) 26%, rgba(5,7,13,0) 58%, rgba(5,7,13,0.75) 78%, rgba(5,7,13,0.97) 100%)",
          pointerEvents: "none",
        }}
      />

      {!reduced && (
        <div
          ref={titleRef}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 6%",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(38px, 7vw, 104px)",
              lineHeight: 1,
              letterSpacing: "-0.035em",
              color: COL_TEXT,
              textShadow: "0 4px 30px rgba(0,0,0,0.5)",
              willChange: "transform, filter, opacity",
              maxWidth: "14ch",
            }}
          >
            {title}
          </h1>
        </div>
      )}

      <div
        ref={taglineRef}
        inert={!showEnd}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "0 6% clamp(24px, 5.5vh, 60px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          textAlign: "center",
          opacity: reduced ? 1 : 0,
          zIndex: 3,
        }}
      >
        {reduced && (
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(34px, 5.5vw, 72px)",
              lineHeight: 1.02,
              letterSpacing: "-0.035em",
              color: COL_TEXT,
            }}
          >
            {title}
          </h1>
        )}
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            fontSize: "clamp(17px, 2.2vw, 24px)",
            lineHeight: 1.35,
            color: "rgba(242,244,248,0.9)",
            maxWidth: "36ch",
            textWrap: "balance",
          }}
        >
          {tagline}
        </p>
        {actions}
      </div>

      {!reduced && (
        <div
          ref={hintRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            bottom: "clamp(20px, 6vh, 48px)",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            color: "rgba(240,244,248,0.75)",
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(10px, 1.4vw, 12px)",
            fontWeight: 600,
            letterSpacing: "0.3em",
            transition: "opacity 0.4s ease",
            pointerEvents: "none",
          }}
        >
          <span>{scrollHint}</span>
          <svg width="14" height="18" viewBox="0 0 14 18" style={{ animation: "metro-hero-bounce 1.6s ease-in-out infinite" }}>
            <style>{`
              @keyframes metro-hero-bounce {
                0%, 100% { transform: translateY(0); opacity: 0.5; }
                50% { transform: translateY(5px); opacity: 1; }
              }
            `}</style>
            <path d="M7 1 L7 17 M2 12 L7 17 L12 12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {!reduced && !finished && (
        <button
          type="button"
          onClick={() => skipRef.current()}
          style={{
            position: "absolute",
            right: "clamp(12px, 2.5vw, 28px)",
            bottom: "clamp(14px, 3vh, 28px)",
            zIndex: 4,
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(10,12,18,0.45)",
            color: "rgba(242,244,248,0.85)",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 500,
            backdropFilter: "blur(8px)",
            cursor: "pointer",
          }}
          className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Skip intro
        </button>
      )}

      {/* Thin progress line, fills as the video advances. */}
      {!reduced && (
        <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: "rgba(255,255,255,0.12)" }}>
          <div
            ref={progressBarRef}
            style={{
              height: "100%",
              width: "100%",
              background: "linear-gradient(90deg, rgba(165,180,252,0.6), rgba(129,140,248,1))",
              transform: "scaleX(0)",
              transformOrigin: "left center",
            }}
          />
        </div>
      )}

      {signature && (
        <span style={{ position: "absolute", left: "clamp(12px, 2.5vw, 24px)", bottom: "clamp(10px, 2vw, 18px)", fontSize: 12, color: "rgba(220,224,232,0.6)", zIndex: 2 }}>
          by{" "}
          <a href={signature.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
            {signature.name}
          </a>
        </span>
      )}
    </div>
  )
}
