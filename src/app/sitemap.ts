import fs from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { getAsNeededLocalizedUrl } from "@windrun-huaiin/lib/utils";
import { appConfig, defaultLocale, localePrefixAsNeeded } from "@/lib/appConfig";
import { getTodayUtcDate, isValidTriviaDate } from "@/lib/trivia";
import { resolveMdxSourceDir } from "@/lib/mdx-source";

export const revalidate = 86_400;
const ARCHIVE_START_DATE = "2026-04-01";

type SitemapEntry = MetadataRoute.Sitemap[number];

type MdxRoute = {
  route: string;
  date?: string;
  changeFrequency: SitemapEntry["changeFrequency"];
  priority: number;
};

function toAbsoluteUrl(route: string) {
  return new URL(route, appConfig.baseUrl).toString();
}

function getLocalizedRoute(locale: string, route: string) {
  return getAsNeededLocalizedUrl(locale, route, localePrefixAsNeeded, defaultLocale);
}

function normalizeFrontmatterDate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return isValidTriviaDate(trimmed) ? trimmed : undefined;
}

function extractFrontmatterDate(content: string) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) {
    return undefined;
  }

  const dateMatch = match[1].match(/^date:\s*([^\n]+)\s*$/m);
  return normalizeFrontmatterDate(dateMatch?.[1]);
}

function getExcludedSlugsFromMeta(metaPath: string) {
  if (!fs.existsSync(metaPath) || !fs.statSync(metaPath).isFile()) {
    return new Set<string>();
  }

  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as { pages?: unknown };
    const pages = Array.isArray(meta.pages) ? meta.pages : [];
    return new Set(
      pages
        .filter((page): page is string => typeof page === "string" && page.startsWith("!"))
        .map((page) => page.slice(1)),
    );
  } catch {
    return new Set<string>();
  }
}

function getMdxRoutesFromDirectory(
  dir: string,
  baseRoute: string,
  defaultChangeFrequency: SitemapEntry["changeFrequency"],
  defaultPriority: number,
) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return [] as MdxRoute[];
  }

  const excludedSlugs = getExcludedSlugsFromMeta(path.join(dir, "meta.json"));

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
    .filter((entry) => {
      const slug = entry.name.replace(/\.mdx$/, "");
      return !excludedSlugs.has(slug);
    })
    .map((entry) => {
      const slug = entry.name.replace(/\.mdx$/, "");
      const filePath = path.join(dir, entry.name);
      const content = fs.readFileSync(filePath, "utf8");
      const date = extractFrontmatterDate(content);
      const route = slug === "index" ? baseRoute : `${baseRoute}/${slug}`;

      return {
        route,
        date,
        changeFrequency: defaultChangeFrequency,
        priority: slug === "index" ? 1 : defaultPriority,
      };
    });
}

function buildLocalizedEntries(
  route: string,
  options: {
    lastModified?: string;
    changeFrequency: SitemapEntry["changeFrequency"];
    priority: number;
  },
) {
  return (appConfig.i18n.locales as string[]).map((locale) => ({
    url: toAbsoluteUrl(getLocalizedRoute(locale, route)),
    lastModified: options.lastModified,
    changeFrequency: options.changeFrequency,
    priority: options.priority,
  }));
}

function getUtcYesterdayDate() {
  const today = new Date(`${getTodayUtcDate()}T00:00:00.000Z`);
  today.setUTCDate(today.getUTCDate() - 1);
  return today.toISOString().slice(0, 10);
}

function getArchiveDatesFromRange(startDate: string, endDate: string) {
  if (!isValidTriviaDate(startDate) || !isValidTriviaDate(endDate) || startDate > endDate) {
    return [] as string[];
  }

  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    { route: "/", changeFrequency: "daily" as const, priority: 1, lastModified: getTodayUtcDate() },
  ];

  const blogRoutes = getMdxRoutesFromDirectory(
    path.join(process.cwd(), resolveMdxSourceDir('blog')),
    "/blog",
    "monthly",
    0.8,
  );

  const legalRoutes = getMdxRoutesFromDirectory(
    path.join(process.cwd(), resolveMdxSourceDir('legal')),
    "/legal",
    "yearly",
    0.6,
  );

  const archiveDates = getArchiveDatesFromRange(ARCHIVE_START_DATE, getUtcYesterdayDate());

  return [
    ...staticRoutes.flatMap((route) =>
      buildLocalizedEntries(route.route, {
        lastModified: route.lastModified,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      }),
    ),
    ...blogRoutes.flatMap((route) =>
      buildLocalizedEntries(route.route, {
        lastModified: route.date,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      }),
    ),
    ...legalRoutes.flatMap((route) =>
      buildLocalizedEntries(route.route, {
        lastModified: route.date,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      }),
    ),
    ...archiveDates.flatMap((date) =>
      buildLocalizedEntries(`/archive/${date}`, {
        lastModified: date,
        changeFrequency: "never",
        priority: 0.7,
      }),
    ),
  ];
}
