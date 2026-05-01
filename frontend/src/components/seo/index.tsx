import React, { useEffect, useMemo } from 'react';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  ogUrl?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  structuredData?: Record<string, unknown>;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;
  language?: string;
  alternateLanguage?: { lang: string; url: string }[];
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  section?: string;
  tags?: string[];
}

export function SEOHead({
  title = 'Free Agent',
  description = 'AI Assistant powered by local LLM with MCP support',
  keywords = ['AI', 'LLM', 'MCP', 'ChatGPT', 'Local AI', 'AI Assistant'],
  author = 'Free Agent Team',
  ogImage = '/og-image.png',
  ogType = 'website',
  ogUrl,
  canonicalUrl,
  noIndex = false,
  noFollow = false,
  structuredData,
  twitterCard = 'summary_large_image',
  twitterSite = '@freeagent',
  twitterCreator = '@freeagent',
  language = 'en',
  alternateLanguage = [],
  publishedTime,
  modifiedTime,
  authors = [],
  section,
  tags = [],
}: SEOProps) {
  const fullTitle = title.includes('Free Agent') ? title : `${title} | Free Agent`;
  const currentUrl = ogUrl || (typeof window !== 'undefined' ? window.location.href : '');
  const canonical = canonicalUrl || currentUrl;

  const metaTags = useMemo(() => {
    const tags: React.MetaHTMLAttributes<HTMLMetaElement>[] = [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { name: 'title', content: fullTitle },
      { name: 'description', content: description },
      { name: 'keywords', content: keywords.join(', ') },
      { name: 'author', content: author },
      { name: 'robots', content: `${noIndex ? 'noindex' : 'index'},${noFollow ? 'nofollow' : 'follow'}` },
      { name: 'generator', content: 'Free Agent' },
      { httpEquiv: 'X-UA-Compatible', content: 'IE=edge' },
    ];
    return tags;
  }, [fullTitle, description, keywords, author, noIndex, noFollow]);

  const ogTags = useMemo(() => {
    const tags: React.MetaHTMLAttributes<HTMLMetaElement>[] = [
      { property: 'og:type', content: ogType },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: description },
      { property: 'og:image', content: ogImage },
      { property: 'og:url', content: canonical },
      { property: 'og:site_name', content: 'Free Agent' },
      { property: 'og:locale', content: language },
    ];
    
    alternateLanguage.forEach(({ lang, url }) => {
      tags.push({ property: 'og:locale:alternate', content: lang });
    });
    
    if (ogType === 'article') {
      if (publishedTime) {
        tags.push({ property: 'article:published_time', content: publishedTime });
      }
      if (modifiedTime) {
        tags.push({ property: 'article:modified_time', content: modifiedTime });
      }
      if (authors.length > 0) {
        authors.forEach((author) => {
          tags.push({ property: 'article:author', content: author });
        });
      }
      if (section) {
        tags.push({ property: 'article:section', content: section });
      }
      tags.push({
        property: 'article:tag',
        content: tags.join(', '),
      });
    }
    
    return tags;
  }, [fullTitle, description, ogImage, canonical, ogType, language, alternateLanguage, publishedTime, modifiedTime, authors, section, tags]);

  const twitterTags = useMemo(() => {
    const tags: React.MetaHTMLAttributes<HTMLMetaElement>[] = [
      { name: 'twitter:card', content: twitterCard },
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: ogImage },
      { name: 'twitter:site', content: twitterSite },
      { name: 'twitter:creator', content: twitterCreator },
    ];
    
    if (twitterCard === 'player') {
      tags.push({ name: 'twitter:player', content: canonical });
    }
    
    return tags;
  }, [fullTitle, description, ogImage, twitterCard, twitterSite, twitterCreator, canonical]);

  const ldJson = useMemo(() => {
    if (!structuredData) return null;
    return structuredData;
  }, [structuredData]);

  return (
    <>
      <title>{fullTitle}</title>
      
      {metaTags.map((tag, index) => (
        <meta key={`meta-${index}`} {...tag} />
      ))}
      
      {ogTags.map((tag, index) => (
        <meta key={`og-${index}`} {...tag} />
      ))}
      
      {twitterTags.map((tag, index) => (
        <meta key={`twitter-${index}`} {...tag} />
      ))}
      
      <link rel="canonical" href={canonical} />
      
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      
      <link rel="alternate" type="application/rss+xml" title="Free Agent RSS" href="/rss.xml" />
      
      {alternateLanguage.map(({ lang, url }) => (
        <link key={`lang-${lang}`} rel="alternate" hrefLang={lang} href={url} />
      ))}
      
      <link rel="index" href={canonical} />
      <link rel="start" href={canonical} />
      <link rel="contents" href={canonical} />
      
      {ldJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
        />
      )}
    </>
  );
}

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Free Agent',
    description: 'AI Assistant powered by local LLM with MCP support',
    url: 'https://free-agent.app',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Windows, macOS, Linux',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Organization',
      name: 'Free Agent Team',
      url: 'https://free-agent.app',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function WebApplicationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Free Agent',
    description: 'AI Assistant powered by local LLM with MCP support',
    url: 'https://free-agent.app',
    installUrl: 'https://free-agent.app/download',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Windows, macOS, Linux',
    browserRequirements: 'Modern web browser with JavaScript enabled',
    softwareVersion: '1.0.0',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function FAQSchema({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export const SEO = {
  Head: SEOHead,
  OrganizationSchema,
  WebApplicationSchema,
  FAQSchema,
  BreadcrumbSchema,
};

export default SEOHead;
