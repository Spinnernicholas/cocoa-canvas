/**
 * ArcGIS Web App Resolver
 * 
 * Extracts layer hierarchy, basemaps, and service catalog from
 * ArcGIS Web App Viewer URLs for use in custom applications.
 */

export type NodeKind = "item" | "service" | "layer" | "table" | "resource" | "unknown";
export type EdgeType = "depends-on" | "references" | "derived-from";

export interface BaseNode {
  id: string;
  kind: NodeKind;
  url?: string;
  label?: string;
  meta?: Record<string, unknown>;
}

export interface ItemNode extends BaseNode {
  kind: "item";
  itemId: string;
  portalBaseUrl: string;
  itemType?: string;
  typeKeywords?: string[];
}

export interface ServiceNode extends BaseNode {
  kind: "service";
  serviceUrl: string;
  serviceType?: "FeatureServer" | "MapServer" | "ImageServer";
}

export interface LayerNode extends BaseNode {
  kind: "layer";
  serviceUrl: string;
  layerId: number;
}

export interface TableNode extends BaseNode {
  kind: "table";
  serviceUrl: string;
  tableId: number;
}

export interface ResourceNode extends BaseNode {
  kind: "resource";
  itemId: string;
  resourcePath: string;
}

export interface Edge {
  from: string;
  to: string;
  type: EdgeType;
}

/**
 * Normalized representation of an ArcGIS target (item or service)
 */
export interface NormalizedTarget {
  kind: "item" | "service";
  url: string;
  portalBaseUrl?: string;
  itemId?: string;
}

/**
 * Options for resolving ArcGIS URLs
 */
export interface ResolveOptions {
  auth?:
    | { token?: string; portal?: string }
    | { getToken: () => Promise<string> };
  portalBaseUrl?: string;
  concurrency?: number;
  include?: {
    resources?: boolean;
    relatedItems?: boolean;
    serviceLayerDetails?: boolean;
  };
  signal?: AbortSignal;
}

/**
 * Complete resolution result with nodes, edges, and flattened lists
 */
export interface ResolveResult {
  root: string;
  nodes: Record<string, BaseNode>;
  edges: Edge[];
  lists: {
    items: ItemNode[];
    services: ServiceNode[];
    layers: LayerNode[];
    tables: TableNode[];
    resources: ResourceNode[];
  };
  warnings: string[];
}

/**
 * ArcGIS error response format
 */
export interface ArcGISError {
  message: string;
  details?: string[];
  code?: number;
}
