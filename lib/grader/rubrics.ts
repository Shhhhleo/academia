import { z } from "zod"
import { SUBJECT_GROUPS } from "@/lib/ib"

/** How a criterion is judged: by the ideas it rewards, by structure, or by language quality. */
export type Kind = "content" | "organisation" | "language"

/** One strand of a criterion: what the student should do, how to improve it, and the cues that show it in the work (see strands.ts). */
export interface Strand {
  does: string
  tip: string
  cues: string
  /** How many different cues make the strand fully shown. */
  need: number
  weight: number
}

export interface RubricCriterion {
  id: string
  name: string
  max: number
  kind: Kind
  /** Lower-case word stems or phrases the criterion rewards. */
  keywords: string[]
  /** The criterion's strands, attached on the server for built-in rubrics. */
  strands?: Strand[]
  /** Highest share of the marks written work can earn, for criteria judged from a performance or artwork. */
  cap?: number
  /** How strongly this criterion shows in the work compared with the rubric's other criteria: against their average and against the strongest. */
  rel?: { top: number; lead: number }
  /** "Rubric label|criterion id", used to look up the criterion's background level in the trained model. */
  key?: string
}

const c = (id: string, name: string, kind: Kind, keywords = "", max = 8): RubricCriterion => ({
  id,
  name,
  max,
  kind,
  keywords: keywords ? keywords.split(",").map((k) => k.trim()) : [],
})

/** MYP criteria per subject group (each 0–8), with the ideas each criterion rewards. */
export const MYP_RUBRICS: Record<string, RubricCriterion[]> = {
  "Language and literature": [
    c("A", "Analysing", "content", "analys, effect, reader, technique, theme, purpose, impl, suggest, connotation, symbol, imagery, tone, context, character"),
    c("B", "Organizing", "organisation", "introduc, conclu, paragraph, firstly, furthermore"),
    c("C", "Producing text", "content", "perspective, i believe, my view, creativ, insight, interpret, alternative, personal, opinion"),
    c("D", "Using language", "language"),
  ],
  "Language acquisition": [
    c("A", "Listening", "content", "listen, audio, speaker, heard, recording"),
    c("B", "Reading", "content", "text, author, read, passage, infer, main idea, detail"),
    c("C", "Speaking", "language"),
    c("D", "Writing", "language"),
  ],
  "Individuals and societies": [
    c("A", "Knowing and understanding", "content", "concept, defin, term, knowledge, fact, understand, cause, consequence, example"),
    c("B", "Investigating", "content", "research, question, source, method, investigat, plan, bibliograph, reference, action plan"),
    c("C", "Communicating", "organisation", "source, citation, reference, bibliograph, heading"),
    c("D", "Thinking critically", "content", "perspective, evaluat, argument, bias, reliab, limitation, critic, origin, purpose, value, interpretation"),
  ],
  Sciences: [
    c("A", "Knowing and understanding", "content", "theory, concept, explain, scien, law, principle, formula, process, model"),
    c("B", "Inquiring and designing", "content", "hypothes, variable, independent, dependent, control, method, procedure, apparatus, safety, predict"),
    c("C", "Processing and evaluating", "content", "data, table, graph, trend, pattern, result, calculat, error, reliab, valid, conclu, uncertaint, average"),
    c("D", "Reflecting on the impacts of science", "content", "society, environment, ethic, econom, impact, implication, application, sustainab, health, solution"),
  ],
  Mathematics: [
    c("A", "Knowing and understanding", "content", "solve, equation, calculat, formula, value, simplif, substitut, answer"),
    c("B", "Investigating patterns", "content", "pattern, rule, general, conjecture, verif, prove, justif, sequence, predict"),
    c("C", "Communicating", "organisation", "notation, diagram, graph, table, therefore, step, explain"),
    c("D", "Applying mathematics in real-life contexts", "content", "real, context, model, application, reasonable, accura, interpret, solution, scenario"),
  ],
  Arts: [
    c("A", "Investigating", "content", "artist, research, movement, influence, style, genre, context, analys, inspir"),
    c("B", "Developing", "content", "idea, plan, develop, sketch, intention, experiment, process, draft"),
    c("C", "Creating/performing", "content", "creat, perform, technique, skill, final, piece, outcome, medium"),
    c("D", "Evaluating", "content", "evaluat, reflect, improve, feedback, strength, weakness, apprais, next time"),
  ],
  "Physical and health education": [
    c("A", "Knowing and understanding", "content", "muscle, fitness, health, nutrition, principle, training, energy, heart, knowledge"),
    c("B", "Planning for performance", "content", "plan, goal, smart, strategy, training, schedule, session"),
    c("C", "Applying and performing", "content", "perform, skill, technique, tactic, apply, game, movement"),
    c("D", "Reflecting and improving performance", "content", "reflect, improve, evaluat, feedback, progress, goal, next time"),
  ],
  Design: [
    c("A", "Inquiring and analysing", "content", "inquir, research, problem, need, client, brief, existing product, specification, analys, target audience"),
    c("B", "Developing ideas", "content", "design, idea, sketch, specification, criteria, chosen, drawing, plan"),
    c("C", "Creating the solution", "content", "creat, make, plan, step, tool, material, prototype, modif, time"),
    c("D", "Evaluating", "content", "test, evaluat, specification, improve, impact, feedback, client, success"),
  ],
  "Personal project": [
    c("A", "Planning", "content", "goal, criteria, plan, timeline, learning goal, product, success, research"),
    c("B", "Applying skills", "content", "atl, skill, research, communicat, thinking, self-management, social, source"),
    c("C", "Reflecting", "content", "reflect, learn, impact, product, evaluat, improve, goal, challenge"),
  ],
}

