import type { Response as ExpressResponse } from 'express';
import {
  Request as FirebaseRequest,
  CallableRequest,
} from 'firebase-functions/v2/https';
import type { CloudEvent } from 'firebase-functions/v2';
// 必要に応じて ScheduledEvent 等もimport
import { Hono } from 'hono';
import { assembleRequest } from './assembleRequest';
import { mergeHeaders } from './mergeHeaders';
import type { IncomingHttpHeaders } from 'http'

/**
 * Firebase Functions 用メソッドの種類
 */
type FirebaseFunctionType = 'onRequest' | 'onCall' | 'onEvent' | 'onSchedule';

/**
 * それぞれが返すハンドラの型
 */
type OnRequestHandler = (req: FirebaseRequest, res: ExpressResponse) => Promise<void>;
type OnCallHandler = (req: CallableRequest<unknown>) => any;
type OnEventHandler<T> = (event: CloudEvent<T>) => void | Promise<void>;
type OnScheduleHandler = () => void | Promise<void>;

/**
 * オーバーロード定義
 * 第3引数 templateRequest は省略可。
 */
function handle<T = unknown>(app: Hono, type: 'onRequest', templateRequest?: Partial<Request>): OnRequestHandler;
function handle<T = unknown>(app: Hono, type: 'onCall',    templateRequest?: Partial<Request>): OnCallHandler;
function handle<T = unknown>(app: Hono, type: 'onEvent',   templateRequest?: Partial<Request>): OnEventHandler<T>;
function handle<T = unknown>(app: Hono, type: 'onSchedule',templateRequest?: Partial<Request>): OnScheduleHandler;

/**
 * 実装本体
 */
function handle<T = unknown>(
  app: Hono,
  type: FirebaseFunctionType,
  templateRequest?: Partial<Request>
): OnRequestHandler | OnCallHandler | OnEventHandler<T> | OnScheduleHandler {
  switch (type) {
    case 'onRequest': {
      // HTTPリクエスト対応
      return async (req: FirebaseRequest, res: ExpressResponse) => {
        const protocol = req.headers['x-forwarded-proto'] ?? 'https';
        const host = req.headers.host ?? 'localhost';
        const url = `${protocol}://${host}${req.url}`;

        // テンプレートと実際のリクエストをマージして fetch Request を作る
        const init: RequestInit = {
          // テンプレートに method があれば優先し、なければ Firebase の req.method
          method: templateRequest?.method ?? req.method,
          // 同様にヘッダーもマージ
          headers: mergeHeaders(templateRequest?.headers, req.headers),
        };

        // 必要に応じてリクエスト body も扱う
        // if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        //   init.body = req.rawBody; // Buffer -> fetch Request の body
        // }
        // もし templateRequest?.body があるなら上書き
        if (templateRequest?.body) {
          init.body = templateRequest.body;
        }

        const fetchRequest = new Request(url, init);
        const fetchResponse = await app.fetch(fetchRequest);

        // Firebase側のレスポンスへ返却
        res.status(fetchResponse.status);
        fetchResponse.headers.forEach((val, key) => {
          res.setHeader(key, val);
        });
        const buffer = Buffer.from(await fetchResponse.arrayBuffer());
        res.send(buffer);
      };
    }

    case 'onCall': {
      // CallableRequest 対応
      return async (callReq: CallableRequest<unknown>) => {

        // テンプレートの method/headers/body もマージ可能
        const init: RequestInit = {
          body:
            templateRequest?.body ??
            JSON.stringify(callReq.data), // デフォルトでは callReq.data を送る
        };

        const fetchRequest = assembleRequest(templateRequest, init)
        const fetchResponse = await app.fetch(fetchRequest);

        // onCall では return した値がクライアントへ返される
        // ここでは JSON として返す例
        return await fetchResponse.json();
      };
    }

    case 'onEvent': {
      // Firestoreトリガー等のクラウドイベント対応
      return async <T>(event: CloudEvent<T>) => {

        const init: RequestInit = {
          body:
            templateRequest?.body ??
            JSON.stringify(event), // 例: まるごと送る
        };

        const fetchRequest = assembleRequest(templateRequest, init);
        const response = await app.fetch(fetchRequest);

        // イベントトリガーは戻り値があまり重要でないことが多いが
        // 必要に応じてログを出すなど
        console.log('onEvent response status:', response.status);
      };
    }

    case 'onSchedule': {
      // スケジュールトリガー対応
      return async () => {
        const init: RequestInit = {
          body: templateRequest?.body ?? JSON.stringify({ schedule: true }),
        };

        const fetchRequest =assembleRequest(templateRequest, init);
        const response = await app.fetch(fetchRequest);
        console.log('onSchedule response status:', response.status);
      };
    }

    default:
      throw new Error(`Unsupported Firebase function type: ${type}`);
  }
}

/**
 * NodeのIncomingHttpHeadersを、Fetch APIが受け取れるRecord<string, string>に変換する
 */
function convertNodeHeadersToRecord(
  incoming: IncomingHttpHeaders
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, val] of Object.entries(incoming)) {
    if (typeof val === 'string') {
      result[key] = val;
    } else if (Array.isArray(val)) {
      // 配列の場合は適当に結合
      result[key] = val.join(',');
    }
    // val が undefined の場合はスキップする
  }

  return result;
}

export { handle };