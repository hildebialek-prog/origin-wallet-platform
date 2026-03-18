import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { helpCategories } from "@/data/help-center";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const Help = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = helpCategories
    .map((category) => ({
      ...category,
      articles: category.articles.filter(
        (article) =>
          article.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.a.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((category) => category.articles.length > 0);

  return (
    <div>
      <section className="bg-hero text-primary-foreground section-padding">
        <div className="container-tight mx-auto text-center">
          <motion.div {...fadeUp}>
            <h1 className="mb-4 text-4xl font-extrabold sm:text-5xl">How can we help?</h1>
            <p className="mb-8 text-lg text-primary-foreground/70">
              Search our help center or browse by topic below.
            </p>
            <div className="relative mx-auto max-w-md">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search for answers..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-border bg-card py-3.5 pl-12 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {!searchQuery && (
        <section className="section-padding bg-background">
          <div className="container-wide mx-auto">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {helpCategories.map((category) => (
                <motion.div key={category.title} {...fadeUp}>
                  <a
                    href={`#${category.title.toLowerCase().replace(/[^a-z]/g, "-")}`}
                    className="block rounded-2xl border border-border bg-card p-8 transition-all hover:border-accent/30 hover:shadow-lg"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                      <category.icon className="h-6 w-6 text-accent" />
                    </div>
                    <h3 className="mb-1 text-lg font-bold">{category.title}</h3>
                    <p className="text-sm text-muted-foreground">{category.articles.length} articles</p>
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section-padding bg-surface-subtle">
        <div className="container-tight mx-auto">
          {filteredCategories.map((category) => (
            <div
              key={category.title}
              id={category.title.toLowerCase().replace(/[^a-z]/g, "-")}
              className="mb-12 scroll-mt-24 last:mb-0"
            >
              <h2 className="mb-6 flex items-center gap-3 text-2xl font-extrabold">
                <category.icon className="h-6 w-6 text-accent" />
                {category.title}
              </h2>
              <div className="space-y-3">
                {category.articles.map((faq, index) => (
                  <details key={index} className="group rounded-xl border border-border bg-card">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 font-medium">
                      {faq.q}
                      <ChevronRight className="ml-4 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="px-6 pb-4 text-sm leading-relaxed text-muted-foreground">{faq.a}</div>
                  </details>
                ))}
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="py-12 text-center">
              <p className="mb-4 text-lg text-muted-foreground">No results found for "{searchQuery}"</p>
              <Link to="/contact" className="font-medium text-accent hover:underline">
                Contact support
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="section-padding bg-background text-center">
        <div className="container-tight mx-auto">
          <h2 className="mb-4 text-2xl font-extrabold">Still need help?</h2>
          <p className="mb-6 text-muted-foreground">Our support team is here for you.</p>
          <Link to="/contact">
            <Button variant="hero">Contact support</Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Help;
