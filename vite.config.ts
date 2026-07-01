import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: "dist-web"
  },
  optimizeDeps: {
    include: ["react-router-dom", "react-router", "@supabase/supabase-js"],
    force: true
  }
});
