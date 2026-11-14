/** Answer-first FAQ copy. Used on the landing page and as FAQPage structured data. */
export const FAQ: { q: string; a: string }[] = [
  {
    q: "What is Academia?",
    a: "Academia is a grade tracker built for IB students. You log each summative, exam or task as it is graded, and Academia keeps a live 1–7 estimate for every subject, shows your trend, and tells you what you need on your next task to reach your target.",
  },
  {
    q: "How is an MYP grade calculated?",
    a: "Each MYP criterion (A, B, C and D) is marked from 0 to 8. Academia combines your levels for each criterion across your tasks (average by default, or latest, highest or median), adds the four criteria for a total out of 32, and converts it with the IB boundaries: 1–5 is a 1, 6–9 a 2, 10–14 a 3, 15–18 a 4, 19–23 a 5, 24–27 a 6 and 28–32 a 7.",
  },
  {
    q: "How does it work for the Diploma Programme?",
    a: "For DP subjects you enter scores (for example 31 out of 40) and, optionally, the component weightings from your subject guide, such as Paper 1 40%, Paper 2 40% and Internal Assessment 20%. Academia calculates your weighted percentage and converts it to a 1–7 using grade boundaries you can edit for each subject.",
  },
  {
    q: "Is the grade Academia shows my official IB grade?",
    a: "No. Academia’s grade is an estimate based on the results you enter, and it is always labelled “Estimated”. Teachers use best-fit judgement, so the grade your school reports is the official one. You can record your school-reported grade next to the estimate.",
  },
  {
    q: "Can Academia connect to ManageBac?",
    a: "Yes. Paste the calendar subscription link from ManageBac (Calendar, then Subscribe) and Academia imports your deadlines and events, matching tasks to subjects by class name. The link is encrypted before it is stored, the sync is read-only, and Academia never asks for your ManageBac password.",
  },
  {
    q: "Can anyone else see my grades?",
    a: "No. Every record is tied to your account and protected by row-level security in the database, so one account can never read another’s data, even through a crafted request. You can export everything or delete your account at any time.",
  },
  {
    q: "What if my school uses different grade boundaries?",
    a: "DP boundaries change by subject and exam session, so you can set the minimum percentage for each grade per subject. MYP subjects use the published IB criteria boundaries, and you choose how multiple tasks are combined.",
  },
  {
    q: "Is Academia free?",
    a: "Yes. Academia is free for students to use on any device, in light or dark mode.",
  },
]
