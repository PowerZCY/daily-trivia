
import { Hero } from "@/components/hero";
import { FingerprintStatus } from "@windrun-huaiin/third-ui/fingerprint";
import { SeoContent } from "@windrun-huaiin/third-ui/main/server";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isDev = process.env.NODE_ENV !== 'production';
  const forceShow = process.env.SHOW_FINGERPRINT_STATUS === 'true';
  return (
    <>
      {(forceShow || isDev) && <FingerprintStatus />}
      <Hero locale={locale} />
      <SeoContent locale={locale} />
    </>
  );
}
