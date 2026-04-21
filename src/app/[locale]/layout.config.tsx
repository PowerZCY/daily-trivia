import { i18n } from '@/i18n';
import { appConfig } from '@/lib/appConfig';
import { SiteIcon } from '@/lib/site-config';
import { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { getTranslations } from 'next-intl/server';
import { CreditPopover } from '@/components/credit-popover';
import { ExtendedLinkItem, HomeTitle } from '@windrun-huaiin/third-ui/fuma/base';
import { getOptionalAuth } from '@windrun-huaiin/third-ui/clerk/patch/optional-auth';
import { getAsNeededLocalizedUrl } from '@windrun-huaiin/lib';

// home page normal menu
export async function homeNavLinks(locale: string): Promise<ExtendedLinkItem[]> {
  const t1 = await getTranslations({ locale: locale, namespace: 'linkPreview' });
  const { userId } = await getOptionalAuth();
  return [
    {
      text: t1('blog'),
      url: getAsNeededLocalizedUrl(locale, '/blog'),
    },
    {
      type: 'custom',
      secondary: true,
      mobilePinned: true,
      children: userId ? <CreditPopover locale={locale} /> : null,
    }
  ];
}

// level special menu
export async function levelNavLinks(locale: string): Promise<ExtendedLinkItem[]> {
  console.log('levelNavLinks TODO: add links here', locale);
  return [];
}

export async function baseOptions(locale: string): Promise<BaseLayoutProps> {
  const t = await getTranslations({ locale: locale, namespace: 'home' });
  return {
    nav: {
      url: getAsNeededLocalizedUrl(locale, '/'),
      title: (
        <>
          <SiteIcon />
          <HomeTitle>
            {t('title')}
          </HomeTitle>
        </>
      ),
      transparentMode: 'none',
    },
    i18n,
    githubUrl: appConfig.github,
  };
}