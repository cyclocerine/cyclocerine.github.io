import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "assets/generated",
    emptyOutDir: true,
    lib: {
      entry: "src/lanyard-widget.tsx",
      name: "LanyardBadgeWidget",
      formats: ["iife"],
      fileName: () => "lanyard-badge.js",
      cssFileName: "lanyard-badge",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
