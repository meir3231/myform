/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
