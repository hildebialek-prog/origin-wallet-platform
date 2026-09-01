import { Link } from "react-router-dom";
import Seo from "@/components/Seo";

export type LegalSection = {
  title: string;
  paragraphs: string[];
  items?: string[];
};

type LegalPageProps = {
  title: string;
  description: string;
  path: string;
  introduction: string;
  sections: LegalSection[];
};

const legalLinks = [
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Disclaimer", href: "/disclaimer" },
];

const LegalPage = ({ title, description, path, introduction, sections }: LegalPageProps) => (
  <div>
    <Seo title={`${title} | Origin Wallet`} description={description} path={path} />

    <section className="bg-hero text-primary-foreground section-padding pb-12 sm:pb-14">
      <div className="container-tight mx-auto">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Legal
        </p>
        <h1 className="max-w-3xl text-4xl font-extrabold sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-primary-foreground/75 sm:text-lg">
          {introduction}
        </p>
        <p className="mt-6 text-sm text-primary-foreground/60">Last Updated: 1 September 2026</p>
      </div>
    </section>

    <section className="section-padding bg-background">
      <div className="container-tight mx-auto grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
        <aside>
          <nav aria-label="Legal pages" className="space-y-1 lg:sticky lg:top-24">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                aria-current={link.href === path ? "page" : undefined}
                className={`block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  link.href === path
                    ? "bg-accent/10 text-accent"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Print this page
              </button>
            </div>
          </nav>
        </aside>

        <article className="min-w-0 space-y-10">
          {sections.map((section, index) => (
            <section key={section.title} aria-labelledby={`legal-section-${index}`}>
              <h2 id={`legal-section-${index}`} className="mb-4 text-2xl font-extrabold sm:text-3xl">
                {index + 1}. {section.title}
              </h2>
              <div className="space-y-4 text-muted-foreground">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="leading-7">
                    {paragraph}
                  </p>
                ))}
                {section.items && (
                  <ul className="list-disc space-y-2 pl-6 leading-7">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}

          <div className="border-t border-border pt-8 text-sm leading-6 text-muted-foreground">
            <p className="mb-4">
              Origin Wallet is operated by HONG KONG MACHINING GROUP CO., LIMITED (Registration / Tax ID: 7192410),
              registered at FLAT/ROOM 1618B, 16/F, PIONEER CENTRE, 750 NATHAN ROAD, MONGKOK, KOWLOON, HONG KONG.
              Corporate website:{" "}
              <a
                className="font-medium text-accent hover:underline"
                href="https://hongkongmachininggroup.com/"
                target="_blank"
                rel="noreferrer"
              >
                hongkongmachininggroup.com
              </a>.
            </p>
            Questions about this document can be sent to{" "}
            <a className="font-medium text-accent hover:underline" href="mailto:support@originwallet.asia">
              support@originwallet.asia
            </a>{" "}
            or through our <Link className="font-medium text-accent hover:underline" to="/contact">contact page</Link>.
          </div>
        </article>
      </div>
    </section>
  </div>
);

export default LegalPage;
