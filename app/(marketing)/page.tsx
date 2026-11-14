import type { Metadata } from "next"
import { CtaBand } from "@/components/marketing/cta-band"
import { GradeLab } from "@/components/marketing/grade-lab"
import { Hero } from "@/components/marketing/hero"
import { ProductTour } from "@/components/marketing/product-tour"
import { FaqSection, Features, GradingExplainer, ManageBacSection, Statement } from "@/components/marketing/sections"
import { SiteHeader } from "@/components/marketing/site-header"
import { JsonLd } from "@/components/seo/json-ld"
import { FAQ } from "@/lib/faq"
import { absoluteUrl, site } from "@/lib/site"

export const metadata: Metadata = {
  title: { absolute: "Academia: IB Grade Tracker & Calculator for MYP and DP Students" },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: absoluteUrl("/"),
    siteName: site.name,
    title: "Academia: know exactly where you stand in every IB subject",
    description: site.description,
    locale: "en",
  },
  twitter: {
    card: "summary_large_image",
    title: "Academia: IB grade tracker for MYP and DP",
    description: site.description,
  },
}

export default function HomePage() {
  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: site.name,
      url: site.url,
      logo: absoluteUrl("/logo.png"),
      alternateName: ["Academia IB", "Academia IB Grade Tracker"],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: site.name,
      alternateName: "Academia IB",
      url: site.url,
      description: site.description,
      inLanguage: "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: site.name,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: site.url,
      description: site.description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "MYP criteria A–D grade calculation with IB boundaries",
        "DP weighted components and editable grade boundaries",
        "Target grades and required-score calculator",
        "ManageBac calendar sync",
        "Grade analytics and trends",
      ],
      audience: { "@type": "EducationalAudience", educationalRole: "student" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ]

  return (
    <>
      <JsonLd data={structured} />
      <SiteHeader overHero />
      <main id="main">
        <Hero />
        <Statement />
        <section aria-labelledby="tour-h" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <h2 id="tour-h" className="sr-only">
            A tour of Academia
          </h2>
          <ProductTour />
        </section>
        <section id="try" aria-labelledby="try-h" className="scroll-mt-16 border-y bg-[radial-gradient(70%_60%_at_80%_0%,var(--primary-soft),transparent_70%)]">
          <div className="mx-auto max-w-6xl px-4 py-28 sm:px-6 sm:py-40">
            <h2 id="try-h" className="max-w-3xl text-[clamp(2rem,4.6vw,3.5rem)] leading-[1.05] font-extrabold">
              Move the levels. Watch the grade.
            </h2>
            <p className="mt-4 mb-14 max-w-xl text-muted-foreground">
              This is the same grade engine that runs inside Academia. Try an MYP task or a DP subject and see exactly how the 1–7 is worked out.
            </p>
            <GradeLab />
          </div>
        </section>
        <Features />
        <ManageBacSection />
        <GradingExplainer />
        <FaqSection />
        <CtaBand />
      </main>
    </>
  )
}
