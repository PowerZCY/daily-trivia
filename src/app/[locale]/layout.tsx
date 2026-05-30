import { appConfig, generatedLocales, localePrefixAsNeeded, defaultLocale, themeMode } from '@/lib/appConfig';
import { getFumaTranslations } from '@windrun-huaiin/third-ui/fuma/fuma-translate-util';
import { createLocalizedSiteMetadata } from '@windrun-huaiin/third-ui/lib/seo-metadata';
import { NProgressBar } from '@windrun-huaiin/third-ui/main';
import { DocsRootProvider } from '@windrun-huaiin/third-ui/fuma/base/docs-root-provider';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { montserrat } from '@/lib/fonts';
import { cn } from '@windrun-huaiin/lib/utils';
import './globals.css';
import React from 'react';
import { GoogleAnalyticsScript, MicrosoftClarityScript } from "@windrun-huaiin/base-ui/components/server";

export const revalidate = 86400;

export function generateStaticParams() {
  return appConfig.i18n.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params: paramsPromise
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await paramsPromise;
  return createLocalizedSiteMetadata({
    locale,
    baseUrl: appConfig.baseUrl,
    locales: appConfig.i18n.locales,
    defaultLocale,
    localePrefixAsNeeded,
  });
}

export default async function RootLayout({
  children,
  params: paramsPromise
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await paramsPromise;
  setRequestLocale(locale);
  const messages = await getMessages();
  const fumaTranslations = await getFumaTranslations(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <NextIntlClientProvider messages={messages}>
        <body className={cn(montserrat.className)}>
          <NProgressBar />
          <DocsRootProvider
            theme={{
              mode: themeMode,
            }}
            i18n={{
              locale: locale,
              locales: generatedLocales,
              translations: fumaTranslations,
            }}
          >
            {children}
          </DocsRootProvider>
        </body>
        <GoogleAnalyticsScript />
        <MicrosoftClarityScript />
      </NextIntlClientProvider>
    </html>
  )
}
