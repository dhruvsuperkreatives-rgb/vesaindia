const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 4180);
const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".ico": "image/x-icon",
    ".svg": "image/svg+xml",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg"
};

function resolveFile(urlPath) {
    const decoded = decodeURIComponent(urlPath.split("?")[0]);
    const safePath = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
    let filePath = path.join(root, safePath);
    if (decoded.endsWith("/")) filePath = path.join(filePath, "index.html");
    if (!path.extname(filePath)) filePath = path.join(filePath, "index.html");
    return filePath;
}

http.createServer((req, res) => {
    const filePath = resolveFile(req.url || "/");
    if (!filePath.startsWith(root)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
    }

    fs.readFile(filePath, (error, data) => {
        if (error) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Not found");
            return;
        }

        res.writeHead(200, {
            "Content-Type": types[path.extname(filePath)] || "application/octet-stream"
        });
        res.end(data);
    });
}).listen(port, "127.0.0.1", () => {
    console.log(`AASHAYEIN running at http://127.0.0.1:${port}/`);
});
