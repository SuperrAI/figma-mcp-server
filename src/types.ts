import { ResourceContents } from '@modelcontextprotocol/sdk/types.js';

export type FigmaFile = {
  key: string;
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
};

export type FigmaComponent = {
  key: string;
  name: string;
  description: string;
  fileKey: string;
  nodeId: string;
};

export type FigmaVariable = {
  id: string;
  name: string;
  description: string;
  fileKey: string;
  resolvedType: string;
  valuesByMode: Record<string, any>;
};

export type FigmaResourceType =
  | 'file' // Full file data
  | 'nodes' // Specific nodes in a file
  | 'images' // Image fills
  | 'comments' // File comments
  | 'versions' // File versions
  | 'components' // Components in file
  | 'styles' // Styles in file
  | 'variables'; // Variables in file

export type FigmaResource = {
  uri: string;
  type: FigmaResourceType;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
};

export type ResourceHandler = {
  list: () => Promise<FigmaResource[]>;
  read: (uri: string) => Promise<ResourceContents[]>;
  watch?: (uri: string) => Promise<void>;
  search?: (query: string) => Promise<FigmaResource[]>;
};
