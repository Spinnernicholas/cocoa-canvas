import type { BaseNode, Edge, EdgeType, NodeKind, ResolveResult } from "./types";

/**
 * Graph storage and management for dependency graph
 */
export class GraphStore {
  private nodes = new Map<string, BaseNode>();
  private edges: Edge[] = [];
  private warnings: string[] = [];

  addWarning(message: string): void {
    this.warnings.push(message);
  }

  addNode(node: BaseNode): void {
    if (!this.nodes.has(node.id)) {
      this.nodes.set(node.id, node);
    }
  }

  addEdge(from: string, to: string, type: EdgeType): void {
    this.edges.push({ from, to, type });
  }

  getNode(id: string): BaseNode | undefined {
    return this.nodes.get(id);
  }

  toResult(root: string): ResolveResult {
    const lists = {
      items: [] as any[],
      services: [] as any[],
      layers: [] as any[],
      tables: [] as any[],
      resources: [] as any[]
    };

    for (const node of this.nodes.values()) {
      switch (node.kind) {
        case "item":
          lists.items.push(node);
          break;
        case "service":
          lists.services.push(node);
          break;
        case "layer":
          lists.layers.push(node);
          break;
        case "table":
          lists.tables.push(node);
          break;
        case "resource":
          lists.resources.push(node);
          break;
        default:
          break;
      }
    }

    return {
      root,
      nodes: Object.fromEntries(this.nodes.entries()),
      edges: this.edges,
      lists,
      warnings: this.warnings
    } as ResolveResult;
  }
}
