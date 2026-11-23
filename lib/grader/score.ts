import { DEFAULT_DP_BOUNDARIES, mypGradeFromTotal, percentToGrade } from "@/lib/grades"
import { coverageFromMatch } from "./ai/meaning"
import { builtInRubric, EXPECTED_WORDS, isLanguageGroup, type CriterionResult, type GradeRequest, type GradeResult, type Kind, type Mode, type RubricCriterion } from "./rubrics"

const clamp = (n: number) => Math.max(0, Math.min(1, n))
const count = (text: string, re: RegExp) => text.match(re)?.length ?? 0
const phrases = (list: string) => new RegExp(`\\b(?:${list})\\b`, "gi")

const TRANSITIONS = phrases("firstly|secondly|furthermore|moreover|in addition|additionally|however|on the other hand|consequently|finally|similarly|in contrast|in conclusion|to conclude|overall")
const CONNECTIVES = phrases("because|therefore|thus|hence|this shows|this suggests|this implies|this demonstrates|this highlights|as a result|which means|consequently|although|whereas|due to|so that")
const EXAMPLES = phrases("for example|for instance|such as|e\\.g\\.|according to|as seen in|as shown")
const FRAMING = phrases("in conclusion|to conclude|in summary|to summarise|to summarize|overall|this essay|this report|introduction|conclusion")
// Signals of narrative and descriptive craft.
const SPEECH = phrases("said|asked|replied|whispered|shouted|called|cried|muttered|yelled|answered|laughed|snapped|murmured")
const SENSORY = phrases(
  "saw|watched|glimpsed|glanced|stared|heard|listened|echo|echoed|whisper|whispered|roar|roared|hum|hums|hummed|buzz|crackle|crackles|crackled|creak|creaked|thud|smell|smelled|smelt|scent|stench|aroma|taste|tasted|sweet|sweetness|bitter|sour|salty|felt|feel|touch|rough|smooth|soft|sharp|cold|icy|warm|hot|damp|wet|sticky|bright|dim|dark|glow|glowed|glowing|glinting|shimmer|shimmered|sparkle|golden|amber|crimson|silver|shadow|shadows|silence|silent|loud|quiet|freezing|trembled|shiver|shivered|breath|heartbeat|pounding|shrieks|barks|steams|stinging",
)
const TIME = phrases("suddenly|then|later|afterwards|meanwhile|that night|that morning|that evening|the next day|the next morning|moments later|before long|at last|as soon as|just then|without warning|eventually|at first|soon|by the time")
// Signals of persuasive writing.
const ADDRESS = phrases("you|your|we|our|us")
const MODALS = phrases("should|must|need to|have to|it is time|cannot afford")
const CALL_TO_ACTION = phrases("so i ask you|i urge|join us|sign|let us|let's|take action|together we|act now|in conclusion|to conclude")
const COUNTER = phrases("some people (?:say|argue|believe|think)|others (?:say|argue|believe|think)|critics|opponents|admittedly|it is true that|while some")
// Words that make literary analysis recognisable, and plain words a story should replace.
const LITERARY = phrases("the author|the poet|the writer|the narrator|the reader|theme|symbol|symbolism|imagery|metaphor|suggests|connotations?|portrays|conveys|stanza|the text")
const WEAK = phrases("went|got|nice|good|bad|very|really|thing|things|stuff|a lot|lots")
// IB command terms and text forms say what to do, not what to write about, so a task's own terms skip them.
const COMMAND_TERMS = new Set(
  "analyse analyze evaluate discuss explain describe compare contrast examine justify outline identify define suggest investigate explore consider assess write answer question respond using include narrative story stories speech essay letter article report persuade persuasive descriptive paragraph minimum maximum sensory detail details dialogue imagery techniques language devices features"
    .split(" ")
    .map((w) => w.slice(0, 7)),
)
const MODE_NAME: Record<Mode, string> = { analytical: "analytical writing", narrative: "narrative or descriptive writing", persuasive: "persuasive writing", informative: "informative writing" }
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
  const timeFlow = clamp(count(text, TIME) / Math.max(2, n / 100))
  const firsts = text.split(/[.!?]+["”]?\s+/).map((s) => s.trim().toLowerCase().match(/^["“]?([a-z']+)/)?.[1]).filter(Boolean)
  const blockScore = clamp(text.split(/\n\s*\n/).filter((p) => p.trim()).length / (expectedWords >= 500 ? 6 : 4))
  const paraScore = clamp(paragraphs / (expectedWords >= 500 ? 5 : 3))
  const linkScore = clamp(count(text, TRANSITIONS) / Math.max(2, n / 150))

  return {
    words: n,
    length: clamp(n / expectedWords),
    structure: (paraScore + (count(text, FRAMING) > 0 ? 1 : 0) + linkScore) / 3,
    // An argument ends on a call to action rather than "in conclusion".
    argumentStructure: (paraScore + (count(text, CALL_TO_ACTION) > 0 ? 1 : 0) + linkScore) / 3,
    blockScore,
    evidence: clamp(evidenceHits / Math.max(2, n / 200)),
    analysis: clamp(count(text, CONNECTIVES) / Math.max(2, sentences.length * 0.25)),
    vocabulary: 0.6 * clamp((ttr - 0.35) / 0.3) + 0.4 * clamp((avgWord - 3.8) / 1.4),
    variety: clamp(sd / 8),
    sentenceFit: avgSentence >= 12 && avgSentence <= 26 ? 1 : avgSentence ? 0.5 : 0,
    // Narrative and descriptive craft.
    dialogue: clamp(Math.min(count(text, /["“][^"”]{2,160}["”]/g), count(text, SPEECH)) / 3),
    sensory: clamp(count(text, SENSORY) / Math.max(3, n / 30)),
    figurative: clamp((count(text, /\blike (?:a|an|the|small|some)\b/gi) + count(text, /\bas \w+ as\b/gi) + count(text, /\bas if\b/gi)) / 2),
    timeFlow,
    openings: firsts.length > 2 ? clamp((new Set(firsts).size / firsts.length - 0.4) / 0.5) : 0,
    storyStructure: (blockScore + timeFlow) / 2,
    weakWords: [...new Set(lower.match(WEAK) ?? [])],
    weakRate: n ? (lower.match(WEAK)?.length ?? 0) / n : 0,
    // Persuasive technique: rhetorical questions, direct address, modal verbs, a counter-argument.
    persuasion:
      (clamp(count(text, /\?/g) / 2) + clamp((count(text, ADDRESS) / Math.max(1, n)) * 25) + clamp(count(text, MODALS) / 3) + (count(text, COUNTER) > 0 ? 1 : 0)) / 4,
    literary: count(text, LITERARY),
    lower,
    tokens: new Set(words),
  }
}
type Signals = ReturnType<typeof analyse>

/** Task wording that gives away the type of writing, checked in order (analysis first: "analyse … the story"). */
const TASK_MODES: [RegExp, Mode][] = [
  [/analy[sz]|commentary|literary|how does the (?:author|poet|writer|director|playwright)|compare how/i, "analytical"],
  [/persua|\bargue|argument|speech|convince|debate|letter to the editor|op-?ed|opinion piece|campaign|proposal/i, "persuasive"],
  [/narrative|story|stories|creative writing|diary|journal entry|recount|imagine (?:you|that)|memoir|monologue|descriptive|sensory|describe\b.{0,30}\b(?:place|scene|person|moment|setting|market|room|memory|journey|day)/i, "narrative"],
  [/report|article|explain|inform|instructions|guide|leaflet|brochure|summar|blog|news/i, "informative"],
]

/** The type of writing: from the task's wording, else the task type, else the writing itself. */
export function detectMode(task: string | undefined, taskType: string, text: string): { mode: Mode; from: "task" | "type" | "work" } {
  const hit = task?.trim() ? TASK_MODES.find(([re]) => re.test(task)) : undefined
  if (hit) return { mode: hit[1], from: "task" }
  if (taskType === "Lab report") return { mode: "informative", from: "type" }
  const s = analyse(text, 300)
  const literary = Math.min(1, s.literary / 3)
  const scores: [Mode, number][] = [
    ["narrative", s.dialogue + s.timeFlow + s.sensory + 0.5 * s.figurative - literary],
    ["persuasive", 2.5 * s.persuasion - literary],
    ["analytical", literary + s.analysis],
  ]
  const [mode, score] = scores.sort((a, b) => b[1] - a[1])[0]
  return { mode: score >= 1 ? mode : "analytical", from: "work" }
}

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

function scoreCriterion(
  c: RubricCriterion,
  s: Signals,
  expected: number,
  mypBands: boolean,
  taskFit = 1,
  mode: Mode = "analytical",
  judgeByType = false,
  descriptive = false,
): CriterionResult & { fraction: number } {
  const story = mode === "narrative"
  const persuade = mode === "persuasive"
  const { found, missing } = keywordHits(c, s)
  // Depth and support mean different things in a story, a description, an argument and an analysis.
  const depth = story ? (descriptive ? s.sensory : 0.5 * s.sensory + 0.5 * s.figurative) : persuade ? 0.6 * s.analysis + 0.4 * s.persuasion : s.analysis
  const support = story ? (descriptive ? s.figurative : clamp(0.6 * s.dialogue + 0.6 * s.timeFlow)) : s.evidence
  const structure = story ? (descriptive ? (s.blockScore + s.openings) / 2 : s.storyStructure) : persuade ? s.argumentStructure : s.structure
  const vocabulary = story ? s.vocabulary * (1 - 0.5 * clamp(s.weakRate * 15)) : s.vocabulary
  const language = story ? 0.4 * vocabulary + 0.3 * s.variety + 0.3 * s.openings : 0.5 * vocabulary + 0.3 * s.variety + 0.2 * s.sentenceFit
  // Language rubrics' keywords describe literary analysis, so other writing is judged by its own craft instead.
  const kw = judgeByType
    ? story
      ? 0.5 * s.sensory + 0.5 * s.openings
      : persuade
        ? s.persuasion
        : 0.5 * s.evidence + 0.5 * s.structure
    : c.keywords.length
      ? clamp(found.length / Math.min(c.keywords.length, 6))
      : structure
  const raw: Record<Kind, number> = {
    content: 0.45 * kw + 0.2 * support + 0.25 * depth + 0.1 * structure,
    organisation: 0.5 * structure + 0.2 * kw + 0.15 * support + 0.15 * language,
    language: 0.7 * language + 0.3 * structure,
  }
  // Short work can't show a criterion fully, however good the sentences are.
  const fraction = s.words < 20 ? 0 : clamp(raw[c.kind] * (0.35 + 0.65 * s.length) * (c.kind === "content" ? taskFit : 1))
  const score = Math.round(fraction * c.max)
  // Quarters of the scale, matching MYP bands: 1–2 limited, 3–4 adequate, 5–6 substantial, 7–8 excellent.
  const level = LEVEL[Math.min(3, Math.max(0, Math.ceil((score / c.max) * 4) - 1))]

  const strengths: string[] = []
  const improvements: string[] = []
  if (c.kind === "content") {
    if (!judgeByType) {
      if (found.length >= 3) strengths.push(`You cover key ideas this criterion rewards (${found.slice(0, 4).join(", ")}).`)
      else if (missing.length) improvements.push(`Address more of what this criterion looks for, e.g. ${missing.slice(0, 4).join(", ")}.`)
    }
    if (story) {
      if (depth >= 0.6) strengths.push("Vivid sensory detail and imagery bring the writing to life.")
      else improvements.push("Show, don't tell: let the reader see, hear and feel the moment through sensory detail and a simile or metaphor, instead of naming the feeling.")
      if (descriptive) {
        if (support >= 0.6) strengths.push("Figurative language makes the scene come alive.")
        else improvements.push("Add figurative language (a simile, a metaphor or personification) to make the scene come alive.")
      } else if (support >= 0.6) strengths.push("The writing moves clearly through time, with dialogue or time markers.")
      else improvements.push("Move the story along with dialogue and time markers (\"moments later\", \"that night\"), building towards a turning point.")
    } else if (persuade) {
      if (depth >= 0.6) strengths.push("Your claims are argued, not just stated, using persuasive techniques.")
      else improvements.push("Back each claim with a reason (\"because…\", \"this means…\") and use persuasive techniques: a rhetorical question, direct address (\"you\") and a counter-argument you rebut.")
      if (s.evidence >= 0.6) strengths.push("Your claims are supported by facts and examples.")
      else improvements.push("Support each claim with a fact, statistic or real example.")
    } else {
      if (s.analysis >= 0.6) strengths.push("You explain why and how, not just what.")
      else improvements.push("Follow each point with its significance: \"this shows…\", \"because…\", \"as a result…\".")
      if (s.evidence >= 0.6) strengths.push("Your points are backed by evidence, examples or data.")
      else improvements.push("Support each point with a quote, an example or data.")
    }
  } else if (c.kind === "organisation") {
    if (story && descriptive) {
      if (structure >= 0.6) strengths.push("The description moves through the scene in a clear order.")
      else improvements.push("Move through the scene in a clear order (near to far, or dawn to dusk), with a new paragraph for each part of it, and end on a striking image.")
    } else if (story) {
      if (structure >= 0.6) strengths.push("Well paced, with a new paragraph for each scene, speaker or time jump.")
      else improvements.push("Shape the story: an opening that hooks the reader, rising tension, a turning point and an ending; start a new paragraph for each new scene, speaker or time jump.")
    } else if (persuade) {
      if (structure >= 0.6) strengths.push("A clear argument structure, from position to conclusion.")
      else improvements.push("Open with a clear position, give one argument per paragraph, and end with a call to action.")
    } else {
      if (s.structure >= 0.6) strengths.push("Clear structure with paragraphs and linking words.")
      else improvements.push("Organise the work into paragraphs with an introduction and a conclusion, and link ideas (furthermore, however, therefore).")
      if (s.evidence < 0.3) improvements.push("Reference your sources and examples clearly (author, year) with a bibliography where relevant.")
    }
  } else if (story) {
    if (vocabulary >= 0.6) strengths.push("Precise, vivid word choices.")
    else improvements.push(`Swap plain words${s.weakWords.length ? ` (${s.weakWords.slice(0, 4).join(", ")})` : ""} for precise verbs and vivid adjectives.`)
    if (s.openings >= 0.5) strengths.push("Sentences start in varied ways.")
    else improvements.push("Vary how sentences start: with an action, a sound or a description (\"Without warning,\" \"Slowly,\").")
  } else {
    if (s.vocabulary >= 0.6) strengths.push("Varied, precise vocabulary.")
    else improvements.push("Use more precise subject vocabulary and avoid repeating the same words.")
    if (s.variety >= 0.5) strengths.push("A good mix of sentence lengths.")
    else improvements.push("Vary your sentences: combine short choppy ones and split very long ones.")
  }
  if (s.length < 0.6) improvements.push(`At about ${s.words} words the work is short for this task; aim for roughly ${expected}.`)

  const band = mypBands ? (score === 0 ? "0" : `${Math.ceil(score / 2) * 2 - 1}–${Math.ceil(score / 2) * 2}`) : level[0].toUpperCase() + level.slice(1)
  const name = c.name.toLowerCase()
  const justification =
    c.kind === "content" && story && descriptive
      ? `Shows ${level} ${name}: ${s.sensory >= 0.5 ? "vivid" : "little"} sensory detail and ${s.figurative >= 0.5 ? "strong" : "little"} figurative language.`
      : c.kind === "content" && story
      ? `Shows ${level} ${name}: ${s.sensory >= 0.5 ? "vivid" : "little"} sensory detail and imagery, and ${support >= 0.5 ? "a clear" : "little"} sense of movement through dialogue and time.`
      : c.kind === "content" && persuade
        ? `Shows ${level} ${name}: claims are ${depth >= 0.5 ? "well" : "rarely"} argued, with ${s.evidence >= 0.5 ? "good" : "limited"} supporting facts and examples.`
        : c.kind === "content" && c.keywords.length && !judgeByType
          ? `Shows ${level} ${name}: ${found.length} of the ${c.keywords.length} key ideas for this criterion appear, with ${s.analysis >= 0.5 ? "regular" : "little"} explanation and ${s.evidence >= 0.5 ? "good" : "limited"} supporting evidence.`
          : `Shows ${level} ${name} based on the work's ${
              c.kind === "language"
                ? story
                  ? "word choice and sentence variety"
                  : "vocabulary range and sentence variety"
                : c.kind === "content"
                  ? "explanation, evidence and structure"
                  : story
                    ? "paragraphing and pacing"
                    : "paragraphing, linking words and referencing"
            }.`

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
  const builtIn = builtInRubric(input.programme, input.subjectGroup, input.taskType, input.subjectName)
  let { label, criteria } = builtIn
  const custom = input.rubric?.trim() ? parseRubric(input.rubric, isMyp ? 8 : 10) : []
  if (custom.length) {
    ;({ label, criteria } = { label: "your rubric", criteria: custom })
  } else {
    caveats.push(...builtIn.notes)
    if (input.rubric?.trim()) {
      // Not a criteria list (probably a task sheet): use its words as extra ideas the content criteria reward.
      const extra = keywordsFrom(input.rubric, 8)
      criteria = criteria.map((cr) => (cr.kind === "content" ? { ...cr, keywords: [...cr.keywords, ...extra] } : cr))
      caveats.push("Your rubric had no criteria lines (like \"Criterion A: Analysing (0–8)\"), so the built-in IB criteria were used, with your task sheet's key terms added.")
    }
  }
  const picked = input.criteria?.split(",").map((s) => s.trim()).filter(Boolean) ?? []
  if (picked.length) {
    const only = criteria.filter((cr) => picked.includes(cr.id))
    if (only.length) {
      if (only.length < criteria.length) caveats.push(`Graded on criteria ${only.map((cr) => cr.id).join(", ")} only, as you selected; the 1–7 grade is estimated from those criteria.`)
      criteria = only
    } else caveats.push("None of the criteria you ticked are in this rubric, so every criterion was graded.")
  }
  if (label === "MYP Language acquisition criteria") caveats.push("Listening and speaking are normally assessed from audio; written work only gives a rough indication for those criteria.")

  const signals = analyse(text, expected)
  // Types of writing apply to language subjects only: a physics report is marked on the physics criteria, never as a story.
  const languageSubject = isLanguageGroup(builtIn.group)
  const languageRubric = languageSubject && !custom.length
  const detected: { mode: Mode; from: "chosen" | "task" | "type" | "work" } = !languageSubject
    ? { mode: input.taskType === "Lab report" ? "informative" : "analytical", from: "type" }
    : input.mode
      ? { mode: input.mode, from: "chosen" }
      : detectMode(input.task, input.taskType, text)
  const mode = detected.mode
  const judgeByType = languageRubric && mode !== "analytical"
  // Description: asked for, or vivid writing with no dialogue or plot moving it along.
  const descriptive = mode === "narrative" && (/describ/i.test(input.task ?? "") || (signals.dialogue === 0 && signals.timeFlow <= 0.5 && signals.sensory >= 0.6))
  if (detected.from === "work") {
    caveats.push(`I worked out from your writing that this is ${MODE_NAME[mode]}. If that's wrong, choose the type of writing and grade again.`)
  }
  const modeLine = languageSubject ? ` Marked as ${MODE_NAME[mode]}.` : ""
  // A story shows its theme rather than naming it ("show, don't tell"), so its task words aren't checked literally.
  const taskTerms = input.task?.trim() && mode !== "narrative" ? keywordsFrom(input.task, 20).filter((k) => !COMMAND_TERMS.has(k)).slice(0, 10) : []
  const taskWords = input.task?.toLowerCase().match(/[a-z]{5,}/g) ?? []
  const missedTask = taskTerms.filter((k) => ![...signals.tokens].some((t) => t.startsWith(k))).map((k) => taskWords.find((w) => w.startsWith(k)) ?? k)
  // Meaning match from the student's device: counts synonyms and judges stories too. The literal check stays a floor.
  const meaning = input.task?.trim() && input.taskMatch !== undefined ? coverageFromMatch(input.taskMatch) : undefined
  const literal = taskTerms.length ? 1 - missedTask.length / taskTerms.length : undefined
  const coverage = meaning !== undefined ? Math.max(meaning, literal ?? 0) : literal
  // Off-task work loses up to 40% on content criteria (25% for stories, whose match is fuzzier).
  // Without the meaning model: covering 70% of the task's terms counts as on task, and one or two terms cap the loss at 15%.
  const floor = mode === "narrative" ? 0.75 : meaning !== undefined || taskTerms.length >= 3 ? 0.6 : 0.85
  const taskFit = coverage === undefined ? 1 : floor + (1 - floor) * (meaning !== undefined ? coverage : clamp(coverage / 0.7))
  const offTask = meaning !== undefined ? coverage! < 0.25 : missedTask.length >= 2 && missedTask.length > taskTerms.length / 2
  const results = criteria.map((cr) => scoreCriterion(cr, signals, expected, isMyp && cr.max === 8, taskFit, mode, judgeByType, descriptive))
  const total = results.reduce((a, r) => a + r.score, 0)
  const max = results.reduce((a, r) => a + r.max, 0)
  const overall = isMyp ? mypGradeFromTotal(Math.round((total / max) * 32)) : percentToGrade((total / max) * 100, DEFAULT_DP_BOUNDARIES)

  const ranked = [...results].sort((a, b) => a.fraction - b.fraction)
  const improvements = ranked.flatMap((r) => r.improvements)
  if (offTask) {
    improvements.unshift(
      missedTask.length
        ? `Answer the task directly: it asks about ${missedTask.slice(0, 4).join(", ")}, which your work barely mentions.`
        : `Answer the task directly: your work doesn't seem to respond to "${input.task!.trim().slice(0, 120)}".`,
    )
  }
  const next = [...new Set(improvements)].slice(0, 5)
  const taskLine =
    meaning !== undefined
      ? ` Task fit: ${coverage! >= 0.7 ? "strong" : coverage! >= 0.35 ? "partial" : "weak"} match in meaning with the task.`
      : taskTerms.length
        ? ` Task fit: ${taskTerms.length - missedTask.length} of ${taskTerms.length} key terms from the task appear.`
        : ""
  const summary =
    signals.words < 20
      ? "There isn't enough text to grade. Upload the full piece of work or paste it in."
      : `${signals.words} words graded against ${label}. Strongest: ${ranked.at(-1)!.name} (${ranked.at(-1)!.score}/${ranked.at(-1)!.max}). Most room to improve: ${ranked[0].name} (${ranked[0].score}/${ranked[0].max}).${modeLine}${taskLine}`

  return {
    overall_grade: overall,
    summary,
    criteria: results.map((r) => ({ id: r.id, name: r.name, score: r.score, max: r.max, band: r.band, justification: r.justification, strengths: r.strengths, improvements: r.improvements })),
    next_steps: next,
    caveats: caveats.join(" "),
    mode,
  }
}
