import fs from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { getAsNeededLocalizedUrl } from "@windrun-huaiin/lib/utils";
import { appConfig, defaultLocale, localePrefixAsNeeded } from "@/lib/appConfig";
import { getPublishedQuizDates, getTodayUtcDate, isValidTriviaDate } from "@/lib/trivia";

export const revalidate = 86_400;

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

function getMdxRoutesFromDirectory(
  dir: string,
  baseRoute: string,
  defaultChangeFrequency: SitemapEntry["changeFrequency"],
  defaultPriority: number,
) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return [] as MdxRoute[];
  }

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    { route: "/", changeFrequency: "daily" as const, priority: 1 }
  ];

  const blogRoutes = getMdxRoutesFromDirectory(
    path.join(process.cwd(), appConfig.mdxSourceDir.blog),
    "/blog",
    "monthly",
    0.8,
  );

  const legalRoutes = getMdxRoutesFromDirectory(
    path.join(process.cwd(), appConfig.mdxSourceDir.legal),
    "/legal",
    "yearly",
    0.6,
  );

  const archiveDates = await getPublishedQuizDates();
  const todayDate = getTodayUtcDate();

  return [
    ...staticRoutes.flatMap((route) =>
      buildLocalizedEntries(route.route, {
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
        changeFrequency: date === todayDate ? "daily" : "never",
        priority: 0.7,
      }),
    ),
  ];
}
