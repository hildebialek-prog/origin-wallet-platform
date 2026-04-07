import { useEffect } from "react";

const siteUrl = "https://khoinguyenoriginwallet.com";

type SeoProps = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  schema?: Record<string, unknown> | Array<Record<string, unknown>>;
  pageName?: string;
};

const upsertMeta = (
  selector: string,
  attributes: Record<string, string>,
  content: string,
) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value));
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
};

const upsertLink = (selector: string, rel: string, href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>(selector);

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
};

const Seo = ({
  title,
  description,
  path = "/",
  image = "/content/banner.jpg",
  type = "website",
  schema,
  pageName,
}: SeoProps) => {
  useEffect(() => {
    const canonicalUrl = new URL(path, siteUrl).toString();
    const imageUrl = new URL(image, siteUrl).toString();
    const previousTitle = document.title;
    const webPageSchema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: pageName ?? title,
      url: canonicalUrl,
      description,
      isPartOf: {
        "@type": "WebSite",
        name: "Origin Wallet",
        url: siteUrl,
      },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: imageUrl,
      },
    };
    const mergedSchema = schema
      ? Array.isArray(schema)
        ? [webPageSchema, ...schema]
        : [webPageSchema, schema]
      : [webPageSchema];

    document.title = title;

    upsertMeta('meta[name="description"]', { name: "description" }, description);
    upsertMeta('meta[property="og:title"]', { property: "og:title" }, title);
    upsertMeta('meta[property="og:description"]', { property: "og:description" }, description);
    upsertMeta('meta[property="og:type"]', { property: "og:type" }, type);
    upsertMeta('meta[property="og:url"]', { property: "og:url" }, canonicalUrl);
    upsertMeta('meta[property="og:image"]', { property: "og:image" }, imageUrl);
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title" }, title);
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description" }, description);
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image" }, imageUrl);
    upsertMeta('meta[name="robots"]', { name: "robots" }, "index, follow, max-image-preview:large");
    upsertLink('link[rel="canonical"]', "canonical", canonicalUrl);

    let schemaTag: HTMLScriptElement | null = null;
    if (mergedSchema.length > 0) {
      schemaTag = document.head.querySelector<HTMLScriptElement>('script[data-seo-schema="true"]');
      if (!schemaTag) {
        schemaTag = document.createElement("script");
        schemaTag.type = "application/ld+json";
        schemaTag.dataset.seoSchema = "true";
        document.head.appendChild(schemaTag);
      }
      schemaTag.textContent = JSON.stringify(mergedSchema);
    }

    return () => {
      document.title = previousTitle;
      if (schemaTag) {
        schemaTag.remove();
      }
    };
  }, [description, image, pageName, path, schema, title, type]);

  return null;
};

export default Seo;
