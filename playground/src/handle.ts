import type {Response as ExpressResponse} from "express";
import {Request as FirebaseRequest} from "firebase-functions/v2/https";
import {Hono} from "hono";

// eslint-disable-next-line valid-jsdoc
/**
 * Creates an adapter function that bridges Firebase Functions
 * requests/responses to a Hono application via the Fetch API.
 *
 * @param {Hono} app - The Hono application instance.
 * @returns {(req: FirebaseRequest, res: ExpressResponse) => Promise<void>}
 *   A function that handles Firebase's request/response using
 *   the Hono fetch pipeline.
 */
function handle(
  app: Hono
): (req: FirebaseRequest, res: ExpressResponse) => Promise<void> {
  return async (req: FirebaseRequest, res: ExpressResponse) => {
    const protocol = req.headers["x-forwarded-proto"] ?? "https";
    const host = req.headers.host ?? "localhost";
    const url = `${protocol}://${host}${req.url}`;

    // Web標準の RequestInit
    const init: RequestInit = {
      method: req.method,
      headers: req.headers as Record<string, string>,
    };

    // rawBody が Buffer の可能性があるなら ArrayBuffer に変換しておくか、
    // そのまま使える場合は適宜調整してください
    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      // もし rawBody が Buffer 型の場合:
      // init.body = req.rawBody;
      // rawBody が ArrayBuffer なら:
      // init.body = req.rawBody;
    }

    // ここでグローバルの Request (Node.js 18標準) を使う
    const fetchRequest = new Request(url, init);

    // Hono は標準的な fetch API に対応しているので OK
    const fetchResponse = await app.fetch(fetchRequest);

    res.status(fetchResponse.status);

    fetchResponse.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });

    const buffer = Buffer.from(await fetchResponse.arrayBuffer());
    res.send(buffer);
  };
}

export {handle};
