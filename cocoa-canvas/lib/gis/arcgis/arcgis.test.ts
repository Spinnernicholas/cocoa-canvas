import { describe, expect, it } from 'vitest';
import {
  normalizeArcGISUrl,
  deepScan,
  GraphStore,
  resolveArcGIS,
} from '@/lib/gis/arcgis/index';
import type { ResolveOptions } from '@/lib/gis/arcgis/types';

describe('ArcGIS Library', () => {
  describe('normalizeArcGISUrl', () => {
    it('detects item page urls', () => {
      const targets = normalizeArcGISUrl(
        'https://www.arcgis.com/home/item.html?id=abcdefabcdefabcdefabcdefabcdefab'
      );
      expect(targets).toHaveLength(1);
      expect(targets[0].kind).toBe('item');
    });

    it('detects sharing rest item urls', () => {
      const targets = normalizeArcGISUrl(
        'https://example.com/sharing/rest/content/items/abcdefabcdefabcdefabcdefabcdefab'
      );
      expect(targets[0].kind).toBe('item');
    });

    it('detects service urls', () => {
      const targets = normalizeArcGISUrl(
        'https://example.com/arcgis/rest/services/Test/MapServer/2'
      );
      expect(targets[0].kind).toBe('service');
    });

    it('detects web app viewer urls', () => {
      const targets = normalizeArcGISUrl(
        'https://www.arcgis.com/apps/webappviewer/index.html?id=92d542bcb39247e8b558021bd0446d18'
      );
      expect(targets).toHaveLength(1);
      expect(targets[0].kind).toBe('item');
      expect(targets[0].itemId).toBe('92d542bcb39247e8b558021bd0446d18');
      expect(targets[0].url).toBe(
        'https://www.arcgis.com/sharing/rest/content/items/92d542bcb39247e8b558021bd0446d18'
      );
      expect(targets[0].portalBaseUrl).toBe('https://www.arcgis.com');
    });
  });

  describe('deepScan', () => {
    it('scans nested JSON for arcgis urls and ids', () => {
      const data = {
        name: 'Test Web Map',
        operationalLayers: [
          {
            url: 'https://example.com/arcgis/rest/services/Test/MapServer',
            itemId: 'layer123',
          },
        ],
        baseMap: {
          baseMapLayers: [
            {
              url: 'https://example.com/arcgis/rest/services/Basemap/MapServer',
            },
          ],
        },
      };

      const result = deepScan(data);
      expect(result.serviceUrls.size).toBeGreaterThan(0);
      
      const urls = Array.from(result.serviceUrls);
      const hasServiceUrl = urls.some((url) =>
        url.includes('/arcgis/rest/services/')
      );
      expect(hasServiceUrl).toBe(true);
    });

    it('handles circular references without infinite loops', () => {
      const data: any = { name: 'Test' };
      data.self = data; // Circular reference

      expect(() => deepScan(data)).not.toThrow();
    });
  });

  describe('GraphStore', () => {
    it('stores nodes and edges', () => {
      const store = new GraphStore();

      const itemNode: any = { kind: 'item', id: 'item1', itemId: 'item1' };
      const serviceNode: any = {
        kind: 'service',
        id: 'service1',
        serviceUrl: 'https://example.com/arcgis/rest/services/Test/MapServer',
      };

      store.addNode(itemNode);
      store.addNode(serviceNode);
      store.addEdge('item1', 'service1', 'depends-on');

      expect(store.getNode('item1')).toBeDefined();
      expect(store.getNode('service1')).toBeDefined();
    });

    it('deduplicates nodes by id', () => {
      const store = new GraphStore();

      const serviceNode: any = {
        kind: 'service',
        id: 'service1',
        serviceUrl: 'https://example.com/arcgis/rest/services/Test/MapServer',
      };

      store.addNode(serviceNode);
      store.addNode(serviceNode); // Add same node again

      const result = store.toResult('root');
      // Should only have one service
      expect(Object.keys(result.nodes)).toHaveLength(1);
    });

    it('collects warnings', () => {
      const store = new GraphStore();
      store.addWarning('Test warning');
      store.addWarning('Another warning');

      const result = store.toResult('root');
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0]).toBe('Test warning');
    });

    it('generates flattened lists', () => {
      const store = new GraphStore();

      const itemNode: any = { kind: 'item', id: 'item1', itemId: 'item1' };
      const serviceNode: any = {
        kind: 'service',
        id: 'service1',
        serviceUrl: 'https://example.com/arcgis/rest/services/Test/MapServer',
      };
      const layerNode: any = {
        kind: 'layer',
        id: 'layer1',
        serviceUrl: 'https://example.com/arcgis/rest/services/Test/MapServer',
        layerId: 0,
      };

      store.addNode(itemNode);
      store.addNode(serviceNode);
      store.addNode(layerNode);

      const result = store.toResult('root');
      expect(result.lists.items).toHaveLength(1);
      expect(result.lists.services).toHaveLength(1);
      expect(result.lists.layers).toHaveLength(1);
    });
  });

  describe('resolveArcGIS', () => {
    it('handles invalid input gracefully', async () => {
      const result = await resolveArcGIS('not-a-url', {
        concurrency: 2,
      });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('returns result structure with nodes, edges, warnings', async () => {
      // Using a simple test - just verify structure
      const options: ResolveOptions = {
        maxConcurrency: 1,
      };

      const result = await resolveArcGIS('https://invalid-example.test/home/item.html?id=test', options);

      expect(result).toHaveProperty('root');
      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('edges');
      expect(result).toHaveProperty('lists');
      expect(result).toHaveProperty('warnings');
      expect(typeof result.nodes).toBe('object');
      expect(Array.isArray(result.edges)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });
});
