import { afterEach, describe, expect, it } from 'vitest'
import { runOllamaTurn } from '../server/ollamaAgent.ts'
import { pickModel, serverTierInfo } from '../server/agentModel.ts'
import { activeServerProvider } from '../server/allowance.ts'
import type { AgentTurnRequest } from '../server/agentModel.ts'
import { stubEnv, unstubAllEnvs } from './envStub.ts'

interface CapturedPayload {
  model: string
  messages: Array<{
    role: string
    content?: string | Array<{ type: string; text?: string }>
    tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>
    tool_call_id?: string
  }>
  tools?: Array<{ type: string; function: { name: string } }>
}

describe('Ollama / OpenAI-Compatible Agent Provider', () => {
  afterEach(unstubAllEnvs)

  it('detects ollama provider when env vars are configured', () => {
    stubEnv('DOOP_AGENT_PROVIDER', 'ollama')
    stubEnv('OLLAMA_BASE_URL', 'https://ollama.example.com/v1')
    stubEnv('OLLAMA_MODEL', 'hermes3')

    expect(activeServerProvider()).toBe('ollama')
    const info = serverTierInfo()
    expect(info.provider).toBe('ollama')
    expect(info.ready).toBe(true)
  })

  it('resolves AgentModel correctly for Ollama', async () => {
    stubEnv('DOOP_AGENT_PROVIDER', 'ollama')
    stubEnv('OLLAMA_MODEL', 'qwen2.5-coder')

    const model = await pickModel()
    expect(model).not.toBeNull()
    expect(model?.provider).toBe('ollama')
    expect(model?.label).toBe('Doop (qwen2.5-coder)')
  })

  it('correctly executes a turn and parses text and tool_calls from OpenAI-compatible response', async () => {
    let capturedBody: CapturedPayload | null = null

    // Mock fetch for the test
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string)
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'I have designed a layout for you.',
                tool_calls: [
                  {
                    id: 'call_test_123',
                    type: 'function',
                    function: {
                      name: 'create_frame',
                      arguments: JSON.stringify({ name: 'ExileLab Hero', html: '<div>Hero</div>' }),
                    },
                  },
                ],
              },
              finish_reason: 'tool_calls',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }) as typeof globalThis.fetch

    try {
      const turnReq: AgentTurnRequest = {
        system: [{ text: 'You are Doop resident designer.' }],
        tools: [
          {
            name: 'create_frame',
            description: 'Create a new design frame',
            input_schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                html: { type: 'string' },
              },
              required: ['name', 'html'],
            },
          },
        ],
        messages: [
          {
            role: 'user',
            content: 'Design an ExileLab Hero card',
          },
        ],
        maxTokens: 2048,
      }

      const result = await runOllamaTurn(
        { baseUrl: 'https://ollama.example.com', model: 'hermes3', apiKey: 'test-key' },
        turnReq,
      )

      // Verify request payload conversion
      expect(capturedBody).not.toBeNull()
      const body = capturedBody!
      expect(body.model).toBe('hermes3')
      expect(body.messages[0]).toEqual({ role: 'system', content: 'You are Doop resident designer.' })
      expect(body.messages[1]).toEqual({ role: 'user', content: 'Design an ExileLab Hero card' })
      expect(body.tools).toBeDefined()
      const firstTool = body.tools?.[0]
      expect(firstTool?.type).toBe('function')
      expect(firstTool?.function.name).toBe('create_frame')

      // Verify response parsing
      expect(result.stop_reason).toBe('tool_use')
      expect(result.content.length).toBe(2)
      expect(result.content[0]).toEqual({ type: 'text', text: 'I have designed a layout for you.' })
      expect(result.content[1]).toEqual({
        type: 'tool_use',
        id: 'call_test_123',
        name: 'create_frame',
        input: { name: 'ExileLab Hero', html: '<div>Hero</div>' },
      })
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('correctly passes tool_result and images in chat history', async () => {
    let capturedBody: CapturedPayload | null = null

    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string)
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Refined the design.',
              },
              finish_reason: 'stop',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }) as typeof globalThis.fetch

    try {
      const turnReq: AgentTurnRequest = {
        system: [{ text: 'System prompt' }],
        tools: [],
        messages: [
          {
            role: 'user',
            content: 'Initial request',
          },
          {
            role: 'assistant',
            content: [
              {
                type: 'tool_use',
                id: 'call_1',
                name: 'create_frame',
                input: { name: 'Frame 1' },
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'call_1',
                content: 'Frame created successfully',
              },
            ],
          },
        ],
        maxTokens: 1024,
      }

      const result = await runOllamaTurn({ baseUrl: 'http://localhost:11434/v1', model: 'hermes3' }, turnReq)

      expect(result.stop_reason).toBe('end_turn')
      expect(result.content[0]).toEqual({ type: 'text', text: 'Refined the design.' })

      // Verify the tool call was converted to OpenAI tool_calls
      expect(capturedBody).not.toBeNull()
      const body = capturedBody!
      const assistantMsg = body.messages.find((m: { role: string }) => m.role === 'assistant')
      expect(assistantMsg).toBeDefined()
      const firstCall = assistantMsg?.tool_calls?.[0]
      expect(firstCall?.id).toBe('call_1')
      expect(firstCall?.function.name).toBe('create_frame')

      // Verify the tool result was converted to role: 'tool'
      const toolMsg = body.messages.find((m: { role: string }) => m.role === 'tool')
      expect(toolMsg?.tool_call_id).toBe('call_1')
      expect(toolMsg?.content).toBe('Frame created successfully')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('re-attaches tool-result images as a following user message when vision is true', async () => {
    let capturedBody: CapturedPayload | null = null

    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string)
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: { role: 'assistant', content: 'Seen the screenshot.' },
              finish_reason: 'stop',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }) as typeof globalThis.fetch

    try {
      const turnReq: AgentTurnRequest = {
        system: [{ text: 'System prompt' }],
        tools: [],
        messages: [
          {
            role: 'assistant',
            content: [
              {
                type: 'tool_use',
                id: 'call_shot',
                name: 'screenshot_frame',
                input: { frame_id: 'f1' },
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'call_shot',
                content: [
                  { type: 'text', text: 'Screenshot of Card' },
                  {
                    type: 'image',
                    source: { type: 'base64', media_type: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUg==' },
                  },
                ],
              },
            ],
          },
        ],
        maxTokens: 1024,
      }

      await runOllamaTurn(
        { baseUrl: 'http://localhost:11434/v1', model: 'kimi-k2.7-code:cloud', vision: true },
        turnReq,
      )

      expect(capturedBody).not.toBeNull()
      const body = capturedBody!
      const toolMsg = body.messages.find((m: { role: string }) => m.role === 'tool')
      expect(toolMsg?.content).toContain('[image returned — see the attached image below]')

      const trailingUserMsg = body.messages[body.messages.length - 1]
      expect(trailingUserMsg?.role).toBe('user')
      expect(Array.isArray(trailingUserMsg?.content)).toBe(true)
      const parts = trailingUserMsg?.content as Array<{ type: string; image_url?: { url: string }; text?: string }>
      expect(parts[0]?.type).toBe('image_url')
      expect(parts[0]?.image_url?.url).toContain('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('omits images with text note when vision is false', async () => {
    let capturedBody: CapturedPayload | null = null

    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string)
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: { role: 'assistant', content: 'Understood.' },
              finish_reason: 'stop',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }) as typeof globalThis.fetch

    try {
      const turnReq: AgentTurnRequest = {
        system: [{ text: 'System prompt' }],
        tools: [],
        messages: [
          {
            role: 'assistant',
            content: [
              {
                type: 'tool_use',
                id: 'call_shot',
                name: 'screenshot_frame',
                input: { frame_id: 'f1' },
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'call_shot',
                content: [
                  { type: 'text', text: 'Screenshot of Card' },
                  {
                    type: 'image',
                    source: { type: 'base64', media_type: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUg==' },
                  },
                ],
              },
            ],
          },
        ],
        maxTokens: 1024,
      }

      await runOllamaTurn({ baseUrl: 'http://localhost:11434/v1', model: 'hermes3', vision: false }, turnReq)

      expect(capturedBody).not.toBeNull()
      const body = capturedBody!
      const toolMsg = body.messages.find((m: { role: string }) => m.role === 'tool')
      expect(toolMsg?.content).toContain('[image omitted — the selected model cannot view images]')

      // When vision is false, no trailing user message with image_url should be added
      const trailingUserMsg = body.messages.find(
        (m: { role: string; content?: unknown }) =>
          m.role === 'user' &&
          Array.isArray(m.content) &&
          m.content.some((c: { type: string }) => c.type === 'image_url'),
      )
      expect(trailingUserMsg).toBeUndefined()
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
