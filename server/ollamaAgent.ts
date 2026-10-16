import { randomUUID } from 'node:crypto'
import type Anthropic from '@anthropic-ai/sdk'
import type { AgentTurnRequest, AgentTurnResult } from './agentModel.ts'
import { IMAGE_NOTE, ModelAuthError, ModelUnavailableError, flattenToolResult } from './openaiAgent.ts'
import { IMAGE_OMITTED_NOTE } from './chatCompletionsAgent.ts'
import type { TurnBlock, StopReason } from './openaiAgent.ts'

export interface OllamaConfig {
  baseUrl: string
  model: string
  apiKey?: string
  vision?: boolean
}

function normalizeChatUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  if (trimmed.endsWith('/chat/completions')) return trimmed
  if (trimmed.endsWith('/v1')) return `${trimmed}/chat/completions`
  return `${trimmed}/v1/chat/completions`
}

function toOpenAiTools(tools: Anthropic.Tool[]) {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description ?? '',
      parameters: t.input_schema ?? { type: 'object', properties: {} },
    },
  }))
}

function toOpenAiMessages(
  system: { text: string }[],
  messages: Anthropic.MessageParam[],
  vision: boolean = true,
): unknown[] {
  const openAiMessages: unknown[] = []

  const systemText = system
    .map((s) => s.text)
    .join('\n\n')
    .trim()
  if (systemText) {
    openAiMessages.push({ role: 'system', content: systemText })
  }

  for (const m of messages) {
    if (typeof m.content === 'string') {
      openAiMessages.push({ role: m.role, content: m.content })
      continue
    }

    if (m.role === 'assistant') {
      let textContent = ''
      const toolCalls: {
        id: string
        type: 'function'
        function: { name: string; arguments: string }
        thought_signature?: string
      }[] = []

      for (const block of m.content) {
        if (block.type === 'text') {
          textContent += (textContent ? '\n' : '') + block.text
        } else if (block.type === 'tool_use') {
          const rawBlock = block as { thought_signature?: string; thoughtSignature?: string }
          const signature = rawBlock.thought_signature ?? rawBlock.thoughtSignature
          toolCalls.push({
            id: block.id,
            type: 'function',
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input ?? {}),
            },
            ...(signature ? { thought_signature: signature } : {}),
          })
        }
      }

      openAiMessages.push({
        role: 'assistant',
        content: textContent || null,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      })
      continue
    }

    // Role is 'user': could contain text, image, or tool_result blocks
    const userParts: unknown[] = []
    const trailingImages: unknown[] = []

    for (const block of m.content) {
      if (block.type === 'text') {
        userParts.push({ type: 'text', text: block.text })
      } else if (block.type === 'image') {
        if (!vision) {
          userParts.push({ type: 'text', text: IMAGE_OMITTED_NOTE })
          continue
        }
        const src = block.source as { type?: string; media_type?: string; data?: string; url?: string }
        if (src.type === 'url' && src.url) {
          userParts.push({ type: 'image_url', image_url: { url: src.url } })
        } else if (src.data) {
          userParts.push({
            type: 'image_url',
            image_url: { url: `data:${src.media_type || 'image/png'};base64,${src.data}` },
          })
        }
      } else if (block.type === 'tool_result') {
        const { text, images } = flattenToolResult(block)
        openAiMessages.push({
          role: 'tool',
          tool_call_id: block.tool_use_id,
          content: vision
            ? text
            : text.replaceAll('[image returned — see the attached image below]', IMAGE_OMITTED_NOTE),
        })
        if (vision) {
          for (const img of images) {
            if (img.type === 'input_image') {
              trailingImages.push({ type: 'image_url', image_url: { url: img.image_url } })
            }
          }
        }
      }
    }

    if (userParts.length > 0) {
      openAiMessages.push({ role: 'user', content: userParts })
    }
    if (trailingImages.length > 0) {
      openAiMessages.push({ role: 'user', content: [...trailingImages, { type: 'text', text: IMAGE_NOTE }] })
    }
  }

  return openAiMessages
}

export const _internal = { toOpenAiMessages, toOpenAiTools }

interface OpenAiChatResponse {
  choices?: {
    message?: {
      content?: string | null
      tool_calls?: {
        id?: string
        function?: {
          name?: string
          arguments?: string
        }
      }[]
    }
    finish_reason?: string
  }[]
  error?: { message?: string; code?: string }
}

export async function runOllamaTurn(config: OllamaConfig, req: AgentTurnRequest): Promise<AgentTurnResult> {
  const url = normalizeChatUrl(config.baseUrl)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }

  const messages = toOpenAiMessages(req.system, req.messages, config.vision)
  const tools = req.tools.length > 0 ? toOpenAiTools(req.tools) : undefined

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    max_tokens: req.maxTokens || 4096,
  }
  if (tools && tools.length > 0) {
    body.tools = tools
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (res.status === 401 || res.status === 403) {
      throw new ModelAuthError(`Ollama / OpenAI provider authentication failed (${res.status}): ${text}`)
    }
    if (res.status === 404 || text.includes('model not found') || text.includes('does not exist')) {
      throw new ModelUnavailableError(`Model "${config.model}" not found on provider at ${config.baseUrl}: ${text}`)
    }
    throw new Error(`Ollama / OpenAI provider returned ${res.status}: ${text}`)
  }

  const data = (await res.json()) as OpenAiChatResponse
  if (data.error) {
    throw new Error(`Provider error: ${data.error.message || JSON.stringify(data.error)}`)
  }

  const choice = data.choices?.[0]
  if (!choice || !choice.message) {
    throw new Error('Provider returned empty choices array in response')
  }

  const content: TurnBlock[] = []
  if (choice.message.content) {
    content.push({ type: 'text', text: choice.message.content })
  }

  if (choice.message.tool_calls) {
    for (const tc of choice.message.tool_calls) {
      if (!tc.function?.name) continue
      let input: unknown
      try {
        input = tc.function.arguments ? JSON.parse(tc.function.arguments) : {}
      } catch {
        input = {}
      }
      const rawCall = tc as {
        id?: string
        function?: { name?: string; arguments?: string }
        thought_signature?: string
        thoughtSignature?: string
      }
      const signature = rawCall.thought_signature ?? rawCall.thoughtSignature
      content.push({
        type: 'tool_use',
        id: tc.id || `call_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        name: tc.function.name,
        input,
        ...(signature ? { thought_signature: signature } : {}),
      } as TurnBlock)
    }
  }

  const stop: StopReason =
    choice.finish_reason === 'tool_calls' ? 'tool_use' : choice.finish_reason === 'length' ? 'max_tokens' : 'end_turn'

  return { content, stop_reason: stop }
}
