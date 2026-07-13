import { defineConfig } from "tsup";

export default defineConfig({
  entry: { "worker/main": "src/worker/main.ts" },
  outDir: "dist",
  format: "cjs",
  platform: "node",
  target: "node20",
  clean: true,
  sourcemap: true,
  // Bundle workspace code; keep npm deps external (installed in the image).
  noExternal: [/^@\//],
});