const DP_ESSAY = [
  c("A", "Knowledge, understanding and interpretation", "content", "context, theme, interpret, understand, author, text, evidence, argument, idea", 10),
  c("B", "Analysis and evaluation", "content", "analys, evaluat, effect, technique, impl, suggest, significan, perspective, convinc", 10),
  c("C", "Focus and organization", "organisation", "introduc, conclu, thesis, paragraph", 5),
  c("D", "Language", "language", "", 5),
]

const DP_EE = [
  c("A", "Focus and method", "content", "research question, method, focus, scope, source, approach", 6),
  c("B", "Knowledge and understanding", "content", "context, theory, terminolog, concept, subject, literature", 6),
  c("C", "Critical thinking", "content", "analys, evaluat, argument, limitation, evidence, conclu, counter, significan", 12),
  c("D", "Presentation", "organisation", "contents, introduc, conclu, bibliograph, citation, figure, table, heading", 4),
  c("E", "Engagement", "content", "reflect, i learned, challenge, decision, process, insight, i realised, i realized", 6),
]

const DP_TOK = [c("A", "Holistic: knowledge questions, arguments and perspectives", "content", "knowledge, knower, claim, counterclaim, perspective, area of knowledge, evidence, justif, implication, certain", 10)]

const DP_SCIENCE_IA = [
  c("A", "Research design", "content", "research question, variable, method, independent, dependent, control, hypothes, background", 6),
  c("B", "Data analysis", "content", "data, table, graph, uncertaint, calculat, process, error, mean", 6),
  c("C", "Conclusion", "content", "conclu, trend, support, scientific, justif, literature, relationship", 6),
  c("D", "Evaluation", "content", "limitation, weakness, improve, extension, systematic, random, reliab", 6),
]

const DP_MATHS_IA = [
  c("A", "Presentation", "organisation", "introduc, conclu, aim, section, heading", 4),
  c("B", "Mathematical communication", "organisation", "notation, defin, variable, graph, table, diagram, formula", 4),
  c("C", "Personal engagement", "content", "interest, my own, personal, curious, i chose, i decided", 3),
  c("D", "Reflection", "content", "reflect, limitation, implication, extension, meaning, assumption", 3),
  c("E", "Use of mathematics", "content", "equation, function, derivative, integra, model, calculat, proof, regression, matrix, probabilit", 6),
]

