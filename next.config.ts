import type { NextConfig } from "next";

const requiredPublicEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

for (const key of requiredPublicEnv) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${key}. Copy .env.example to .env.local for dev, or set it in Vercel → Project → Settings → Environment Variables (Production and Preview).`
    );
  }
}

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["moment", "react-big-calendar"],
  },
  async redirects() {
    return [
      {
        source: "/pacientes/:id/editar",
        destination: "/paciente/:id/editar",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
