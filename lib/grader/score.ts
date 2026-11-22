import { DEFAULT_DP_BOUNDARIES, mypGradeFromTotal, percentToGrade } from "@/lib/grades"
import { builtInRubric, EXPECTED_WORDS, type CriterionResult, type GradeRequest, type GradeResult, type Kind, type RubricCriterion } from "./rubrics"

const clamp = (n: number) => Math.max(0, Math.min(1, n))
const count = (text: string, re: RegExp) => text.match(re)?.length ?? 0
const phrases = (list: string) => new RegExp(`\\b(?:${list})\\b`, "gi")

const TRANSITIONS = phrases("firstly|secondly|furthermore|moreover|in addition|additionally|however|on the other hand|consequently|finally|similarly|in contrast|in conclusion|to conclude|overall")
const CONNECTIVES = phrases("because|therefore|thus|hence|this shows|this suggests|this implies|this demonstrates|this highlights|as a result|which means|consequently|although|whereas|due to|so that")
const EXAMPLES = phrases("for example|for instance|such as|e\\.g\\.|according to|as seen in|as shown")
const FRAMING = phrases("in conclusion|to conclude|in summary|to summarise|to summarize|overall|this essay|this report|introduction|conclusion")
// IB command terms say what to do, not what to write about, so a task's own terms skip them.
const COMMAND_TERMS = new Set("analyse analyze evaluate discuss explain describe compare contrast examine justify outline identify define suggest investigate explore consider assess write answer question respond using include".split(" ").map((w) => w.slice(0, 7)))
const STOP = new Set("about above after again against because been before being below between both could does doing down during each from further have having here how into itself more most other ought over same should some such than that their theirs them then there these they this those through under until very what when where which while whom with would your yours will shall must also only just like make made many much well were the and for are but not you all any can her was one our out who get has him his how its may new now old see two way use".split(" "))

