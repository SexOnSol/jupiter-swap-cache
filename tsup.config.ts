import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm"],
    splitting: true,
    sourcemap: true,
    clean: true,
    skipNodeModulesBundle: true,
    dts: true,
    external: ["node_modules"],
});
