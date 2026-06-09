/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    viewTransition: true,
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // ודא שפונט העברית להשטחת ה-PDF נכלל ב-bundle של ה-serverless functions.
  outputFileTracingIncludes: {
    "/**": ["./public/fonts/Heebo.ttf"],
  },
  // react-pdf / pdfjs-dist ship a canvas optional dependency that must be ignored on the server.
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
