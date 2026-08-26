/**
 * BASE_PATH controls where the static export is served from:
 *   (unset)                 production at a domain root
 *   /app-page.tsx           GitHub Pages project site
 *   /Arav1oli/app-page.tsx/claude/web-design-q1l9go/flagship-staging
 *                           raw.githack preview straight off the branch
 *
 * HTML_LINKS=1 appends .html to internal links for plain file hosts that
 * cannot rewrite /buy to /buy.html.
 */
const basePath = process.env.BASE_PATH ?? "";
const htmlLinks = process.env.HTML_LINKS === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  trailingSlash: false,
  env: {
    NEXT_PUBLIC_HTML_LINKS: htmlLinks ? "1" : "",
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
