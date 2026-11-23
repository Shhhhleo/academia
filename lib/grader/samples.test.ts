import { describe, expect, it } from "vitest"
import { gradeRequest } from "./rubrics"
import { detectMode, gradeTask } from "./score"

// Sample tasks across writing types: each must be marked by what its own type of writing should do.
const req = (o: Record<string, string>) =>
  gradeRequest.parse({ programme: "MYP", subjectName: "English", subjectGroup: "Language and literature", year: "3", taskType: "Practice worksheet", ...o })
const advice = (r: ReturnType<typeof gradeTask>) => [...r.next_steps, ...r.criteria.flatMap((c) => c.improvements)].join(" ")
const ANALYSIS_ADVICE = /this shows|Address more of what this criterion|i believe|Support each point with a quote/i

export const narrativeStrong = `The bell had already rung when Maya realised her bag was gone. She froze in the doorway, her heart pounding like a drum, and stared at the empty hook where it had hung that morning.

"Looking for this?" a voice whispered behind her. Leo stood in the shadows of the corridor, grinning, her blue bag dangling from one finger.

"Give it back," she said, though her voice trembled more than she wanted.

Without warning, he tossed it over the stair rail. Maya watched it tumble, the zip glinting silver in the dim light, and heard it land with a soft thud on the cold tiles below.

Moments later she was racing down the steps, the smell of floor polish stinging her nose. At the bottom, a small boy from Year 7 was already holding the bag out to her, his eyes wide and serious.

That night, as rain tapped against her window, Maya thought about the boy's quiet courage. She had always believed bravery was loud. Now she knew it could be as gentle as a hand reaching out.`

export const narrativeWeak = `I went to the park with my friend. It was nice. We played on the swings and it was fun. Then we got ice cream. It was very good. Then we went home. My mum said it was a good day. I was happy. It was a really nice day and I liked it a lot.`

export const descriptive = `The market wakes before the sun. Lanterns glow amber above the stalls, and the air is thick with the scent of roasted chestnuts and wet earth.

Fishmongers slap silver mackerel onto beds of crushed ice, which crackles and steams in the cold. A woman in a crimson scarf calls out prices in a voice as sharp as a gull's cry, while beside her a radio hums an old song nobody is listening to.

Under my fingers the crates feel rough and damp. Somewhere a kettle shrieks; somewhere a dog barks twice and falls silent. Oranges are stacked like small suns, and the bruised sweetness of overripe plums drifts from a cart at the end of the row.

By the time daylight seeps over the rooftops, the shadows have shrunk and the noise has swelled into a roar, as if the whole street has taken one enormous breath.`

export const persuasiveStrong = `Every minute, a truckload of plastic is dumped into our oceans. Think about that. By the time you finish reading this speech, another five trucks will have emptied their loads into the water we swim in and the fish we eat.

We must ban single-use plastic in our school, and we must do it this year. Why? Because the problem is not far away. A 2023 survey of our own beach clean-up found that 70% of the rubbish collected was plastic packaging, much of it from snacks sold in our canteen.

Some people argue that reusable bottles and boxes are expensive and inconvenient. It is true that they cost more at first. However, a steel bottle lasts for years, which means each family actually saves money over time, and the school could sell them at cost.

Others say one school cannot make a difference. But every change starts somewhere. If our 900 students each avoided one plastic bottle a day, we would stop over 150,000 bottles a year from becoming waste.

So I ask you: what kind of school do we want to be? Sign the petition at lunchtime, bring your own bottle tomorrow, and let us show that our generation is ready to act.`

export const persuasiveWeak = `Plastic is bad. We should stop plastic. It is very bad for the sea and the animals. Everyone should stop using plastic because it is bad. Plastic is everywhere and it is bad. So stop using plastic.`

export const analytical = `In "The Sea", the poet uses imagery of crashing waves to suggest the speaker's loneliness. This suggests that isolation is overwhelming, because the reader feels the force of the water.

Furthermore, the tone shifts in the second stanza. For example, the phrase "silent shore" implies calm acceptance. This shows how the theme of grief develops, and the symbol of the tide represents the passing of time.

However, an alternative interpretation is that the sea is a source of comfort. In my view, the poet's purpose is to show that the same image can carry different connotations depending on the character's context.

In conclusion, the poet's careful use of imagery, tone and symbolism helps the reader understand that grief is both overwhelming and, over time, something that can be accepted.`

export const informative = `How volcanoes form

A volcano is an opening in the Earth's crust where molten rock, called magma, escapes to the surface. Most volcanoes form at the edges of tectonic plates.

Where plates move apart

At divergent boundaries, such as the Mid-Atlantic Ridge, plates pull away from each other. Magma rises to fill the gap, which creates new crust. For example, Iceland sits on this ridge and has more than 30 active volcanoes.

Where plates collide

At convergent boundaries, one plate sinks beneath another. As it descends, it melts and forms magma, which rises because it is less dense than the surrounding rock. This is why the Pacific "Ring of Fire" contains about 75% of the world's volcanoes.

In summary, volcanoes form where magma can reach the surface, most often at plate boundaries.`

