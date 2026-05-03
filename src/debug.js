export function parseDebugScopes(search = "") {
  const query = String(search ?? "");
  if (!query) return [];
  const source = query.startsWith("?") ? query.slice(1) : query;
  const params = new URLSearchParams(source);
  const raw = params.get("debug");
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isDebugEnabled(scope, { search } = {}) {
  const scopes = parseDebugScopes(search ?? globalThis.location?.search ?? "");
  return scopes.includes("*") || scopes.includes(scope);
}

export function debugLog(scope, ...args) {
  if (!isDebugEnabled(scope)) return;
  console.debug(`[${scope}]`, ...args);
}
