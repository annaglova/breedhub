import { PublicPageTemplate } from '@/components/template/PublicPageTemplate';

/**
 * TestPage - Standalone page for testing PublicPageTemplate without drawer
 *
 * This page renders PublicPageTemplate in fullscreen mode (not in drawer)
 * to test scroll functionality without nested scroll containers
 */
export function TestPage() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <PublicPageTemplate isDrawerMode={false} />
    </div>
  );
}
