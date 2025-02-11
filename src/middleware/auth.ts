import { InvalidFigmaTokenError, InvalidUriError } from '../errors.js';
import { FigmaResourceType } from '../types.js';

export const validateToken = () => {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    throw new InvalidFigmaTokenError();
  }
  return token;
};

export const validateUri = (uri: string) => {
  // Support formats:
  // figma:///file/{file_key}
  // figma:///file/{file_key}/nodes/{node_ids}
  // figma:///file/{file_key}/images
  // figma:///file/{file_key}/comments
  // figma:///file/{file_key}/versions
  // figma:///file/{file_key}/components
  // figma:///file/{file_key}/styles
  // figma:///file/{file_key}/variables

  const match = uri.match(/^figma:\/\/\/file\/([\w-]+)(\/(\w+)(\/(.+))?)?$/);
  if (!match) {
    throw new InvalidUriError(uri);
  }

  return {
    fileKey: match[1],
    resourceType: match[3] as FigmaResourceType | undefined,
    resourceId: match[5],
  };
};
