const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "metrics.json");
const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 3000);
const ADMIN_TOKEN = process.env.PORTFOLIO_ADMIN_TOKEN || "";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const initialMetrics = () => ({
  likes: {},
  pageViews: 0,
  visitors: {},
});

const ensureDataFile = async () => {
  await fsp.mkdir(DATA_DIR, { recursive: true });

  if (!fs.existsSync(DATA_FILE)) {
    await fsp.writeFile(DATA_FILE, JSON.stringify(initialMetrics(), null, 2));
  }
};

const loadMetrics = async () => {
  await ensureDataFile();
  const raw = await fsp.readFile(DATA_FILE, "utf8");

  try {
    return JSON.parse(raw);
  } catch {
    return initialMetrics();
  }
};

const saveMetrics = async (metrics) => {
  await fsp.writeFile(DATA_FILE, JSON.stringify(metrics, null, 2));
};

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
};

const getBody = async (req) =>
  new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });

const countLikes = (metrics) => Object.keys(metrics.likes).length;
const countVisitors = (metrics) => Object.keys(metrics.visitors).length;

const handleTrack = async (req, res) => {
  const { visitorId } = await getBody(req);

  if (!visitorId || typeof visitorId !== "string") {
    sendJson(res, 400, { error: "Missing visitorId" });
    return;
  }

  const metrics = await loadMetrics();
  const now = new Date().toISOString();

  metrics.pageViews += 1;
  metrics.visitors[visitorId] = metrics.visitors[visitorId]
    ? { ...metrics.visitors[visitorId], lastSeenAt: now }
    : { firstSeenAt: now, lastSeenAt: now };

  await saveMetrics(metrics);

  sendJson(res, 200, {
    likeCount: countLikes(metrics),
    viewerLiked: Boolean(metrics.likes[visitorId]),
  });
};

const handleLike = async (req, res) => {
  const { liked, visitorId } = await getBody(req);

  if (!visitorId || typeof visitorId !== "string" || typeof liked !== "boolean") {
    sendJson(res, 400, { error: "Missing visitorId or liked state" });
    return;
  }

  const metrics = await loadMetrics();

  if (liked) {
    metrics.likes[visitorId] = new Date().toISOString();
  } else {
    delete metrics.likes[visitorId];
  }

  await saveMetrics(metrics);

  sendJson(res, 200, {
    likeCount: countLikes(metrics),
    viewerLiked: Boolean(metrics.likes[visitorId]),
  });
};

const handleAdmin = async (req, res) => {
  const token = req.headers["x-owner-token"];

  if (!ADMIN_TOKEN) {
    sendJson(res, 503, { error: "PORTFOLIO_ADMIN_TOKEN is not configured" });
    return;
  }

  if (token !== ADMIN_TOKEN) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  const metrics = await loadMetrics();

  sendJson(res, 200, {
    likeCount: countLikes(metrics),
    pageViews: metrics.pageViews,
    uniqueVisitors: countVisitors(metrics),
  });
};

const serveStatic = async (pathname, res) => {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(ROOT, requestedPath));

  if (!filePath.startsWith(ROOT)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  try {
    const content = await fsp.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    });
    res.end(content);
  } catch {
    sendJson(res, 404, { error: "Not found" });
  }
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === "POST" && url.pathname === "/api/metrics/track") {
      await handleTrack(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/metrics/like") {
      await handleLike(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/metrics/admin") {
      await handleAdmin(req, res);
      return;
    }

    if (req.method === "GET") {
      await serveStatic(url.pathname, res);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Internal server error" });
  }
});

server.listen(PORT, HOST, async () => {
  await ensureDataFile();
  console.log(`Portfolio server running at http://${HOST}:${PORT}`);
  if (!ADMIN_TOKEN) {
    console.log("Admin stats are disabled until PORTFOLIO_ADMIN_TOKEN is set.");
  }
});