const DP_GENERIC_IA = [
  c("A", "Focus and research question", "content", "research question, aim, focus, scope, method", 6),
  c("B", "Knowledge and understanding", "content", "concept, theory, terminolog, context, understand", 6),
  c("C", "Analysis and evaluation", "content", "analys, evaluat, evidence, limitation, argument, conclu", 6),
  c("D", "Communication", "organisation", "introduc, conclu, citation, bibliograph, heading", 6),
]

// Language A individual oral.
const DP_LANG_A_IA = [
  c("A", "Knowledge, understanding and interpretation", "content", "text, work, global issue, interpret, understand, evidence, extract, author, context", 10),
  c("B", "Analysis and evaluation", "content", "analys, evaluat, technique, effect, impl, suggest, authorial choice, significan", 10),
  c("C", "Focus and organization", "organisation", "global issue, introduc, conclu, balance, focus", 10),
  c("D", "Language", "language", "", 10),
]

// Language B Paper 1 (writing) and individual oral.
const DP_LANG_B = [
  c("A", "Language", "language", "", 12),
  c("B", "Message", "content", "idea, detail, example, explain, support, develop, relevant, opinion", 12),
  c("C", "Conceptual understanding", "content", "audience, purpose, register, format, tone, context, text type", 6),
]
const DP_LANG_B_IA = [
  c("A", "Language", "language", "", 12),
  c("B1", "Message: visual stimulus", "content", "image, stimulus, photo, culture, theme, describe, connect", 6),
  c("B2", "Message: conversation", "content", "opinion, idea, explain, example, respond, develop", 6),
  c("C", "Interactive skills", "content", "question, respond, agree, disagree, conversation, opinion, clarif", 6),
]

// Assessment objectives shared across a group's papers (each paper's markbands differ).
const DP_IS = [
  c("A", "Knowledge and understanding", "content", "concept, defin, theory, term, context, case study, example, knowledge", 5),
  c("B", "Application and analysis", "content", "analys, apply, case, evidence, data, cause, effect, factor, example", 5),
  c("C", "Synthesis and evaluation", "content", "evaluat, perspective, argument, limitation, however, significan, extent, judgement, conclu, counter", 5),
  c("D", "Structure and use of skills", "organisation", "introduc, conclu, paragraph, source, citation", 5),
]
const DP_HISTORY_IA = [
  c("A", "Identification and evaluation of sources", "content", "source, origin, purpose, value, limitation, content, provenance", 6),
  c("B", "Investigation", "content", "argument, analys, evaluat, evidence, perspective, conclu, question, historian, interpretation", 15),
  c("C", "Reflection", "content", "reflect, historian, method, challenge, limitation, i learned, knowledge", 4),
]
const DP_ECON_IA = [
  c("A", "Diagrams", "content", "diagram, curve, axis, graph, label, demand, supply", 3),
  c("B", "Terminology", "content", "defin, term, elasticit, market, price, cost", 2),
  c("C", "Application and analysis", "content", "article, apply, analys, theory, explain, impact", 3),
  c("D", "Key concept", "content", "key concept, scarcity, choice, efficiency, equity, well-being, sustainab, change, interdependence, intervention", 3),
  c("E", "Evaluation", "content", "evaluat, stakeholder, short run, long run, advantage, disadvantage, assumption, conclu, judgement", 3),
  c("F", "Rubric requirements", "organisation", "article, source, date, word count, unit", 3),
]
const DP_GEOG_IA = [
  c("A", "Fieldwork question and geographic context", "content", "fieldwork question, hypothes, location, map, context", 3),
  c("B", "Method(s) of investigation", "content", "method, sample, data collection, questionnaire, survey, measure", 3),
  c("C", "Quality and treatment of information collected", "content", "data, table, graph, map, chart, present, statistic", 6),
  c("D", "Written analysis", "content", "analys, trend, pattern, anomal, explain, evidence, statistic, correlation", 8),
  c("E", "Conclusions", "content", "conclu, hypothes, answer, finding", 2),
  c("F", "Evaluation", "content", "evaluat, limitation, improve, reliab, weakness", 3),
  c("G", "Formal requirements", "organisation", "title, map, citation, bibliograph, contents, word count", 3),
]
const DP_SCI = [
  c("A", "Knowledge and understanding", "content", "theory, concept, model, law, principle, defin, explain, process", 6),
  c("B", "Application", "content", "apply, calculat, example, context, predict, explain, data", 6),
  c("C", "Analysis and evaluation", "content", "data, trend, graph, analys, evaluat, uncertaint, limitation, conclu, error", 6),
  c("D", "Communication", "organisation", "introduc, conclu, table, graph, units, label, reference", 4),
]
const DP_MATHS = [
  c("A", "Knowledge and understanding", "content", "formula, equation, defin, value, calculat, function, theorem", 6),
  c("B", "Problem solving", "content", "solve, method, strategy, model, step, substitut, answer", 6),
  c("C", "Communication and interpretation", "organisation", "notation, diagram, graph, table, therefore, units, label", 4),
  c("D", "Reasoning", "content", "justif, prove, therefore, because, hence, verif, show that, deduce", 4),
]
const DP_ARTS = [
  c("A", "Investigating context and practice", "content", "artist, research, movement, influence, culture, context, analys, style, tradition", 6),
  c("B", "Developing ideas and skills", "content", "idea, develop, experiment, process, sketch, technique, skill, intention, media, refine", 6),
  c("C", "Creating and presenting", "content", "creat, final, piece, artwork, exhibition, present, perform, outcome, medium, composition", 6),
  c("D", "Reflecting and evaluating", "content", "reflect, evaluat, improve, feedback, strength, weakness, intention, audience, meaning", 6),
]