/** Measurable signals of quality, each 0–1. */
export function analyse(text: string, expectedWords: number) {
  const lower = text.toLowerCase()
  const words = lower.match(/[a-z][a-z'-]*/g) ?? []
  const sentences = text.split(/[.!?]+(?:\s+|$)/).map((s) => s.trim().split(/\s+/).length).filter((n) => n > 2)
  let paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().split(/\s+/).length >= 15).length
  if (paragraphs <= 1) paragraphs = Math.max(paragraphs, text.split(/\n/).filter((p) => p.trim().split(/\s+/).length >= 15).length)

  const n = words.length
  const sample = words.slice(0, 300)
  const ttr = sample.length ? new Set(sample).size / sample.length : 0
  const avgWord = n ? words.join("").length / n : 0
  const avgSentence = sentences.length ? sentences.reduce((a, b) => a + b, 0) / sentences.length : 0
  const sd = sentences.length > 1 ? Math.sqrt(sentences.reduce((a, b) => a + (b - avgSentence) ** 2, 0) / sentences.length) : 0
  const evidenceHits =
    count(text, /["“][^"”]{3,}["”]/g) + count(text, EXAMPLES) + count(text, /\([A-Z][A-Za-z.&\s]+,?\s\d{4}\)|\[\d+\]/g) + Math.min(count(text, /\b\d+(?:\.\d+)?%?/g), 6) / 2

  return {
    words: n,
    length: clamp(n / expectedWords),
    structure:
      (clamp(paragraphs / (expectedWords >= 500 ? 5 : 3)) + (count(text, FRAMING) > 0 ? 1 : 0) + clamp(count(text, TRANSITIONS) / Math.max(2, n / 150))) / 3,
    evidence: clamp(evidenceHits / Math.max(2, n / 200)),
    analysis: clamp(count(text, CONNECTIVES) / Math.max(2, sentences.length * 0.25)),
    vocabulary: 0.6 * clamp((ttr - 0.35) / 0.3) + 0.4 * clamp((avgWord - 3.8) / 1.4),
    variety: clamp(sd / 8),
    sentenceFit: avgSentence >= 12 && avgSentence <= 26 ? 1 : avgSentence ? 0.5 : 0,
    lower,
    tokens: new Set(words),
  }
}
type Signals = ReturnType<typeof analyse>

function keywordHits(c: RubricCriterion, s: Signals) {
  const found: string[] = []
  const missing: string[] = []
  for (const k of c.keywords) {
    // Show the student the word they actually wrote, not the stem.
    const word = k.includes(" ") ? (s.lower.includes(k) ? k : undefined) : [...s.tokens].find((t) => t.startsWith(k))
    if (word) found.push(word)
    else missing.push(k.includes(" ") || k.length > 5 ? k : `${k}…`)
  }
  return { found, missing }
}

const LEVEL = ["limited", "adequate", "substantial", "excellent"] as const

function scoreCriterion(c: RubricCriterion, s: Signals, expected: number, mypBands: boolean, taskFit = 1): CriterionResult & { fraction: number } {
  const { found, missing } = keywordHits(c, s)
  const kw = c.keywords.length ? clamp(found.length / Math.min(c.keywords.length, 6)) : s.structure
  const language = 0.5 * s.vocabulary + 0.3 * s.variety + 0.2 * s.sentenceFit
  const raw: Record<Kind, number> = {
    content: 0.45 * kw + 0.2 * s.evidence + 0.25 * s.analysis + 0.1 * s.structure,
    organisation: 0.5 * s.structure + 0.2 * kw + 0.15 * s.evidence + 0.15 * language,
    language: 0.7 * language + 0.3 * s.structure,
  }
  // Short work can't show a criterion fully, however good the sentences are.
  const fraction = s.words < 20 ? 0 : clamp(raw[c.kind] * (0.35 + 0.65 * s.length) * (c.kind === "content" ? taskFit : 1))
  const score = Math.round(fraction * c.max)
  // Quarters of the scale, matching MYP bands: 1–2 limited, 3–4 adequate, 5–6 substantial, 7–8 excellent.
  const level = LEVEL[Math.min(3, Math.max(0, Math.ceil((score / c.max) * 4) - 1))]

  const strengths: string[] = []
  const improvements: string[] = []
  if (c.kind === "content") {
    if (found.length >= 3) strengths.push(`You cover key ideas this criterion rewards (${found.slice(0, 4).join(", ")}).`)
    else if (missing.length) improvements.push(`Address more of what this criterion looks for, e.g. ${missing.slice(0, 4).join(", ")}.`)
    if (s.analysis >= 0.6) strengths.push("You explain why and how, not just what.")
    else improvements.push("Follow each point with its significance: \"this shows…\", \"because…\", \"as a result…\".")
    if (s.evidence >= 0.6) strengths.push("Your points are backed by evidence, examples or data.")
    else improvements.push("Support each point with a quote, an example or data.")
  } else if (c.kind === "organisation") {
    if (s.structure >= 0.6) strengths.push("Clear structure with paragraphs and linking words.")
    else improvements.push("Organise the work into paragraphs with an introduction and a conclusion, and link ideas (furthermore, however, therefore).")
    if (s.evidence < 0.3) improvements.push("Reference your sources and examples clearly (author, year) with a bibliography where relevant.")
  } else {
    if (s.vocabulary >= 0.6) strengths.push("Varied, precise vocabulary.")
    else improvements.push("Use more precise subject vocabulary and avoid repeating the same words.")
    if (s.variety >= 0.5) strengths.push("A good mix of sentence lengths.")
    else improvements.push("Vary your sentences: combine short choppy ones and split very long ones.")
  }
  if (s.length < 0.6) improvements.push(`At about ${s.words} words the work is short for this task; aim for roughly ${expected}.`)

  const band = mypBands ? (score === 0 ? "0" : `${Math.ceil(score / 2) * 2 - 1}–${Math.ceil(score / 2) * 2}`) : level[0].toUpperCase() + level.slice(1)
  const justification =
    c.kind === "content" && c.keywords.length
      ? `Shows ${level} ${c.name.toLowerCase()}: ${found.length} of the ${c.keywords.length} key ideas for this criterion appear, with ${s.analysis >= 0.5 ? "regular" : "little"} explanation and ${s.evidence >= 0.5 ? "good" : "limited"} supporting evidence.`
      : `Shows ${level} ${c.name.toLowerCase()} based on the work's ${c.kind === "language" ? "vocabulary range and sentence variety" : "paragraphing, linking words and referencing"}.`

  return { id: c.id, name: c.name, score, max: c.max, band, justification, strengths, improvements, fraction }
}

/** Reads criteria out of a student-supplied rubric, e.g. "Criterion A: Analysing (0–8)". */
export function parseRubric(text: string, defaultMax: number): RubricCriterion[] {
  const out: (RubricCriterion & { desc: string })[] = []
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:criterion\s+)?([A-E])\s*[:.)\-–—]\s*(.+)$/i)
    if (m && (/criterion/i.test(line) || m[1] === m[1].toUpperCase())) {
      const max = Number(m[2].match(/(?:0\s*[-–]\s*|max(?:imum)?:?\s*|\/\s*|out of\s*)(\d{1,2})/i)?.[1] ?? defaultMax)
      const name = m[2].replace(/\(.*?\)|\[.*?\]|max(?:imum)?:?\s*\d+|\/\s*\d+|out of\s*\d+/gi, "").replace(/[\s:–—-]+$/, "").trim()
      if (!name) continue
      const kind: Kind = /organi|structur|presentation|communicat/i.test(name) ? "organisation" : /language|style|grammar|writing|speaking/i.test(name) ? "language" : "content"
      out.push({ id: m[1].toUpperCase(), name, max: max > 0 ? max : defaultMax, kind, keywords: [], desc: name })
    } else if (out.length) out[out.length - 1].desc += ` ${line}`
  }
  return out.map(({ desc, ...crit }) => ({ ...crit, keywords: keywordsFrom(desc, 10) }))
}

