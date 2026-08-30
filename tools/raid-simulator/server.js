/**
 * Serveur de PREVISUALISATION LOCALE du simulateur de raid.
 *
 * Il ne sert que `dist-web/raid-simulator/`, la sortie du build, et rien
 * d'autre. En production c'est nginx qui sert ce meme dossier : ce fichier
 * n'est jamais deploye.
 *
 * Historique : ce serveur exposait auparavant une route `/data/` qui servait
 * n'importe quel JSON du dossier `data/` du bot, `players.json` et
 * `guilds.json` compris. Elle a ete supprimee, et le pokedex est desormais un
 * asset genere par le build. Ne la reintroduisez pas.
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = process.env.PORT ? Number(process.env.PORT) : 4173;
const HOST = process.env.HOST || "127.0.0.1";
const ROOT_DIR = path.join(__dirname, "..", "..", "dist-web", "raid-simulator");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

/**
 * Resolution stricte : le chemin final doit se trouver SOUS la racine.
 * La comparaison se fait sur `racine + separateur`, sinon un dossier voisin
 * dont le nom commence pareil passerait le controle.
 */
function resolveWithinRoot(requestPath) {
  const resolved = path.resolve(ROOT_DIR, `.${path.posix.normalize(requestPath)}`);
  if (resolved !== ROOT_DIR && !resolved.startsWith(ROOT_DIR + path.sep)) {
    return null;
  }
  return resolved;
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method not allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad request");
    return;
  }

  if (pathname === "/") {
    pathname = "/index.html";
  }

  const filePath = resolveWithinRoot(pathname);
  const ext = filePath ? path.extname(filePath) : "";
  if (!filePath || !MIME_TYPES[ext]) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext],
      "X-Content-Type-Options": "nosniff",
    });
    res.end(req.method === "HEAD" ? undefined : content);
  });
});

if (!fs.existsSync(ROOT_DIR)) {
  console.error("dist-web/raid-simulator/ est absent. Lancez d'abord : npm run raid-sim:build");
  process.exit(1);
}

server.listen(PORT, HOST, () => {
  console.log(`Simulateur de raid (aperçu local) : http://${HOST}:${PORT}`);
});
