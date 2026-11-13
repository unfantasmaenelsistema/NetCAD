import {
  CableLink,
  CanvasElement,
  ScenarioId,
  TrayPath,
} from '../types/cabling';

export interface SerializedMapState {
  v: number;
  scenarioId?: ScenarioId;
  elements: CanvasElement[];
  trayPaths: TrayPath[];
  cables: CableLink[];
}

/**
 * Encodes a UTF-8 string into URL-safe Base64 (RFC 4648 §5) so Spanish accents
 * and symbols survive browser query parameters intact.
 */
function utf8ToBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes a URL-safe Base64 string back into UTF-8 text.
 */
function base64UrlToUtf8(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (b64.length % 4)) % 4;
  const padded = b64 + '='.repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Serializes the full canvas state (nodes, trays, cables, active scenario) into a URL-safe Base64 string.
 */
export function encodeMapToBase64(state: SerializedMapState): string {
  const json = JSON.stringify(state);
  return utf8ToBase64Url(json);
}

/**
 * Parses and validates a Base64-encoded `?map=...` query parameter.
 * Returns `null` if missing or malformed.
 */
export function decodeMapFromBase64(encoded: string): SerializedMapState | null {
  try {
    const json = base64UrlToUtf8(encoded.trim());
    const parsed = JSON.parse(json) as Partial<SerializedMapState>;
    if (
      !parsed ||
      !Array.isArray(parsed.elements) ||
      !Array.isArray(parsed.trayPaths) ||
      !Array.isArray(parsed.cables)
    ) {
      return null;
    }
    return {
      v: typeof parsed.v === 'number' ? parsed.v : 1,
      scenarioId: parsed.scenarioId,
      elements: parsed.elements,
      trayPaths: parsed.trayPaths,
      cables: parsed.cables,
    };
  } catch {
    return null;
  }
}

/**
 * Reads the `?map=` parameter from `window.location.search` if present.
 */
export function readMapFromCurrentUrl(): SerializedMapState | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const mapParam = params.get('map');
  if (!mapParam) return null;
  return decodeMapFromBase64(mapParam);
}

/**
 * Updates the browser URL `?map=base64...` without triggering a page reload.
 */
export function syncMapToBrowserUrl(state: SerializedMapState): string {
  const encoded = encodeMapToBase64(state);
  const url = new URL(window.location.href);
  url.searchParams.set('map', encoded);
  window.history.replaceState(null, '', url.toString());
  return url.toString();
}
