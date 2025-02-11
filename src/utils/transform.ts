import { z } from 'zod';

// Define the color type
type Color = {
  r: number;
  g: number;
  b: number;
  a: number;
};

// Define the fill type
type Fill = {
  type: string;
  color?: Color;
};

// Define types for the transformed node structure
export interface MinimalFigmaNode {
  id: string;
  name: string;
  type: string;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    letterSpacing?: number;
    lineHeight?: number;
    textAlignHorizontal?: string;
    fills?: Fill[];
  };
  characters?: string;
  children?: MinimalFigmaNode[];
}

/**
 * Transforms a color object into our Color type
 */
function transformColor(color: any): Color | undefined {
  if (!color || typeof color !== 'object') return undefined;
  
  const { r, g, b, a } = color;
  if (typeof r !== 'number' || typeof g !== 'number' || 
      typeof b !== 'number' || typeof a !== 'number') {
    return undefined;
  }
  
  return { r, g, b, a };
}

/**
 * Transforms a fill object into our Fill type
 */
function transformFill(fill: any): Fill | undefined {
  if (!fill || typeof fill !== 'object' || typeof fill.type !== 'string') {
    return undefined;
  }

  const result: Fill = { type: fill.type };
  if (fill.color) {
    const color = transformColor(fill.color);
    if (color) {
      result.color = color;
    }
  }
  return result;
}

/**
 * Summarizes text content if it exceeds a certain length
 */
function summarizeText(text: string, maxLength: number = 100): string {
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + "...";
  }
  return text;
}

/**
 * Transforms style information into our expected format
 */
function transformStyle(style: any): MinimalFigmaNode['style'] | undefined {
  if (!style || typeof style !== 'object') return undefined;

  const result: MinimalFigmaNode['style'] = {};

  // Handle simple properties
  if (typeof style.fontFamily === 'string') result.fontFamily = style.fontFamily;
  if (typeof style.fontSize === 'number') result.fontSize = style.fontSize;
  if (typeof style.fontWeight === 'number') result.fontWeight = style.fontWeight;
  if (typeof style.letterSpacing === 'number') result.letterSpacing = style.letterSpacing;
  if (typeof style.textAlignHorizontal === 'string') result.textAlignHorizontal = style.textAlignHorizontal;

  // Handle lineHeight
  if (typeof style.lineHeight === 'number') {
    result.lineHeight = style.lineHeight;
  } else if (style.lineHeight?.value && typeof style.lineHeight.value === 'number') {
    result.lineHeight = style.lineHeight.value;
  }

  // Handle fills
  if (Array.isArray(style.fills)) {
    const fills = style.fills
      .map(transformFill)
      .filter((fill): fill is Fill => fill !== undefined);
    if (fills.length > 0) {
      result.fills = fills;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Transforms a Figma node into a minimal structure
 */
export function transformFigmaNode(node: any): MinimalFigmaNode {
  const transformed: MinimalFigmaNode = {
    id: node.id,
    name: node.name,
    type: node.type
  };

  // Include bounding box if available
  if (node.absoluteBoundingBox) {
    const { x, y, width, height } = node.absoluteBoundingBox;
    if (typeof x === 'number' && typeof y === 'number' && 
        typeof width === 'number' && typeof height === 'number') {
      transformed.absoluteBoundingBox = { x, y, width, height };
    }
  }

  // Include style information
  const style = transformStyle(node.style);
  if (style) {
    transformed.style = style;
  }

  // Include summarized text content for TEXT nodes
  if (node.type === 'TEXT' && typeof node.characters === 'string') {
    transformed.characters = summarizeText(node.characters);
  }

  // Recursively transform children
  if (Array.isArray(node.children)) {
    transformed.children = node.children.map(transformFigmaNode);
  }

  return transformed;
}

/**
 * Transforms an entire Figma document
 */
export function transformFigmaDocument(document: any): any {
  return {
    name: document.name,
    version: document.version,
    lastModified: document.lastModified,
    thumbnailUrl: document.thumbnailUrl,
    document: transformFigmaNode(document.document)
  };
} 