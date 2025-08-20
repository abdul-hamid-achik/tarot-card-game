/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Serve Godot HTML5 exports with the headers required for SharedArrayBuffer/threads
  async headers() {
    return [
      {
        source: "/godot/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          // Helpful for some embedders; safe for same-origin static assets
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          // Make sure MIME sniffing doesn't interfere with WASM/JS
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Performance and security best-practices for static game assets
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "interest-cohort=()" }
        ]
      }
    ];
  }
};

export default nextConfig;
