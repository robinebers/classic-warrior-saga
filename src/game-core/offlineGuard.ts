/** Fail if source text references browser networking APIs. */
export function assertNoNetworkingImports(source: string): boolean {
  return !/\b(fetch|XMLHttpRequest|WebSocket|navigator\.sendBeacon)\b/.test(source)
}
