import { SiteIcon } from '@/lib/site-config';
import { getTranslations } from 'next-intl/server';
import { localePrefixAsNeeded, defaultLocale } from '@/lib/appConfig';
import { HomeTitle } from '@windrun-huaiin/third-ui/fuma/base';
import {
  createSiteBaseLayoutConfig,
  type SiteBaseLayoutConfig,
} from '@windrun-huaiin/third-ui/fuma/base/site-layout-shared';
import { getAsNeededLocalizedUrl } from '@windrun-huaiin/lib/utils';

export async function baseOptions(locale: string): Promise<SiteBaseLayoutConfig> {
  const t = await getTranslations({ locale: locale, namespace: 'home' });
  return createSiteBaseLayoutConfig({
    homeUrl: getAsNeededLocalizedUrl(locale, '/', localePrefixAsNeeded, defaultLocale),
    title: (
      <>
        <SiteIcon />
        <HomeTitle>
          {t('title')}
        </HomeTitle>
      </>
    ),
    transparentMode: 'none',
  });
}
