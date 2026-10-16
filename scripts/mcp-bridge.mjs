#!/usr/bin/env node

/**
 * Stdio-to-Streamable-HTTP bridge for Doop MCP.
 * Allows MCP clients that only speak Stdio (or have Go SDK standalone SSE quirks)
 * to communicate seamlessly with Doop's Streamable HTTP MCP endpoint.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const url = process.env.DOOP_URL || process.argv[2] || 'https://design.testedeli.online/mcp'
const token = process.env.DOOP_TOKEN || process.argv[3] || 'dpk_85WBld2s_yXniYpf91Ueb9B82gpVldul'

const headers = {
  Accept: 'application/json, text/event-stream',
}

if (token) {
  headers.Authorization = `Bearer ${token}`
}

const clientTransport = new StreamableHTTPClientTransport(new URL(url), {
  requestInit: { headers },
})

const serverTransport = new StdioServerTransport()

serverTransport.onmessage = (msg) => {
  clientTransport.send(msg).catch((err) => {
    console.error('[mcp-bridge] client send error:', err)
  })
}

clientTransport.onmessage = (msg) => {
  serverTransport.send(msg).catch((err) => {
    console.error('[mcp-bridge] server send error:', err)
  })
}

serverTransport.onerror = (err) => console.error('[mcp-bridge] stdio error:', err)
clientTransport.onerror = (err) => console.error('[mcp-bridge] remote error:', err)

serverTransport.onclose = () => {
  clientTransport.close().catch(() => {})
}

clientTransport.onclose = () => {
  serverTransport.close().catch(() => {})
}

process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))

await clientTransport.start()
await serverTransport.start()
