import type {
  BaseNode,
  ItemNode,
  LayerNode,
  NormalizedTarget,
  ResolveOptions,
  ResolveResult,
  ServiceNode,
  TableNode
} from "./types";
import { Fetcher } from "./fetcher";
import { GraphStore } from "./graph";
import { normalizeArcGISUrl } from "./normalize";
import { deepScan } from "./scan";

interface ArcGISItemResponse {
  id: string;
  type?: string;
  typeKeywords?: string[];
  url?: string;
  title?: string;
}

interface ArcGISServiceResponse {
  serviceItemId?: string;
  layers?: Array<{ id: number; name?: string }>;
  tables?: Array<{ id: number; name?: string }>;
  type?: string;
}

/**
 * Main entry point to resolve ArcGIS URLs into dependency graphs
 */
export async function resolveArcGIS(
  inputUrl: string,
  options: ResolveOptions = {}
): Promise<ResolveResult> {
  const fetcher = new Fetcher(options);
  const graph = new GraphStore();
  const queue: NormalizedTarget[] = normalizeArcGISUrl(inputUrl);
  const seen = new Set<string>();

  if (queue.length === 0) {
    graph.addWarning("No ArcGIS targets detected for input.");
    return graph.toResult(inputUrl);
  }

  while (queue.length > 0) {
    const target = queue.shift()!;
    const key = `${target.kind}:${target.url}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    if (target.kind === "item" && target.itemId && target.portalBaseUrl) {
      try {
        const discovered = await resolveItem(target.itemId, target.portalBaseUrl, fetcher, graph, options);
        queue.push(...discovered);
      } catch (error) {
        graph.addWarning(`Failed to resolve item ${target.itemId}: ${String(error)}`);
      }
    }

    if (target.kind === "service") {
      try {
        const discovered = await resolveService(target.url, fetcher, graph);
        queue.push(...discovered);
      } catch (error) {
        graph.addWarning(`Failed to resolve service ${target.url}: ${String(error)}`);
      }
    }
  }

  return graph.toResult(inputUrl);
}

async function resolveItem(
  itemId: string,
  portalBaseUrl: string,
  fetcher: Fetcher,
  graph: GraphStore,
  options: ResolveOptions
): Promise<NormalizedTarget[]> {
  const discovered: NormalizedTarget[] = [];
  const itemUrl = `${portalBaseUrl}/sharing/rest/content/items/${itemId}`;
  const itemResponse = await fetcher.getJson<ArcGISItemResponse>(itemUrl);

  const itemNode: ItemNode = {
    id: `${portalBaseUrl}/items/${itemId}`,
    kind: "item",
    itemId,
    portalBaseUrl,
    itemType: itemResponse.data.type,
    typeKeywords: itemResponse.data.typeKeywords,
    label: itemResponse.data.title,
    url: itemUrl
  };

  graph.addNode(itemNode);

  if (itemResponse.data.url) {
    // Only treat URLs pointing to actual services as service targets
    if (itemResponse.data.url.includes("/arcgis/rest/services/")) {
      discovered.push({ kind: "service", url: itemResponse.data.url });
      graph.addEdge(itemNode.id, itemResponse.data.url, "references");
    }
  }

  const dataUrl = `${portalBaseUrl}/sharing/rest/content/items/${itemId}/data`;
  let dataJson: any = null;
  try {
    const dataResponse = await fetcher.getJson<any>(dataUrl);
    dataJson = dataResponse.data;
  } catch (error) {
    graph.addWarning(`Item data fetch failed for ${itemId}: ${String(error)}`);
  }

  if (dataJson) {
    const scanResult = deepScan(dataJson);
    for (const serviceUrl of scanResult.serviceUrls) {
      discovered.push({ kind: "service", url: serviceUrl });
      graph.addEdge(itemNode.id, serviceUrl, "references");
    }
    for (const discoveredItemId of scanResult.itemIds) {
      discovered.push({
        kind: "item",
        url: `${portalBaseUrl}/sharing/rest/content/items/${discoveredItemId}`,
        portalBaseUrl,
        itemId: discoveredItemId
      });
      graph.addEdge(itemNode.id, `${portalBaseUrl}/items/${discoveredItemId}`, "references");
    }

    if (isWebMap(itemNode)) {
      const webMapTargets = resolveWebMap(dataJson, graph, itemNode);
      discovered.push(...webMapTargets);
    }
  }

  return discovered;
}

function isWebMap(itemNode: ItemNode): boolean {
  if (itemNode.itemType === "Web Map") {
    return true;
  }
  return (itemNode.typeKeywords ?? []).includes("Web Map");
}

function resolveWebMap(dataJson: any, graph: GraphStore, itemNode: ItemNode): NormalizedTarget[] {
  const discovered: NormalizedTarget[] = [];
  const layers = Array.isArray(dataJson?.operationalLayers) ? dataJson.operationalLayers : [];
  const tables = Array.isArray(dataJson?.tables) ? dataJson.tables : [];
  const baseLayers = Array.isArray(dataJson?.baseMap?.baseMapLayers) ? dataJson.baseMap.baseMapLayers : [];

  const handleLayer = (layer: any): void => {
    if (layer?.url) {
      const serviceUrl = layer.url.replace(/\/(\d+)$/, "");
      discovered.push({ kind: "service", url: serviceUrl });
      graph.addEdge(itemNode.id, serviceUrl, "depends-on");

      const layerIdMatch = layer.url.match(/\/(\d+)$/);
      if (layerIdMatch) {
        const layerNode: LayerNode = {
          id: layer.url,
          kind: "layer",
          serviceUrl,
          layerId: Number(layerIdMatch[1]),
          label: layer.title ?? layer.name
        };
        graph.addNode(layerNode);
        graph.addEdge(serviceUrl, layerNode.id, "references");
      }
    }

    if (layer?.itemId) {
      const portalBaseUrl = new URL(itemNode.portalBaseUrl).toString().replace(/\/$/, "");
      discovered.push({
        kind: "item",
        url: `${portalBaseUrl}/sharing/rest/content/items/${layer.itemId}`,
        portalBaseUrl,
        itemId: layer.itemId
      });
      graph.addEdge(itemNode.id, `${portalBaseUrl}/items/${layer.itemId}`, "references");
    }
  };

  for (const layer of layers) {
    handleLayer(layer);
  }
  for (const table of tables) {
    handleLayer(table);
  }
  for (const baseLayer of baseLayers) {
    handleLayer(baseLayer);
  }

  return discovered;
}

async function resolveService(
  serviceUrl: string,
  fetcher: Fetcher,
  graph: GraphStore
): Promise<NormalizedTarget[]> {
  const discovered: NormalizedTarget[] = [];
  const response = await fetcher.getJson<ArcGISServiceResponse>(serviceUrl);
  const serviceType = detectServiceType(serviceUrl);

  const serviceNode: ServiceNode = {
    id: serviceUrl,
    kind: "service",
    serviceUrl,
    serviceType,
    label: response.data.type
  };

  graph.addNode(serviceNode);

  if (response.data.serviceItemId) {
    const portalBaseUrl = guessPortalBaseUrl(serviceUrl);
    if (portalBaseUrl) {
      discovered.push({
        kind: "item",
        url: `${portalBaseUrl}/sharing/rest/content/items/${response.data.serviceItemId}`,
        portalBaseUrl,
        itemId: response.data.serviceItemId
      });
      graph.addEdge(serviceNode.id, `${portalBaseUrl}/items/${response.data.serviceItemId}`, "derived-from");
    }
  }

  for (const layer of response.data.layers ?? []) {
    const node: LayerNode = {
      id: `${serviceUrl}/${layer.id}`,
      kind: "layer",
      serviceUrl,
      layerId: layer.id,
      label: layer.name
    };
    graph.addNode(node);
    graph.addEdge(serviceNode.id, node.id, "references");
  }

  for (const table of response.data.tables ?? []) {
    const node: TableNode = {
      id: `${serviceUrl}/${table.id}`,
      kind: "table",
      serviceUrl,
      tableId: table.id,
      label: table.name
    };
    graph.addNode(node);
    graph.addEdge(serviceNode.id, node.id, "references");
  }

  return discovered;
}

function detectServiceType(serviceUrl: string): ServiceNode["serviceType"] {
  if (serviceUrl.includes("FeatureServer")) {
    return "FeatureServer";
  }
  if (serviceUrl.includes("MapServer")) {
    return "MapServer";
  }
  if (serviceUrl.includes("ImageServer")) {
    return "ImageServer";
  }
  return undefined;
}

function guessPortalBaseUrl(serviceUrl: string): string | null {
  try {
    const parsed = new URL(serviceUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}