function keywordsFrom(text: string, limit: number) {
  const words = text.toLowerCase().match(/[a-z]{5,}/g) ?? []
  return [...new Set(words.filter((w) => !STOP.has(w)).map((w) => w.slice(0, 7)))].slice(0, limit)
}

export function gradeTask(input: GradeRequest, text: string): GradeResult {
  const isMyp = input.programme === "MYP"
  const base = EXPECTED_WORDS[input.taskType]
  const fixedLength = ["Internal assessment (IA)", "Extended essay", "TOK essay"].includes(input.taskType)
  const expected = Math.round(fixedLength ? base : base * (isMyp ? 0.6 + 0.1 * input.year : 1.2))

  const caveats = ["This is an automatic estimate: it checks your work for what the rubric rewards (key ideas, evidence, explanation, structure and language), but it can't judge whether your ideas are correct. Use it as a guide before your teacher marks it."]
  let { label, criteria } = builtInRubric(input.programme, input.subjectGroup, input.taskType)
  if (input.rubric?.trim()) {
    const custom = parseRubric(input.rubric, isMyp ? 8 : 10)
    if (custom.length) {
      ;({ label, criteria } = { label: "your rubric", criteria: custom })
    } else {
      // Not a criteria list (probably a task sheet): use its words as extra ideas the content criteria reward.
      const extra = keywordsFrom(input.rubric, 8)
      criteria = criteria.map((cr) => (cr.kind === "content" ? { ...cr, keywords: [...cr.keywords, ...extra] } : cr))
      caveats.push("Your rubric had no criteria lines (like \"Criterion A: Analysing (0–8)\"), so the built-in IB criteria were used, with your task sheet's key terms added.")
    }
  }
  if (isMyp && input.subjectGroup === "Language acquisition" && !input.rubric) caveats.push("Listening and speaking are normally assessed from audio; written work only gives a rough indication for those criteria.")

  const signals = analyse(text, expected)
  const taskTerms = input.task?.trim() ? keywordsFrom(input.task, 20).filter((k) => !COMMAND_TERMS.has(k)).slice(0, 10) : []
  const taskWords = input.task?.toLowerCase().match(/[a-z]{5,}/g) ?? []
  const missedTask = taskTerms.filter((k) => ![...signals.tokens].some((t) => t.startsWith(k))).map((k) => taskWords.find((w) => w.startsWith(k)) ?? k)
  // Off-task work loses up to 40% on content criteria; covering 70% of the task's terms counts as on task.
  const taskFit = taskTerms.length ? 0.6 + 0.4 * clamp((1 - missedTask.length / taskTerms.length) / 0.7) : 1
  const results = criteria.map((cr) => scoreCriterion(cr, signals, expected, isMyp && cr.max === 8, taskFit))
  const total = results.reduce((a, r) => a + r.score, 0)
  const max = results.reduce((a, r) => a + r.max, 0)
  const overall = isMyp ? mypGradeFromTotal(Math.round((total / max) * 32)) : percentToGrade((total / max) * 100, DEFAULT_DP_BOUNDARIES)

  const ranked = [...results].sort((a, b) => a.fraction - b.fraction)
  const improvements = ranked.flatMap((r) => r.improvements)
  if (missedTask.length > taskTerms.length / 2) {
    improvements.unshift(`Answer the task directly: it asks about ${missedTask.slice(0, 4).join(", ")}, which your work barely mentions.`)
  }
  const next = [...new Set(improvements)].slice(0, 5)
  const taskLine = taskTerms.length ? ` Task fit: ${taskTerms.length - missedTask.length} of ${taskTerms.length} key terms from the task appear.` : ""
  const summary =
    signals.words < 20
      ? "There isn't enough text to grade. Upload the full piece of work or paste it in."
      : `${signals.words} words graded against ${label}. Strongest: ${ranked.at(-1)!.name} (${ranked.at(-1)!.score}/${ranked.at(-1)!.max}). Most room to improve: ${ranked[0].name} (${ranked[0].score}/${ranked[0].max}).${taskLine}`

  return {
    overall_grade: overall,
    summary,
    criteria: results.map((r) => ({ id: r.id, name: r.name, score: r.score, max: r.max, band: r.band, justification: r.justification, strengths: r.strengths, improvements: r.improvements })),
    next_steps: next,
    caveats: caveats.join(" "),
  }
}