/** Words in a subject's name that give away its group, checked in order (null: no such group in that programme). */
const NAME_GROUPS: [RegExp, string | null, string | null][] = [
  [/personal project/i, "Personal project", null],
  [/\b(tok|theory of knowledge|extended essay)\b/i, null, "Core (TOK / EE)"],
  [/acquisition|ab initio|\bphase \d|\s+b$/i, "Language acquisition", "Language acquisition"],
  [/english|literature|lang(uage)?\s*(and|&)\s*lit|lang\s*lit|language a|\s+a$/i, "Language and literature", "Studies in language and literature"],
  [/design|computer|coding|technolog|\bict\b/i, "Design", "Sciences"],
  [/scien|biolog|chemi|physics|environment|\bess\b/i, "Sciences", "Sciences"],
  [/math/i, "Mathematics", "Mathematics"],
  [/\barts?\b|visual|music|drama|theat|dance|film|media|photograph/i, "Arts", "The arts"],
  [/physical|\bp\.?e\b|\bphe\b|health|sport|fitness/i, "Physical and health education", null],
  [/histor|geograph|econom|business|psycholog|philosoph|politic|individuals|societ|humanit|anthropolog|global|social stud/i, "Individuals and societies", "Individuals and societies"],
  [/french|spanish|german|mandarin|chinese|hindi|japanese|arabic|italian|korean|portuguese|russian|dutch|latin|tamil|urdu|sanskrit|language/i, "Language acquisition", "Language acquisition"],
]

/** The subject group to grade against: the one set if valid, else worked out from the subject's name. */
export function resolveGroup(programme: "MYP" | "DP", subjectGroup: string | undefined, subjectName: string | undefined) {
  if (subjectGroup && (SUBJECT_GROUPS[programme] as readonly string[]).includes(subjectGroup)) return { group: subjectGroup, inferred: false }
  const hit = NAME_GROUPS.find(([re, myp, dp]) => (programme === "MYP" ? myp : dp) && re.test(subjectName ?? ""))
  return hit ? { group: (programme === "MYP" ? hit[1] : hit[2])!, inferred: true } : null
}

