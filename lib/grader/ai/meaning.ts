// Meaning matching: pure helpers shared by the browser (which runs the model) and the server (which scores).

/** Dot product; the model's vectors are normalised, so this is cosine similarity. */
export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}

/** Paragraph-sized pieces of the work (long ones split), so one on-task paragraph is enough to match. */
export function chunkText(text: string, maxChunks = 24): string[] {
  const pieces: string[] = []
  for (const para of text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)) {
    const words = para.split(/\s+/)
    for (let i = 0; i < words.length; i += 120) pieces.push(words.slice(i, i + 120).join(" "))
  }
  const useful = pieces.filter((p) => p.split(/\s+/).length >= 8)
  return (useful.length ? useful : [text.trim()]).filter(Boolean).slice(0, maxChunks)
}

/**
 * How well the work matches the task, 0–1, from the best paragraph's similarity.
 * Calibrated on all-MiniLM-L6-v2: work scored 0.32–0.74 against its own task and at most 0.30 against others,
 * so 0.15 counts as no match and 0.35 or more as a full match.
 */
export function coverageFromMatch(similarity: number): number {
  return Math.max(0, Math.min(1, (similarity - 0.15) / 0.2))
}
