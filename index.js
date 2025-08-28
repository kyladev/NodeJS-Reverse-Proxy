import { existsSync, readFileSync } from "fs";
import { createServer as httpCreateServer } from "node:http";
import { createServer as httpsCreateServer } from "node:https";
import pkg from "http-proxy";
const { createProxyServer } = pkg;

const TARGET = process.env.TARGET || "http://127.0.0.1:3000";

const REDIRECT_HTTP_TO_HTTPS = process.env.REDIRECT_HTTP_TO_HTTPS === "1";

//
//IMPORTANT
//
//SSL CERT PATHS BELOW
//
const TLS_KEY = process.env.TLS_KEY || "/etc/letsencrypt/live/test.com/privkey.pem";
const TLS_CERT = process.env.TLS_CERT || "/etc/letsencrypt/live/test.com/fullchain.pem";
//
//

const TLS_CA = process.env.TLS_CA || "";
const HTTP_PORT = Number(process.env.HTTP_PORT || 8080);
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 443);
const proxy = createProxyServer({
  target: TARGET,
  changeOrigin: true,
  xfwd: true,
  ws: true,
  ignorePath: false,
  secure: false,
  preserveHeaderKeyCase: true,
});
proxy.on("error", (err, req, res) => {
  const msg = `Proxy error: ${err.message}`;
  if (!res.headersSent) {
    res.writeHead(502, { "Content-Type": "text/plain" });
  }
  res.end(msg);
  console.error(msg);
});
const httpServer = httpCreateServer((req, res) => {
  if (REDIRECT_HTTP_TO_HTTPS) {
    const host = req.headers.host ? req.headers.host.replace(/:\d+$/, "") : "localhost";
    const loc = `https://${host}${req.url}`;
    res.writeHead(301, { Location: loc });
    return res.end();
  }
  proxy.web(req, res);
});
httpServer.on("upgrade", (req, socket, head) => {
  if (REDIRECT_HTTP_TO_HTTPS) {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    return socket.destroy();
  }
  proxy.ws(req, socket, head);
});
httpServer.listen(HTTP_PORT, () =>
  console.log(`[HTTP ] listening on :${HTTP_PORT} → ${TARGET}`)
);
function loadTLS() {
  if (!existsSync(TLS_KEY) || !existsSync(TLS_CERT)) {
    console.error(
      "Missing TLS files. Set TLS_KEY/TLS_CERT env or place PEM files at ./privkey.pem and ./fullchain.pem"
    );
    process.exit(1);
  }
  const opts = {
    key: readFileSync(TLS_KEY),
    cert: readFileSync(TLS_CERT),
  };
  if (TLS_CA && existsSync(TLS_CA)) {
    opts.ca = readFileSync(TLS_CA);
  }
  return opts;
}
const httpsServer = httpsCreateServer(loadTLS(), (req, res) => {
  req.headers["x-forwarded-proto"] = "https";
  proxy.web(req, res);
});

httpsServer.on("upgrade", (req, socket, head) => {
  req.headers["x-forwarded-proto"] = "wss";
  proxy.ws(req, socket, head);
});

httpsServer.listen(HTTPS_PORT, () =>
  console.log(`[HTTPS] listening on :${HTTPS_PORT} → ${TARGET}`)
);