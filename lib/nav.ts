import {
  BookOpen,
  Calculator,
  CalendarDays,
  ChartLine,
  ClipboardList,
  LayoutDashboard,
  Link2,
  Settings,
  Target,
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
    label: "Insights",
    items: [
      { href: "/calculator", label: "Grade Calculator", icon: Calculator, keywords: "what if predict required" },
      { href: "/goals", label: "Goals & Progress", icon: Target, keywords: "targets" },
      { href: "/analytics", label: "Analytics", icon: ChartLine, keywords: "charts trends statistics" },
    ],
  },
  {
    label: "Connect",
    items: [{ href: "/integrations/managebac", label: "ManageBac Integration", icon: Link2, keywords: "sync import ical" }],
  },
]

export const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: Settings, keywords: "profile theme account" }

export const ALL_NAV: NavItem[] = [...NAV_SECTIONS.flatMap((s) => s.items), SETTINGS_ITEM]
