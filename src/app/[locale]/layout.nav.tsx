import { defaultLocale, localePrefixAsNeeded } from '@/lib/appConfig';
import { getAsNeededLocalizedUrl } from '@windrun-huaiin/lib/utils';
import {
  createLocalizedNavContext,
  createLocalizedNavLink
} from '@windrun-huaiin/third-ui/fuma/base/nav-config';
import {
  type SiteNavItemConfig
} from '@windrun-huaiin/third-ui/fuma/base/site-layout-shared';
import { getTranslations } from 'next-intl/server';


function createNavContext(locale: string) {
  return createLocalizedNavContext({
    locale,
    localePrefixAsNeeded,
    defaultLocale,
    localizeHref: getAsNeededLocalizedUrl,
  });
}

export async function primaryNavLinks(locale: string): Promise<SiteNavItemConfig[]> {
  const t1 = await getTranslations({ locale, namespace: 'linkPreview' });
  const context = createNavContext(locale);

  return [
    createLocalizedNavLink(
      {
        text: t1('blog'),
        path: '/blog',
        prefetch: false,
      },
      context,
    ),
  ];
}

export async function levelNavLinks(_locale: string): Promise<SiteNavItemConfig[]> {

  return []
}
