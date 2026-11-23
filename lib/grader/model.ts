import trained from "./model.json"

/**
 * The trained marking model. For each criterion of a built-in rubric, the grader measures the features below,
 * and weights learned from teacher-marked samples (see blind.test.ts) turn them into a mark.
 */
export interface Features {
  /** How clearly the criterion's strands show: in the best sections, across all sections, in the single best section, and the share of sections showing them. */
  top: number
  all: number
  best: number
  shown: number
  /** The weakest strand. */
  minTop: number
  structure: number
  fluency: number
  sophistication: number
  vocabulary: number
  variety: number
  sentenceFit: number
  longShare: number
  subordination: number
  evidence: number
  analysis: number
  /** Share of the expected length, capped at 1. */
  length: number
  words: number
  paragraphs: number
  avgSentence: number
  avgWord: number
  weakRate: number
  connectives: number
  transitions: number
  /** How strongly this criterion shows against the rubric's other criteria: their average and the strongest. */
  relTop: number
  relLead: number
  /** Retelling words per 100, and time markers. */
  narration: number
  timeFlow: number
}

export const MODEL = trained as unknown as {
  /** The level each criterion reaches on same-subject work not written for it, keyed "rubric label|criterion id". */
  bg: Record<string, number>
  bgAll: number
  /** Weights per kind of criterion, in featureVector order, with the constant term last. */
  groups: Record<string, number[]>
}

/** The model's inputs, each scaled to about 0–1. `background` is the criterion's level on work not written for it. */
export function featureVector(f: Features, background: number): number[] {
  const lift = Math.max(0, (f.top - background) / Math.max(0.15, 1 - background))
  return [
    f.top, f.all, f.best, f.shown, f.minTop, f.structure, f.fluency, f.sophistication, f.vocabulary, f.variety, f.sentenceFit, f.longShare, f.subordination, f.evidence, f.analysis, f.length,
    Math.log10(Math.max(20, f.words)) / 3.5,
    Math.min(f.paragraphs, 12) / 12,
    Math.min(f.avgSentence, 40) / 40,
    (f.avgWord - 3.5) / 2,
    Math.min(f.weakRate * 20, 1),
    Math.min(f.connectives, 1),
    Math.min(f.transitions, 3) / 3,
    f.top * f.sophistication,
    f.all * f.sophistication,
    f.shown * f.sophistication,
    lift,
    lift * f.sophistication,
    lift * f.all,
    f.relTop,
    f.relLead,
    Math.max(0, -f.relLead) * f.top,
    Math.min(f.narration, 6) / 6,
    Math.min(f.timeFlow, 1),
  ]
}

/** The share of the marks (0–1) the model gives, or undefined when there is no trained model for this kind of criterion. */
export function predict(group: string | undefined, x: number[], weights = group ? MODEL.groups[group] : undefined) {
  if (!weights || weights.length !== x.length + 1) return undefined
  return Math.max(0, Math.min(1, x.reduce((a, v, i) => a + v * weights[i], weights[x.length])))
}

/** Ridge regression: the weights (constant term last) that best turn each row of X into y, kept small by `lambda`. */
export function ridge(X: number[][], y: number[], lambda = 1): number[] {
  const rows = X.map((r) => [...r, 1])
  const n = rows[0].length
  // Normal equations: (XᵀX + λI) w = Xᵀy, with no penalty on the constant term.
  const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => rows.reduce((a, r) => a + r[i] * r[j], 0) + (i === j && i < n - 1 ? lambda : 0)))
  const b = Array.from({ length: n }, (_, i) => rows.reduce((a, r, k) => a + r[i] * y[k], 0))
  // Gaussian elimination with partial pivoting.
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r
    ;[A[col], A[pivot]] = [A[pivot], A[col]]
    ;[b[col], b[pivot]] = [b[pivot], b[col]]
    for (let r = col + 1; r < n; r++) {
      const k = A[r][col] / A[col][col]
      for (let j = col; j < n; j++) A[r][j] -= k * A[col][j]
      b[r] -= k * b[col]
    }
  }
  const w = new Array<number>(n).fill(0)
  for (let i = n - 1; i >= 0; i--) w[i] = (b[i] - A[i].slice(i + 1).reduce((a, v, j) => a + v * w[i + 1 + j], 0)) / A[i][i]
  return w
}
