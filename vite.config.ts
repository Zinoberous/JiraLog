import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, "package.json"), "utf-8"),
) as {
  name: string;
  version: string;
  description: string;
  author: string;
  displayName?: string;
};

function mergeManifestPlugin() {
  return {
    name: "merge-manifest",
    writeBundle() {
      const distDir = resolve(__dirname, "dist");
      const manifestPath = resolve(distDir, "manifest.json");
      const raw = readFileSync(resolve(__dirname, "src/manifest.json"), "utf-8");
      const manifest = JSON.parse(raw) as Record<string, unknown>;
      manifest.name = pkg.displayName ?? pkg.name;
      manifest.version = pkg.version;
      manifest.description = pkg.description;
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
    },
  };
}

export default defineConfig({
  define: {
    __APP_DISPLAY_NAME__: JSON.stringify(pkg.displayName ?? pkg.name),
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_DESCRIPTION__: JSON.stringify(pkg.description),
    __APP_AUTHOR__: JSON.stringify(pkg.author),
  },
  plugins: [mergeManifestPlugin()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/popup.html"),
        options: resolve(__dirname, "src/options/options.html"),
        about: resolve(__dirname, "src/about/about.html"),
        background: resolve(__dirname, "src/background/background.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][ext]",
      },
    },
    sourcemap: true,
  },
  publicDir: false,
});
