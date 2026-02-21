/**
 * MCP Client for Rube.app communication
 * Implements singleton pattern with StreamableHTTPClientTransport
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP Client singleton for communicating with Rube.app
 * Uses StreamableHTTPClientTransport for remote HTTP connections
 */
class MCPClient {
  constructor() {
    if (MCPClient.instance) {
      return MCPClient.instance;
    }

    this.client = null;
    this.transport = null;
    this.isConnected = false;
    this.serverUrl = null;

    MCPClient.instance = this;
  }

  /**
   * Connect to the MCP server (Rube.app)
   * @param {string} url - The MCP server URL
   * @param {Object} options - Connection options
   * @returns {Promise<void>}
   */
  async connect(url, options = {}) {
    if (this.isConnected) {
      if (this.serverUrl === url) {
        return; // Already connected to this URL
      }
      await this.disconnect();
    }

    this.serverUrl = url;

    try {
      // Create StreamableHTTP transport for remote connection
      this.transport = new StreamableHTTPClientTransport(url, {
        requestInit: options.requestInit,
        authProvider: options.authProvider,
        fetch: options.fetch,
        sessionId: options.sessionId,
      });

      // Initialize the MCP client
      this.client = new Client(
        {
          name: options.clientName || 'myvoiceagent-backend',
          version: options.clientVersion || '1.0.0',
        },
        {
          capabilities: options.capabilities || {},
        }
      );

      // Connect and initialize
      await this.client.connect(this.transport);

      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;
      this.client = null;
      this.transport = null;

      if (error instanceof McpError) {
        throw new Error(`MCP connection failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * List available tools from the connected MCP server
   * @returns {Promise<Array>} List of available tools
   */
  async listTools() {
    if (!this.isConnected || !this.client) {
      throw new Error('MCP client is not connected. Call connect() first.');
    }

    try {
      const response = await this.client.listTools();
      return response.tools || [];
    } catch (error) {
      if (error instanceof McpError) {
        throw new Error(`Failed to list tools: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Call a specific tool on the MCP server
   * @param {string} name - The name of the tool to call
   * @param {Object} arguments_ - Arguments to pass to the tool
   * @returns {Promise<Object>} The result of the tool call
   */
  async callTool(name, arguments_ = {}) {
    if (!this.isConnected || !this.client) {
      throw new Error('MCP client is not connected. Call connect() first.');
    }

    try {
      const response = await this.client.callTool({
        name,
        arguments: arguments_,
      });

      return response;
    } catch (error) {
      if (error instanceof McpError) {
        throw new Error(`Tool call failed for '${name}': ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Disconnect from the MCP server
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        // Log but don't throw - we're cleaning up
        console.error('Error closing MCP client:', error.message);
      }
    }

    this.client = null;
    this.transport = null;
    this.isConnected = false;
    this.serverUrl = null;
  }

  /**
   * Check if the client is currently connected
   * @returns {boolean}
   */
  connected() {
    return this.isConnected;
  }
}

// Export singleton instance
const mcpClient = new MCPClient();
export default mcpClient;
