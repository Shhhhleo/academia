import {
  BellRing,
  BookOpen,
  CalendarSync,
  Calculator,
  CalendarDays,
  ChartLine,
  ClipboardList,
  LayoutDashboard,
  ListTodo,
  Link2,
  Settings,
  Sunrise,
  Target,
  Timer,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  keywords?: string
}

export const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, keywords: "home overview" },
      { href: "/subjects", label: "My Subjects", icon: BookOpen, keywords: "classes courses" },
      { href: "/assessments", label: "Assessments", icon: ClipboardList, keywords: "tasks summatives exams grades" },
      { href: "/calendar", label: "Calendar", icon: CalendarDays, keywords: "deadlines schedule events" },
    ],
  },
  {
    label: "Plan",
    items: [
      { href: "/brief", label: "Daily Brief", icon: Sunrise, keywords: "today summary morning plan" },
      { href: "/study", label: "Study Log", icon: Timer, keywords: "stopwatch timer streak hours revision" },
      { href: "/todos", label: "To-do", icon: ListTodo, keywords: "tasks checklist list" },
      { href: "/reminders", label: "Reminders", icon: BellRing, keywords: "alerts notify remember" },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/calculator", label: "Grade Calculator", icon: Calculator, keywords: "what if predict required" },
      { href: "/goals", label: "Goals & Progress", icon: Target, keywords: "targets" },
      { href: "/analytics", label: "Analytics", icon: ChartLine, keywords: "charts trends statistics" },
    ],
  },
  {
    label: "Connect",
    items: [
      { href: "/integrations/managebac", label: "ManageBac Integration", icon: Link2, keywords: "sync import ical" },
      { href: "/integrations/google-calendar", label: "Google Calendar", icon: CalendarSync, keywords: "google sync subscribe ical" },
    ],
  },
]

export const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: Settings, keywords: "profile theme account" }

export const ALL_NAV: NavItem[] = [...NAV_SECTIONS.flatMap((s) => s.items), SETTINGS_ITEM]
