import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Define a raiz como o repo (não a pasta web/) para permitir importar
    // os módulos compartilhados em supabase/functions/game/lib via @shared/*.
    root: path.join(__dirname, ".."),
    resolveAlias: {
      "@shared": path.resolve(__dirname, "../supabase/functions/game/lib"),
    },
  },
};

export default nextConfig;
