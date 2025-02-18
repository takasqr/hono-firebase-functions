import { mergeHeaders } from './mergeHeaders'

/**
 * `Partial<Request>` と `RequestInit` をマージし、新しい `Request` を組み立てる関数
 *
 * - `RequestInit` の値が優先され、`Partial<Request>` の値はデフォルトとして扱われる
 * - `headers` は適切にマージされ、`Headers` インスタンスとして返される
 * - `partial` を省略するとデフォルトのリクエストが作成される
 *
 * @param {Partial<Request>} [partial] - 既存のリクエスト情報（不完全な `Request`）
 * @param {RequestInit} [initOverrides] - 上書き用の `RequestInit`
 * @returns {Request} 新しい `Request` インスタンス
 */
export function assembleRequest(
  partial?: Partial<Request>,
  initOverrides?: RequestInit
): Request {
  const url = partial?.url ?? 'https://example.com/dummy';

  const init: RequestInit = {
    method: initOverrides?.method ?? partial?.method,
    headers: mergeHeaders(partial?.headers, initOverrides?.headers),
    body: initOverrides?.body ?? (partial?.body as BodyInit),
    cache: initOverrides?.cache,
    credentials: initOverrides?.credentials,
    mode: initOverrides?.mode,
    redirect: initOverrides?.redirect,
    referrer: initOverrides?.referrer,
    referrerPolicy: initOverrides?.referrerPolicy,
    integrity: initOverrides?.integrity,
  };

  return new Request(url, init);
}
