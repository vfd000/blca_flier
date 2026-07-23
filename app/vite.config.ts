import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves project sites from /<repo-name>/, so the build needs
// that as its base path. Local dev and `vite preview` stay at /.
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? "/blca_flier/" : "/",
});
