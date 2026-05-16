import { appConfig } from '@/lib/appConfig';
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware({
  locales: appConfig.i18n.locales,
  defaultLocale: appConfig.i18n.defaultLocale,
  localePrefix: appConfig.i18n.localePrefixAsNeeded ? "as-needed" : "always", 
  localeDetection: false
});

export default function proxy(req: NextRequest) {
  const { defaultLocale, locales } = appConfig.i18n;
  const pathname = req.nextUrl.pathname;
  const isWellKnownPath =
    pathname === '/.well-known' || pathname.startsWith('/.well-known/');
  const hasLocalePrefix = locales.some(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
  );

  if (isWellKnownPath || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Normalize public page URLs before locale handling so `/blog/` and `/blog`
  // do not both serve content.
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return NextResponse.redirect(
      new URL(pathname.slice(0, -1), req.url),
      301
    );
  }

  // Handle page requests without locale prefixes according to configuration.
  // This prevents requests from missing the [locale] route.
  if (!hasLocalePrefix) {
    const url = req.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;

    if (appConfig.i18n.localePrefixAsNeeded) {
      return NextResponse.rewrite(url);
    } else {
      return NextResponse.redirect(url);
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, but include API routes
    "/((?!_next|\\.well-known|sitemap.xml?|robots.txt?|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)(?:$|\\?)).*)",
    // Include API routes explicitly
    "/api/(.*)",
  ],
};