describe("detectMode", () => {
  it("reads the type of writing from the task", () => {
    expect(detectMode("Write a short story about a moment that changed you.", "Practice worksheet", "").mode).toBe("narrative")
    expect(detectMode("Describe a busy market using sensory details.", "Formative assessment", "").mode).toBe("narrative")
    expect(detectMode("Write a speech persuading your school to ban single-use plastic.", "Essay", "").mode).toBe("persuasive")
    expect(detectMode("Analyse how the poet presents grief in 'The Sea'.", "Essay", "").mode).toBe("analytical")
    expect(detectMode("Analyse how the writer builds tension in the short story.", "Essay", "").mode).toBe("analytical")
    expect(detectMode("Write a magazine article explaining how volcanoes form.", "Essay", "").mode).toBe("informative")
  })

  it("works it out from the writing when there is no task", () => {
    expect(detectMode(undefined, "Practice worksheet", narrativeStrong)).toEqual({ mode: "narrative", from: "work" })
    expect(detectMode(undefined, "Practice worksheet", descriptive).mode).toBe("narrative")
    expect(detectMode(undefined, "Essay", persuasiveStrong).mode).toBe("persuasive")
    expect(detectMode(undefined, "Essay", analytical).mode).toBe("analytical")
    expect(detectMode(undefined, "Lab report", "The results show the rate increased.").mode).toBe("informative")
  })
})

describe("grading by type of writing", () => {
  it("does not give analysis advice for narrative writing on criteria C and D", () => {
    const r = gradeTask(req({ criteria: "C,D", task: "Write a narrative about a moment of unexpected courage." }), narrativeStrong)
    expect(r.criteria.map((c) => c.id)).toEqual(["C", "D"])
    expect(advice(r)).not.toMatch(ANALYSIS_ADVICE)
    expect(r.summary).toMatch(/narrative/i)
    expect(r.criteria[0].score).toBeGreaterThanOrEqual(5)
  })

  it("marks a vivid story above a flat one, and tells the flat one how to improve as a story", () => {
    const strong = gradeTask(req({ criteria: "C,D" }), narrativeStrong)
    const weak = gradeTask(req({ criteria: "C,D" }), narrativeWeak)
    expect(strong.overall_grade).toBeGreaterThan(weak.overall_grade)
    expect(strong.criteria[0].score).toBeGreaterThan(weak.criteria[0].score)
    expect(advice(weak)).toMatch(/show, don't tell|sensory/i)
    expect(advice(weak)).toMatch(/went|nice|very/)
    expect(advice(weak)).not.toMatch(ANALYSIS_ADVICE)
  })

  it("doesn't ask a story to name its theme", () => {
    const shown = narrativeStrong.replace("quiet courage", "quiet kindness")
    const r = gradeTask(req({ criteria: "C,D", task: "Write a narrative about a moment of unexpected courage." }), shown)
    expect(advice(r)).not.toMatch(/Answer the task directly/)
    expect(r.summary).not.toMatch(/Task fit/)
  })

  it("rewards description without dialogue", () => {
    const d = gradeTask(req({ criteria: "C,D", task: "Describe a busy market using sensory details." }), descriptive)
    const weak = gradeTask(req({ criteria: "C,D" }), narrativeWeak)
    expect(d.criteria[0].score).toBeGreaterThanOrEqual(weak.criteria[0].score + 2)
    expect(advice(d)).not.toMatch(ANALYSIS_ADVICE)
    // A description needs no dialogue or plot, and "sensory details" is how to write, not what about.
    expect(advice(d)).not.toMatch(/dialogue|turning point|Answer the task directly/i)
  })

  it("marks persuasive writing on argument, evidence and persuasive technique", () => {
    const task = "Write a speech persuading your school to ban single-use plastic."
    const strong = gradeTask(req({ task, taskType: "Essay" }), persuasiveStrong)
    const weak = gradeTask(req({ task, taskType: "Essay" }), persuasiveWeak)
    expect(strong.overall_grade).toBeGreaterThan(weak.overall_grade)
    expect(advice(weak)).toMatch(/counter-argument|rhetorical question/i)
    expect(advice(weak)).toMatch(/fact, statistic or real example/i)
    expect(advice(strong)).not.toMatch(/show, don't tell/i)
    // It opens with a position and ends on a call to action, so it isn't told to.
    expect(advice(strong)).not.toMatch(/Open with a clear position/i)
    expect(strong.criteria.find((c) => c.id === "B")!.score).toBeGreaterThan(weak.criteria.find((c) => c.id === "B")!.score)
  })

  it("still marks literary analysis as analysis", () => {
    const r = gradeTask(req({ task: "Analyse how the poet presents grief.", taskType: "Essay" }), analytical)
    expect(r.summary).toMatch(/analytical/i)
    expect(advice(r)).not.toMatch(/show, don't tell|Shape the story/i)
  })

  it("never gives story advice to informative or science writing", () => {
    const article = gradeTask(req({ task: "Write a magazine article explaining how volcanoes form.", taskType: "Essay" }), informative)
    const lab = gradeTask(req({ subjectName: "Sciences", subjectGroup: "Sciences", taskType: "Lab report" }), informative)
    for (const r of [article, lab]) expect(advice(r)).not.toMatch(/show, don't tell|Shape the story|sensory/i)
  })

  it("lets the student choose the type of writing", () => {
    const r = gradeTask(req({ mode: "narrative", criteria: "C,D" }), narrativeWeak)
    expect(r.summary).toMatch(/narrative/i)
    expect(r.caveats).not.toMatch(/worked out from your writing/)
  })

  it("keeps every score within its maximum", () => {
    for (const text of [narrativeStrong, narrativeWeak, descriptive, persuasiveStrong, persuasiveWeak, analytical, informative]) {
      for (const c of gradeTask(req({}), text).criteria) expect(c.score).toBeLessThanOrEqual(c.max)
    }
  })
})
