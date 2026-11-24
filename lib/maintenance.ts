/**
 * Features that are live but being worked on. Their page is blurred behind an "Under maintenance" pop-up
 * (see MaintenanceGate). To close a feature, add it here and wrap its page; to reopen it, delete its line.
 */
export const UNDER_MAINTENANCE: Record<string, string> = {
  grader: "We're improving how the Task Grader marks every IB subject. It will be back soon.",
}

/** The note to show if the feature is closed. Nothing is closed on localhost (`next dev`), where the features being fixed are worked on. */
export const maintenanceNote = (feature: string): string | undefined => (process.env.NODE_ENV === "development" ? undefined : UNDER_MAINTENANCE[feature])
