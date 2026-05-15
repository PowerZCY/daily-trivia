import { appConfig, generatedLocales, localePrefixAsNeeded, defaultLocale, themeMode } from '@/lib/appConfig';
import { getFumaTranslations } from '@windrun-huaiin/third-ui/fuma/fuma-translate-util';
import { createLocalizedSiteMetadata } from '@windrun-huaiin/third-ui/lib/seo-metadata';
import { NProgressBar } from '@windrun-huaiin/third-ui/main';
import { DocsRootProvider } from '@windrun-huaiin/third-ui/fuma/base/docs-root-provider';
import { ClerkProviderClient } from '@windrun-huaiin/third-ui/clerk';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { montserrat } from '@/lib/fonts';
import { cn } from '@windrun-huaiin/lib/utils';
import './globals.css';
import React from 'react';

export const dynamic = 'force-dynamic'

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
          <ClerkProviderClient locale={locale} localePrefixAsNeeded={localePrefixAsNeeded} defaultLocale={defaultLocale}>
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
          </ClerkProviderClient>
        </body>
      </NextIntlClientProvider>
    </html>
  )
}
