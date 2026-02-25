/**
 * Deep scanning for embedded service URLs and item IDs in JSON structures
 */

// Match any ArcGIS REST service URL (MapServer, FeatureServer, or any other *Server)
const SERVICE_URL_REGEX = /(https?:\/\/[^\s"']+\/arcgis\/rest\/services\/[^\s"']+?\/[A-Za-z]+Server(?:\/\d+)?)/gi;
const ITEM_ID_CONTEXT_REGEX = /(?:id=|itemId\s*[:=]|\/items\/)([0-9a-fA-F]{32})/gi;

export interface ScanResult {
  serviceUrls: Set<string>;
  itemIds: Set<string>;
}

/**
 * Normalize service URL by removing layer ID suffix
 * e.g., https://example.com/MapServer/2 -> https://example.com/MapServer
 */
function normalizeServiceUrl(url: string): string {
  return url.replace(/\/\d+$/, '');
}

function scanString(value: string, result: ScanResult): void {
  let match: RegExpExecArray | null = null;

  while ((match = SERVICE_URL_REGEX.exec(value)) !== null) {
    // Normalize URL to remove layer IDs before adding to result
    const normalized = normalizeServiceUrl(match[1]);
    result.serviceUrls.add(normalized);
  }

  while ((match = ITEM_ID_CONTEXT_REGEX.exec(value)) !== null) {
    result.itemIds.add(match[1]);
  }
}

/**
 * Recursively scan a JSON structure for embedded ArcGIS URLs and item IDs
 */
export function deepScan(value: unknown): ScanResult {
  const result: ScanResult = { serviceUrls: new Set(), itemIds: new Set() };
  const seen = new Set<unknown>();

  const visit = (node: unknown): void => {
    if (node === null || node === undefined) {
      return;
    }

    if (typeof node === "string") {
      scanString(node, result);
      return;
    }

    if (typeof node !== "object") {
      return;
    }

    if (seen.has(node)) {
      return;
    }

    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }
      return;
    }

    for (const value of Object.values(node)) {
      visit(value);
    }
  };

  visit(value);
  return result;
}
