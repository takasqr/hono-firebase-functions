import {onRequest} from "firebase-functions/v2/https";
// import {onCall, onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
// import {handle} from "hono-firebase-functions";
import {handle} from "./handle";
import {app} from "./app";

// Hono を handle に渡して onRequest を定義
export const hono = onRequest(handle(app));

// 通常の onRequest
export const hello = onRequest((_req, res) => {
  logger.info("Hello logs!", {structuredData: true});
  res.send("Hello from Firebase!!!!!!");
});

// export const helloOnCall = onCall((request) => {
//   logger.info("Hello logs!", {structuredData: true});

//   // Message text passed from the client.
//   const text = request.data.text;
//   return {
//     returnContent: text,
//   };
// });
