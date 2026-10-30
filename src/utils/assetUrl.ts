/**
 * Resolves a root-relative path against Vite's BASE_URL for deployment safety
 * Works identically on root domains (Vercel) and subpaths (GitHub Pages)
 */
export const assetUrl = (p: string): string => {
  const base = import.meta.env.BASE_URL || './';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  return cleanBase + p.replace(/^\//, '');
};
