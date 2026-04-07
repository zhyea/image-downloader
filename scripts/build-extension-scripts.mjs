import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");

const common = {
  bundle: true,
  platform: "browser",
  target: ["chrome109", "firefox109", "edge109"],
  minify: true,
  logLevel: "info",
};

await esbuild.build({
  ...common,
  entryPoints: [join(root, "src/background/index.js")],
  outfile: join(dist, "service-worker.js"),
  format: "iife",
});

await esbuild.build({
  ...common,
  entryPoints: [join(root, "src/content/index.js")],
  outfile: join(dist, "content.js"),
  format: "iife",
});
