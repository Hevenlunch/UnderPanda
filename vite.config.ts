import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const contentPath = resolve(process.cwd(), "src/content/site.json");
const uploadsPath = resolve(process.cwd(), "public/images/uploads");

function devContentEditor(): Plugin {
  return {
    name: "dev-content-editor",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__dev-editor/save", (request, response, next) => {
        if (request.method !== "POST") {
          next();
          return;
        }

        let body = "";
        request.setEncoding("utf8");
        request.on("data", (chunk: string) => {
          body += chunk;
          if (body.length > 2_000_000) {
            request.destroy(new Error("Content payload is too large."));
          }
        });
        request.on("end", async () => {
          try {
            const parsed = JSON.parse(body);
            await writeFile(contentPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify({ ok: true }));
          } catch (error) {
            response.statusCode = 400;
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(
              JSON.stringify({
                ok: false,
                message: error instanceof Error ? error.message : "Unknown save error",
              }),
            );
          }
        });
      });

      server.middlewares.use("/__dev-editor/upload", (request, response, next) => {
        if (request.method !== "POST") {
          next();
          return;
        }

        let body = "";
        request.setEncoding("utf8");
        request.on("data", (chunk: string) => {
          body += chunk;
          if (body.length > 64_000_000) {
            request.destroy(new Error("Image payload is too large."));
          }
        });
        request.on("end", async () => {
          try {
            const payload = JSON.parse(body) as { fileName?: string; dataUrl?: string };
            const match = payload.dataUrl?.match(
              /^data:image\/(png|jpe?g|webp|avif|gif);base64,(.+)$/i,
            );
            if (!match) throw new Error("图片格式暂不支持，请使用 JPG、PNG 或 WebP。");

            const extension = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
            const baseName = (payload.fileName ?? "photo")
              .replace(/\.[^.]+$/, "")
              .replace(/[^a-zA-Z0-9_-]+/g, "-")
              .replace(/^-+|-+$/g, "")
              .slice(0, 60) || "photo";
            const fileName = `${Date.now()}-${baseName}.${extension}`;

            await mkdir(uploadsPath, { recursive: true });
            await writeFile(join(uploadsPath, fileName), Buffer.from(match[2], "base64"));

            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify({ ok: true, path: `/images/uploads/${fileName}` }));
          } catch (error) {
            response.statusCode = 400;
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(
              JSON.stringify({
                ok: false,
                message: error instanceof Error ? error.message : "Unknown upload error",
              }),
            );
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devContentEditor()],
});
