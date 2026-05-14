import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

function timelineSavePlugin() {
  return {
    name: "wedding-timeline-save",
    configureServer(server) {
      server.middlewares.use("/__timeline/save", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }

        let body = "";
        req.setEncoding("utf8");
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", async () => {
          try {
            const parsed = JSON.parse(body);
            if (!parsed || typeof parsed.musicSrc !== "string" || !Array.isArray(parsed.markers)) {
              throw new Error("invalid timeline payload");
            }
            const outPath = resolve(__dirname, "public/timeline.json");
            await mkdir(dirname(outPath), { recursive: true });
            await writeFile(outPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
          } catch (error) {
            res.statusCode = 400;
            res.end(error instanceof Error ? error.message : "save failed");
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), timelineSavePlugin()],
  server: {
    port: 5174,
    fs: { allow: [".."] },
  },
});
