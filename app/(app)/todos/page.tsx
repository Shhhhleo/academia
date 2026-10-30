import type { Metadata } from "next"
import { PageHeader } from "@/components/app/page-header"
import { TodoBoard } from "@/components/planner/todo-board"
import { getTodos, getWorkspace } from "@/lib/data/queries"
import { localDay } from "@/lib/study/streak"

export const metadata: Metadata = { title: "To-do" }

export default async function TodosPage() {
  const [ws, todos] = await Promise.all([getWorkspace(), getTodos()])
  return (
    <>
      <PageHeader title="To-do" description="Everything you need to get done, from revision tasks to forms to hand in. Tasks with a due date appear in your daily brief." />
      <div className="max-w-3xl">
        <TodoBoard todos={todos} today={localDay(new Date(), ws.profile.timezone)} />
      </div>
    </>
  )
}
