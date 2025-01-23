import million from "million/compiler";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [million.vite(), react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  base: "./",
  optimizeDeps: {
    exclude: ["electron"],
  },
});
