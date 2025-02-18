import type { IncomingHttpHeaders } from 'http';

function mergeHeaders(
  maybeHeaders1?: HeadersInit | IncomingHttpHeaders,
  maybeHeaders2?: HeadersInit | IncomingHttpHeaders
): HeadersInit {
  // どちらも最終的に Record<string, string> に変換し、
  // それを一つのオブジェクトにまとめる例
  const h1 = toHeadersInit(maybeHeaders1);
  const h2 = toHeadersInit(maybeHeaders2);

  // 結果を普通のオブジェクトとしてまとめる
  const result: Record<string, string> = {};
  // h1 が Headers の場合など考慮しつつ全部展開
  new Headers(h1).forEach((val, key) => {
    result[key] = val;
  });
  new Headers(h2).forEach((val, key) => {
    result[key] = val;
  });

  return result;
}

// 上記ヘルパー
function toHeadersInit(h?: HeadersInit | IncomingHttpHeaders): HeadersInit {
  if (!h) {
    return {};
  }
  // NodeのIncomingHttpHeadersなら変換
  if (isIncomingHttpHeaders(h)) {
    return convertNodeHeadersToRecord(h);
  }
  return h;
}

// 型ガード
function isIncomingHttpHeaders(
  h: any
): h is IncomingHttpHeaders {
  return typeof h === 'object' && !('forEach' in h);
}

function convertNodeHeadersToRecord(
  incoming: IncomingHttpHeaders
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(incoming)) {
    if (typeof val === 'string') {
      result[key] = val;
    } else if (Array.isArray(val)) {
      result[key] = val.join(',');
    }
  }
  return result;
}

export { mergeHeaders }
