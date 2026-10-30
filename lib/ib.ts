export const SUBJECT_GROUPS = {
  MYP: [
    "Language and literature",
    "Language acquisition",
    "Individuals and societies",
    "Sciences",
    "Mathematics",
    "Arts",
    "Physical and health education",
    "Design",
    "Personal project",
  ],
  DP: [
    "Studies in language and literature",
    "Language acquisition",
    "Individuals and societies",
    "Sciences",
    "Mathematics",
    "The arts",
    "Core (TOK / EE)",
  ],
} as const

/** Common DP component templates offered when setting up weightings. */
export const DP_COMPONENT_PRESETS: { label: string; components: { name: string; weight: number }[] }[] = [
  { label: "Paper 1 / Paper 2 / IA", components: [{ name: "Paper 1", weight: 40 }, { name: "Paper 2", weight: 40 }, { name: "Internal assessment", weight: 20 }] },
  { label: "Paper 1 / Paper 2 / Paper 3 / IA", components: [{ name: "Paper 1", weight: 30 }, { name: "Paper 2", weight: 30 }, { name: "Paper 3", weight: 20 }, { name: "Internal assessment", weight: 20 }] },
  { label: "Exam / Coursework", components: [{ name: "Exams", weight: 70 }, { name: "Coursework", weight: 30 }] },
]
