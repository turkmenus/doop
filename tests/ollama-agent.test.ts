import { describe, expect, it } from 'vitest'
import { runOllamaTurn } from '../server/ollamaAgent.ts'
import { pickModel, serverTierInfo } from '../server/agentModel.ts'
import { activeServerProvider } from '../server/allowance.ts'
import type { AgentTurnRequest } from '../server/agentModel.ts'

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
  it('detects ollama provider when env vars are configured', () => {
    const originalProvider = process.env.DOOP_AGENT_PROVIDER
    const originalUrl = process.env.OLLAMA_BASE_URL
    const originalModel = process.env.OLLAMA_MODEL

    try {
      process.env.DOOP_AGENT_PROVIDER = 'ollama'
      process.env.OLLAMA_BASE_URL = 'https://ollama.example.com/v1'
      process.env.OLLAMA_MODEL = 'hermes3'

      expect(activeServerProvider()).toBe('ollama')
      const info = serverTierInfo()
      expect(info.provider).toBe('ollama')
      expect(info.ready).toBe(true)
    } finally {
      process.env.DOOP_AGENT_PROVIDER = originalProvider
      process.env.OLLAMA_BASE_URL = originalUrl
      process.env.OLLAMA_MODEL = originalModel
    }
  })

  it('resolves AgentModel correctly for Ollama', async () => {
    const originalProvider = process.env.DOOP_AGENT_PROVIDER
    const originalModel = process.env.OLLAMA_MODEL

    try {
      process.env.DOOP_AGENT_PROVIDER = 'ollama'
      process.env.OLLAMA_MODEL = 'qwen2.5-coder'

      const model = await pickModel()
      expect(model).not.toBeNull()
      expect(model?.provider).toBe('ollama')
      expect(model?.label).toBe('Doop (qwen2.5-coder)')
    } finally {
      process.env.DOOP_AGENT_PROVIDER = originalProvider
      process.env.OLLAMA_MODEL = originalModel
    }
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
      expect(capturedBody.model).toBe('hermes3')
      expect(capturedBody.messages[0]).toEqual({ role: 'system', content: 'You are Doop resident designer.' })
      expect(capturedBody.messages[1]).toEqual({ role: 'user', content: 'Design an ExileLab Hero card' })
      expect(capturedBody.tools[0].type).toBe('function')
      expect(capturedBody.tools[0].function.name).toBe('create_frame')

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
      const assistantMsg = capturedBody?.messages.find((m) => m.role === 'assistant')
      expect(assistantMsg?.tool_calls?.[0].id).toBe('call_1')
      expect(assistantMsg?.tool_calls?.[0].function.name).toBe('create_frame')

      // Verify the tool result was converted to role: 'tool'
      const toolMsg = capturedBody?.messages.find((m) => m.role === 'tool')
      expect(toolMsg?.tool_call_id).toBe('call_1')
      expect(toolMsg?.content).toBe('Frame created successfully')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
