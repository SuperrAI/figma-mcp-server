import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import fs from 'fs';
import { z } from 'zod';

import { FigmaResourceHandler } from './handlers/figma.js';

// Load environment variables
dotenv.config();

// Create a write stream for logging
const logFile = fs.createWriteStream('/tmp/figma-mcp.log', { flags: 'a' });

// Custom logger function
function log(message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message} ${args.map((arg) => JSON.stringify(arg)).join(' ')}`;

  // Write to file
  logFile.write(logMessage + '\n');

  // Also log to stderr for development
  console.error(logMessage);
}

async function main() {
  try {
    log('Starting Figma MCP server...');

    const figmaToken = process.env.FIGMA_ACCESS_TOKEN || 'HARD_CODE_HERE'
    if (!figmaToken) {
      throw new Error('FIGMA_ACCESS_TOKEN environment variable is required');
    }

    // Create handler
    const handler = new FigmaResourceHandler(figmaToken);

    // Create server instance
    const server = new McpServer({
      name: 'figma-readonly-server',
      version: '1.0.0',
      onError: (error) => {
        log('Server error', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      },
    });

    // Add tools using the higher-level API
    server.tool(
      'get-file',
      {
        fileKey: z.string().describe('The key of the Figma file'),
      },
      async ({ fileKey }) => {
        log('Fetching file', fileKey);
        const data = await handler.figmaRequest(`/files/${fileKey}`);
        log('Got file data', { name: data.name, version: data.version });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  name: data.name,
                  key: fileKey,
                  version: data.version,
                  document: data.document,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    server.tool(
      'get-node',
      {
        fileKey: z.string().describe('The key of the Figma file'),
        nodeId: z.string().describe('The ID of the node to get. Node ids have the format `<number>:<number>`'),
      },
      async ({ fileKey, nodeId }) => {
        log('Fetching node', { fileKey, nodeId });
        const data = await handler.figmaRequest(`/files/${fileKey}/nodes?ids=${nodeId}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }
    );

    // Add resources using ResourceTemplate
    server.resource('file', new ResourceTemplate('figma:///file/{fileKey}', { list: undefined }), async (uri, { fileKey }) => {
      log('Reading file resource', fileKey);
      const data = await handler.figmaRequest(`/files/${fileKey}`);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      log('Shutting down server...');
      await server.close();
      // Close the log file
      logFile.end();
      process.exit(0);
    });

    // Connect using stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    log('Server started successfully');
  } catch (error) {
    log('Fatal error starting server:', error);
    // Close the log file
    logFile.end();
    process.exit(1);
  }
}

main().catch((error) => {
  log('Unhandled error:', error);
  logFile.end();
  process.exit(1);
});
