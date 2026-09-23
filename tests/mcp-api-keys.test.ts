import { Client as McpClient } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Client, startServer, type Server } from './harness.ts'

const PORT = 4983

let server: Server
let BASE: string

beforeAll(async () => {
  server = await startServer(PORT)
  BASE = server.base
}, 70_000)

afterAll(() => server?.stop())

describe('Personal Access Token (MCP API Keys) workflow', () => {
  let user: Client
  let token: string
  let keyId: string

  beforeAll(async () => {
    user = new Client(server)
    await user.signUp('pat-test@test.dev', 'PAT Tester')
  })

  it('unauthenticated requests cannot list or create keys', async () => {
    const anon = new Client(server)
    const listRes = await anon.get('/api/mcp-keys')
    expect(listRes.status).toBe(401)

    const createRes = await anon.post('/api/mcp-keys', { name: 'Unauthorized' })
    expect(createRes.status).toBe(401)
  })

  it('user can generate a personal access token', async () => {
    const res = await user.post('/api/mcp-keys', { name: 'Cursor Laptop' })
    expect(res.status).toBe(200)

    const data = await res.json()
    token = data.token
    keyId = data.id

    expect(data.name).toBe('Cursor Laptop')
    expect(data.token).toMatch(/^doop_pat_/)
    expect(data.prefix).toMatch(/^doop_pat_.+\.\.\./)
    expect(data.id).toBeDefined()
    expect(data.createdAt).toBeTypeOf('number')
  })

  it('user can list active keys without exposing raw secret or hash', async () => {
    const res = await user.get('/api/mcp-keys')
    expect(res.status).toBe(200)

    const keys = await res.json()
    expect(keys).toHaveLength(1)
    expect(keys[0].id).toBe(keyId)
    expect(keys[0].name).toBe('Cursor Laptop')
    expect(keys[0].prefix).toBeDefined()
    expect(keys[0].token).toBeUndefined()
    expect(keys[0].keyHash).toBeUndefined()
  })

  it('MCP endpoint rejects request without token with 401 and WWW-Authenticate', async () => {
    const res = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    })

    expect(res.status).toBe(401)
    const authHeader = res.headers.get('www-authenticate')
    expect(authHeader).toContain('Bearer realm="doop"')
    expect(authHeader).toContain('resource_metadata=')
  })

  it('MCP endpoint rejects invalid bearer token with 401', async () => {
    const res = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer doop_pat_invalid_fake_token_123',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    })

    expect(res.status).toBe(401)
  })

  it('MCP endpoint accepts valid Personal Access Token and handles JSON-RPC', async () => {
    const mcpClient = new McpClient({ name: 'Cursor', version: '0.40.0' })
    const transport = new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    await mcpClient.connect(transport)
    try {
      const { tools } = await mcpClient.listTools()
      expect(tools).toBeDefined()
      expect(tools.some((t) => t.name === 'get_guide')).toBe(true)
      expect(tools.some((t) => t.name === 'list_canvases')).toBe(true)
      expect(tools.some((t) => t.name === 'create_frame')).toBe(true)
    } finally {
      await mcpClient.close()
    }
  })

  it('user can revoke personal access token and subsequent MCP requests fail', async () => {
    const deleteRes = await user.delete(`/api/mcp-keys/${keyId}`)
    expect(deleteRes.status).toBe(200)

    const listRes = await user.get('/api/mcp-keys')
    const keys = await listRes.json()
    expect(keys).toHaveLength(0)

    // Now MCP request with revoked token should fail with 401
    const mcpRes = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} }),
    })

    expect(mcpRes.status).toBe(401)
  })
})
