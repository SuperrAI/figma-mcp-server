import { ResourceContents } from '@modelcontextprotocol/sdk/types.js';
import debug from 'debug';
import fetch from 'node-fetch';

import { ResourceAccessDeniedError, ResourceNotFoundError } from '../errors.js';
import { validateUri } from '../middleware/auth.js';
import { FigmaResource, FigmaResourceType, ResourceHandler } from '../types.js';
import { transformFigmaDocument, transformFigmaNode } from '../utils/transform.js';

const log = debug('figma-mcp:figma-handler');

export class FigmaResourceHandler implements ResourceHandler {
  private baseUrl = 'https://api.figma.com/v1';

  constructor(private token: string) {}

  public async figmaRequest(path: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'X-Figma-Token': this.token,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new ResourceNotFoundError('Figma resource not found');
      }
      if (response.status === 403) {
        throw new ResourceAccessDeniedError('Access to Figma resource denied');
      }
      throw new Error(`Figma API error: ${response.statusText}`);
    }

    return response.json();
  }

  async read(uri: string): Promise<ResourceContents[]> {
    const { fileKey, resourceType, resourceId } = validateUri(uri);

    // If no resource type specified, return transformed full file
    if (!resourceType) {
      const file = await this.figmaRequest(`/files/${fileKey}`);
      const transformedFile = transformFigmaDocument(file);
      return [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(transformedFile, null, 2),
        },
      ];
    }

    // Handle specific resource types
    switch (resourceType) {
      case 'nodes': {
        const nodeIds = resourceId?.split(',') || [];
        const nodes = await this.figmaRequest(`/files/${fileKey}/nodes?ids=${nodeIds.join(',')}`);
        
        // Transform each node in the response
        const transformedNodes = Object.fromEntries(
          Object.entries(nodes.nodes).map(([id, node]) => [
            id,
            transformFigmaNode(node)
          ])
        );
        
        return [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ nodes: transformedNodes }, null, 2),
          },
        ];
      }

      case 'images': {
        const images = await this.figmaRequest(`/files/${fileKey}/images`);
        return [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(images, null, 2),
          },
        ];
      }

      case 'comments': {
        const comments = await this.figmaRequest(`/files/${fileKey}/comments`);
        return [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(comments, null, 2),
          },
        ];
      }

      case 'versions': {
        const versions = await this.figmaRequest(`/files/${fileKey}/versions`);
        return [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(versions, null, 2),
          },
        ];
      }

      case 'components': {
        const components = await this.figmaRequest(`/files/${fileKey}/components`);
        return [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(components, null, 2),
          },
        ];
      }

      case 'styles': {
        const styles = await this.figmaRequest(`/files/${fileKey}/styles`);
        return [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(styles, null, 2),
          },
        ];
      }

      case 'variables': {
        const variables = await this.figmaRequest(`/files/${fileKey}/variables/local`);
        return [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(variables, null, 2),
          },
        ];
      }

      default:
        throw new Error(`Unsupported resource type: ${resourceType}`);
    }
  }

  async list(): Promise<FigmaResource[]> {
    // List accessible files
    const files = await this.figmaRequest('/me/files');

    const resources: FigmaResource[] = [];

    for (const file of files.files) {
      // Add main file resource
      resources.push({
        uri: `figma:///file/${file.key}`,
        type: 'file',
        name: file.name,
        metadata: {
          lastModified: file.lastModified,
          thumbnailUrl: file.thumbnailUrl,
        },
      });

      // Add sub-resources
      const subResources: FigmaResourceType[] = ['images', 'comments', 'versions', 'components', 'styles', 'variables'];

      for (const type of subResources) {
        resources.push({
          uri: `figma:///file/${file.key}/${type}`,
          type,
          name: `${file.name} - ${type}`,
          metadata: {
            fileKey: file.key,
            fileName: file.name,
          },
        });
      }
    }

    return resources;
  }

  async search(query: string): Promise<FigmaResource[]> {
    log('Searching Figma resources:', query);
    const searchResults = await this.figmaRequest(`/search?query=${encodeURIComponent(query)}`);

    return searchResults.files.map((file: any) => ({
      uri: `figma:///file/${file.key}`,
      type: 'file',
      name: file.name,
      metadata: {
        lastModified: file.lastModified,
        thumbnailUrl: file.thumbnailUrl,
      },
    }));
  }

  async watch(uri: string): Promise<void> {
    const { resourceType, fileKey } = validateUri(uri);
    log('Setting up watch for Figma resource:', { resourceType, fileKey });

    // For now, just verify the resource exists
    if (resourceType === 'file') {
      await this.figmaRequest(`/files/${fileKey}`);
    }
    // Real-time updates would require WebSocket implementation
  }
}
