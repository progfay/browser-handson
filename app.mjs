import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { createSecureServer } from 'http2';
import { on } from 'events';
import querystring from 'querystring';
import mime from 'mime-types';

const port = 3000;
const reqs = on(
  createSecureServer({
    key: readFileSync("./cert.key"),
    cert: readFileSync("./cert.crt"),
  }).listen(port),
  'request'
);


function isLogin(req) {
  console.log(req.headers);
  for (const kv of req.headers['cookie'].split('; ')) {
    if (kv.startsWith('session-id=')) {
      return kv.substr(11) === '1';
    }
  }

  return false;
}

async function getIndex(req, res) {
  if (!isLogin(req)) {
    res.writeHead(302, {
      "Location": "/login"
    });
    res.end();
    return;
  }
  res.end("Login Success!!");
}

async function getLogin(req, res) {
  const html =  await readFile("./login.html");
  res.writeHead(200, {
    "Content-Type": "text/html"
  });
  res.end(html);
}

async function postLogin(req, res) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (d) => { data += d });
    req.on("end", () => {
      const query = querystring.parse(data);
      if (query['id'] !== 'yuki@example.com' || query['current-password'] !== 'yUki0525!')
      {
        res.writeHead(401);
        res.end("Unauthorized");
        resolve();
        return;
      }

      res.writeHead(302, {
        "Location": "/",
        "Set-Cookie": "session-id=1;",
      });
      res.end("Found");
      resolve();
    });
  });
}

async function staticFile(url, req, res) {
  try {
    const content = await readFile(resolve("./public", url.pathname.slice(1)));
    res.writeHead(200, {
      "Content-Type": mime.lookup(url.pathname),
      "Cache-Control": "max-age=60",
    });
    res.end(content);
  } catch (e) {
    console.error(e);
    res.writeHead(404);
    res.end('Not Found');
  }
}

for await (const [req, res] of reqs) {
  const url = new URL(req.url, `${req.headers[':scheme']}://${req.headers[':authority']}`);
  console.log(url);
  try {
    if (url.pathname === "/" && req.method === "GET") {
      await getIndex(req, res);
    } else if (url.pathname === "/login" && req.method === "GET") {
      await getLogin(req, res);
    } else if (url.pathname === "/login" && req.method === "POST") {
      await postLogin(req, res);
    } else {
      await staticFile(url, req, res);
    }
  } catch (e) {
    console.error(e);
    res.writeHead(500);
    res.end(e.toString());
  }
}
