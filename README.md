# hono-firebase-functions

## Firebase Hono Adapter

`hono-firebase-functions` is an adapter that allows you to run a Hono application on Firebase Functions by bridging Firebase's HTTP request/response to Hono's `fetch` API pipeline.

## Installation

```sh
npm install hono firebase-functions hono-firebase-functions
```

```js
import {onRequest} from "firebase-functions/v2/https";
import {handle} from "hono-firebase-functions";
import {Hono} from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

export const hono = onRequest(handle(app));
```