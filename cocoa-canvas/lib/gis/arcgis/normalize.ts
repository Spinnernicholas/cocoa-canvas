import type { NormalizedTarget } from "./types";

const ITEM_ID_REGEX = /[0-9a-fA-F]{32}/;

function normalizeUrl(url: string): string {
  return url.replace(/\?.*$/, "").replace(/#.*$/, "").replace(/\/+$/, "");
}

/**
 * Normalize various ArcGIS URL formats into standard REST endpoints
 */
export function normalizeArcGISUrl(inputUrl: string): NormalizedTarget[] {
  const results: NormalizedTarget[] = [];
  let parsed: URL | null = null;

  try {
    parsed = new URL(inputUrl);
  } catch {
    return results;
  }

  const normalizedInput = normalizeUrl(inputUrl);
  const portalBaseUrl = `${parsed.protocol}//${parsed.host}`;
  const searchParams = parsed.searchParams;

  // Item page: .../item.html?id=<itemId>
  // Web App Viewer: .../webappviewer/index.html?id=<itemId>
  const idParam = searchParams.get("id");
  if (idParam && ITEM_ID_REGEX.test(idParam)) {
    results.push({
      kind: "item",
      url: `${portalBaseUrl}/sharing/rest/content/items/${idParam}`,
      portalBaseUrl,
      itemId: idParam
    });
  }

  // REST endpoint: .../sharing/rest/content/items/<itemId>
  const itemPathMatch = normalizedInput.match(/\/sharing\/rest\/content\/items\/([0-9a-fA-F]{32})/);
  if (itemPathMatch) {
    results.push({
      kind: "item",
      url: `${portalBaseUrl}/sharing/rest/content/items/${itemPathMatch[1]}`,
      portalBaseUrl,
      itemId: itemPathMatch[1]
    });
  }

  // Service URL: .../arcgis/rest/services/.../FeatureServer|MapServer|ImageServer
  const serviceMatch = normalizedInput.match(
    /(https?:\/\/[^\s"']+\/arcgis\/rest\/services\/[^\s"']+?\/(FeatureServer|MapServer|ImageServer))(?:\/(\d+))?/i
  );
  if (serviceMatch) {
    const serviceUrl = normalizeUrl(serviceMatch[1]);
    results.push({
      kind: "service",
      url: serviceUrl
    });
  }

  // Deduplicate
  const dedup = new Map<string, NormalizedTarget>();
  for (const target of results) {
    dedup.set(`${target.kind}:${target.url}`, target);
  }

  return Array.from(dedup.values());
}
