/**
 * STAGING=1 builds a static export that can be served from a plain file host
 * (raw.githack over the GitHub repo) under the /flagship-staging path.
 * Production builds (no STAGING) have no basePath and can deploy to any
 * Node/Vercel/Cloudflare target, or export statically at the domain root.
 */
const staging = process.env.STAGING === "1";
const stagingBase =
  "/Arav1oli/app-page.tsx/claude/web-design-q1l9go/flagship-staging";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: staging ? stagingBase : "",
  assetPrefix: staging ? stagingBase : undefined,
  images: { unoptimized: true },
  trailingSlash: false,
  env: {
    NEXT_PUBLIC_HTML_LINKS: staging ? "1" : "",
    NEXT_PUBLIC_BASE_PATH: staging ? stagingBase : "",
  },
};

export default nextConfig;