export function builtInRubric(
  programme: "MYP" | "DP",
  subjectGroup: string | undefined,
  taskType: TaskType,
  subjectName?: string,
): { label: string; criteria: RubricCriterion[]; notes: string[]; group: string } {
  const resolved = resolveGroup(programme, subjectGroup, subjectName)
  const fallback = programme === "MYP" ? "Language and literature" : "Studies in language and literature"
  const group = resolved?.group ?? fallback
  const notes = !resolved
    ? [`The subject group isn't set and couldn't be worked out from the subject name, so ${fallback} criteria were used. Set the subject group in My Subjects to grade against the right criteria.`]
    : resolved.inferred
      ? [`The subject group isn't set, so ${group} was worked out from the subject name. Set it in My Subjects if that's wrong.`]
      : []
  const pick = (label: string, criteria: RubricCriterion[], note?: string) => ({ label, criteria, notes: note ? [...notes, note] : notes, group })
  const ownRubric = "paste its rubric into \"Your own rubric\" to grade against the exact criteria."

  if (programme === "MYP") return pick(`MYP ${group} criteria`, MYP_RUBRICS[group])

  const name = subjectName ?? ""
  if (taskType === "Extended essay") return pick("DP Extended Essay criteria", DP_EE)
  if (taskType === "TOK essay" || (group === "Core (TOK / EE)" && /tok|theory of knowledge/i.test(name))) return pick("DP TOK essay criteria", DP_TOK)
  if (group === "Core (TOK / EE)") return pick("DP Extended Essay criteria", DP_EE)

  const ia = taskType === "Internal assessment (IA)"
  switch (group) {
    case "Studies in language and literature":
      return ia ? pick("DP Language A individual oral criteria", DP_LANG_A_IA) : pick("DP Language A essay criteria", DP_ESSAY)
    case "Language acquisition":
      return ia ? pick("DP Language B individual oral criteria", DP_LANG_B_IA) : pick("DP Language B writing criteria", DP_LANG_B)
    case "Individuals and societies":
      if (ia && /histor/i.test(name)) return pick("DP History IA criteria", DP_HISTORY_IA)
      if (ia && /econom/i.test(name)) return pick("DP Economics IA criteria (one commentary)", DP_ECON_IA)
      if (ia && /geograph/i.test(name)) return pick("DP Geography IA criteria", DP_GEOG_IA)
      return ia
        ? pick("DP IA criteria (general)", DP_GENERIC_IA, `Each Individuals and societies subject has its own IA criteria; ${ownRubric}`)
        : pick("DP Individuals and societies assessment objectives", DP_IS, `Each paper has its own markbands; ${ownRubric}`)
    case "Sciences":
      return ia || taskType === "Lab report" ? pick("DP Sciences IA criteria", DP_SCIENCE_IA) : pick("DP Sciences assessment objectives", DP_SCI)
    case "Mathematics":
      return ia ? pick("DP Mathematics IA criteria", DP_MATHS_IA) : pick("DP Mathematics assessment objectives", DP_MATHS)
    default:
      return pick("DP arts assessment objectives", DP_ARTS, `Each arts component (portfolio, comparative study, exhibition, performance) has its own rubric; ${ownRubric}`)
  }
}

export const TASK_TYPES = [
  "Summative assessment",
  "Formative assessment",
  "Practice worksheet",
  "Essay",
  "Lab report",
  "Internal assessment (IA)",
  "Extended essay",
  "TOK essay",
  "Past paper / exam answers",
  "Project / portfolio",
  "Other",
] as const
export type TaskType = (typeof TASK_TYPES)[number]

const LANGUAGE_GROUPS = new Set(["Language and literature", "Language acquisition", "Studies in language and literature"])
/** Language subjects are the only ones marked by type of writing; other subjects have their own criteria for that. */
export const isLanguageGroup = (group: string | undefined) => !!group && LANGUAGE_GROUPS.has(group)

