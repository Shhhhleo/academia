import { z } from "zod"

/** How a criterion is judged: by the ideas it rewards, by structure, or by language quality. */
export type Kind = "content" | "organisation" | "language"

export interface RubricCriterion {
  id: string
  name: string
  max: number
  kind: Kind
  /** Lower-case word stems or phrases the criterion rewards. */
  keywords: string[]
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

export function builtInRubric(programme: "MYP" | "DP", subjectGroup: string | undefined, taskType: TaskType): { label: string; criteria: RubricCriterion[] } {
  if (programme === "MYP") {
    const criteria = (subjectGroup && MYP_RUBRICS[subjectGroup]) || MYP_RUBRICS["Language and literature"]
    return { label: `MYP ${subjectGroup && MYP_RUBRICS[subjectGroup] ? subjectGroup : "general"} criteria`, criteria }
  }
  if (taskType === "Extended essay") return { label: "DP Extended Essay criteria", criteria: DP_EE }
  if (taskType === "TOK essay") return { label: "DP TOK essay criteria", criteria: DP_TOK }
  if (taskType === "Internal assessment (IA)") {
    if (subjectGroup?.includes("Sciences")) return { label: "DP Sciences IA criteria", criteria: DP_SCIENCE_IA }
    if (subjectGroup?.includes("Mathematics")) return { label: "DP Mathematics IA criteria", criteria: DP_MATHS_IA }
    return { label: "DP IA criteria (general)", criteria: DP_GENERIC_IA }
  }
  return { label: "DP written-work criteria", criteria: DP_ESSAY }
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
  summary: string
  criteria: CriterionResult[]
  next_steps: string[]
  caveats: string
}
