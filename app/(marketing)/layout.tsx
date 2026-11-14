import { SiteFooter } from "@/components/marketing/sections"

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a href="#main" className="sr-only z-[60] rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      {children}
      <SiteFooter />
    </>
  )
}