/** Task types that exist for this programme and subject group (no lab reports in English, no IA in the MYP). */
export function taskTypesFor(programme: "MYP" | "DP", group: string | undefined): TaskType[] {
  if (programme === "DP" && group === "Core (TOK / EE)") return ["Extended essay", "TOK essay", "Other"]
  if (programme === "MYP" && group === "Personal project") return ["Project / portfolio", "Other"]
  return TASK_TYPES.filter((t) => {
    if (t === "Lab report") return group === "Sciences"
    if (t === "TOK essay") return false
    if (t === "Internal assessment (IA)" || t === "Extended essay") return programme === "DP"
    return true
  })
}

/** An example task for the subject group, shown as the task box's placeholder. */
export function taskExample(group: string | undefined): string {
  const examples: Record<string, string> = {
    "Language and literature": "Analyse how the poet uses imagery to present grief.",
    "Studies in language and literature": "Compare how two works you have studied present power.",
    "Language acquisition": "Write a blog post for teenagers about a festival in your town.",
    "Individuals and societies": "To what extent was the Treaty of Versailles a cause of the Second World War?",
    Sciences: "Investigate how temperature affects the rate of reaction between magnesium and acid.",
    Mathematics: "Find the pattern in the number of tiles at each step, and prove your rule.",
    Arts: "Explain how your final piece responds to the theme of identity.",
    "The arts": "Explain how your final piece responds to the theme of identity.",
    "Physical and health education": "Design and evaluate a six-week plan to improve your endurance.",
    Design: "Design a product that helps students organise their revision.",
    "Personal project": "Report on how you achieved your learning goal and product.",
    "Core (TOK / EE)": "Is knowledge in the natural sciences more reliable than in the arts?",
  }
  return (group && examples[group]) || "Paste the question or instructions your teacher set."
}

/** Types of writing the grader marks by their own craft. */
export const WRITING_MODES = {
  analytical: "Analytical (essay, commentary)",
  narrative: "Narrative or descriptive (story, recount, description)",
  persuasive: "Persuasive (speech, letter, argument)",
  informative: "Informative (report, article, explanation)",
} as const
export type Mode = keyof typeof WRITING_MODES

/** Rough length a complete piece of this kind runs to (words), before the year adjustment. */
export const EXPECTED_WORDS: Record<TaskType, number> = {
  "Summative assessment": 500,
  "Formative assessment": 300,
  "Practice worksheet": 150,
  Essay: 700,
  "Lab report": 700,
  "Internal assessment (IA)": 2200,
  "Extended essay": 3500,
  "TOK essay": 1400,
  "Past paper / exam answers": 300,
  "Project / portfolio": 800,
  Other: 400,
}

/** What the form sends (minus the file). Trust boundary: validated on the server. */
export const gradeRequest = z.object({
  programme: z.enum(["MYP", "DP"]),
  subjectName: z.string().trim().min(1).max(120),
  subjectGroup: z.string().trim().max(120).optional(),
  level: z.enum(["SL", "HL", "MYP"]).optional(),
  year: z.coerce.number().int().min(1).max(5),
  taskType: z.enum(TASK_TYPES),
  rubric: z.string().max(20_000).optional(),
  task: z.string().max(5_000).optional(),
  /** Comma-separated criterion ids the task assesses, e.g. "A,C". Empty: all. */
  criteria: z.string().max(100).optional(),
  mode: z.enum(["analytical", "narrative", "persuasive", "informative"]).optional(),
  /** Best task-to-paragraph similarity, measured by the meaning model on the student's device. */
  taskMatch: z.coerce.number().min(-1).max(1).optional(),
  text: z.string().max(200_000).optional(),
})
export type GradeRequest = z.infer<typeof gradeRequest>

export interface CriterionResult {
  id: string
  name: string
  score: number
  max: number
  band: string
  justification: string
  strengths: string[]
  improvements: string[]
}

export interface GradeResult {
  overall_grade: number
  /** Only some of the rubric's criteria were graded, so the marks are shown instead of the 1–7 grade. */
  partial: boolean
  summary: string
  criteria: CriterionResult[]
  next_steps: string[]
  caveats: string
  /** The type of writing it was marked as. */
  mode: Mode
}
