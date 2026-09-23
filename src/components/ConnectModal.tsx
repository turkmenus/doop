import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { roleByAgentName } from '../../shared/agents'
import { api } from '../lib/api'
import { Button } from './ui/button'
import { CodeBlock } from './ui/code-block'
import { Dot } from './ui/dot'
import { Modal, ModalActions, ModalLede, ModalTitle } from './ui/modal'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'
import { SparkSolid, Key } from 'iconoir-react'

/* This modal is about MCP agents only. Running the built-in Doop Agent on your
   own ChatGPT subscription is an account-level setting and lives in /settings. */

/* The step captions between code blocks. */
const stepHeading = 'mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint'

/** `canvasId` is optional: opened from the home dashboard there is no canvas to
 *  suggest a prompt for, and no presence connection to watch for an arrival. */
export function ConnectModal({ canvasId, onClose }: { canvasId?: string; onClose: () => void }) {
  return (
    <Modal size="lg" onClose={onClose}>
      <>
        <ModalTitle>Connect an AI agent</ModalTitle>
        <ModalLede>
          Any MCP-capable AI can design on this canvas. Connect via interactive OAuth (Claude Code / Codex) or generate
          a Personal Access Token for Cursor, Windsurf, or custom scripts.
        </ModalLede>

        <ConnectBody canvasId={canvasId} />

        <ModalActions className="items-center">
          {canvasId && <AgentArrival />}
          <Button onClick={onClose}>Done</Button>
        </ModalActions>
      </>
    </Modal>
  )
}

/** The connect instructions, shared by the connect modal and the free-tier
 *  wall: endpoint, per-client commands, and a starter prompt. */
export function ConnectBody({ canvasId }: { canvasId?: string }) {
  const [method, setMethod] = useState<'oauth' | 'token'>('oauth')
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const mcpUrl = `${location.origin}/mcp`

  const claudeCmd = `claude mcp add --transport http doop "${mcpUrl}"`
  const codexCmd = `codex mcp add doop --url ${mcpUrl}`
  const jsonOAuth = JSON.stringify({ mcpServers: { doop: { type: 'http', url: mcpUrl } } }, null, 2)
  const jsonToken = JSON.stringify(
    {
      mcpServers: {
        doop: {
          type: 'http',
          url: mcpUrl,
          headers: {
            Authorization: `Bearer ${createdToken || '<YOUR_PERSONAL_ACCESS_TOKEN>'}`,
          },
        },
      },
    },
    null,
    2,
  )

  const prompt = canvasId
    ? `Work on Doop canvas ${canvasId}. Start with get_guide({ topic: "doop-instructions" }) and follow it.`
    : ''

  async function generateInstantToken() {
    try {
      setGenerating(true)
      const res = await api.createMcpKey(canvasId ? `Canvas ${canvasId.slice(0, 6)} Key` : 'Quick Connect Token')
      setCreatedToken(res.token)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to generate token')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      <Tabs value={method} onValueChange={(v) => setMethod(v as 'oauth' | 'token')} className="mt-4 w-full">
        <TabsList className="h-9 w-full border border-line bg-surface p-1 shadow-card">
          <TabsTrigger value="oauth" className="gap-1.5 text-xs">
            <SparkSolid className="size-3.5" /> Interactive OAuth (Claude Code / Codex)
          </TabsTrigger>
          <TabsTrigger value="token" className="gap-1.5 text-xs">
            <Key className="size-3.5" /> API Key / Token (Cursor, Windsurf)
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {method === 'oauth' ? (
        <>
          <h3 className={stepHeading}>Claude Code</h3>
          <CodeBlock text={claudeCmd} />

          <h3 className={stepHeading}>Codex</h3>
          <CodeBlock text={codexCmd} />

          <h3 className={stepHeading}>Any other MCP client (OAuth)</h3>
          <CodeBlock text={jsonOAuth} />
        </>
      ) : (
        <>
          <div className="mt-4 rounded-lg border border-line bg-paper p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-ink">Personal Access Token</h4>
                <p className="text-[12px] text-ink-faint">
                  {createdToken
                    ? 'Your token is generated and ready in the config below.'
                    : 'Generate a static bearer token to paste into Cursor / VS Code.'}
                </p>
              </div>
              {!createdToken && (
                <Button size="sm" onClick={() => void generateInstantToken()} disabled={generating}>
                  {generating ? 'Generating…' : 'Generate Token'}
                </Button>
              )}
            </div>

            {createdToken && (
              <div className="mt-3 font-mono text-xs text-brand break-all bg-surface p-2 rounded border border-brand/20">
                {createdToken}
              </div>
            )}
          </div>

          <h3 className={stepHeading}>Cursor / Windsurf / Claude Desktop Config</h3>
          <CodeBlock text={jsonToken} />
        </>
      )}

      {prompt && (
        <>
          <h3 className={stepHeading}>Suggested prompt for the agent</h3>
          <CodeBlock text={prompt} />
        </>
      )}
    </>
  )
}

/** Live connection status: flips the moment an outside (non-resident) agent
 *  joins this canvas's presence, so nobody is left wondering whether the
 *  OAuth dance actually worked. */
export function AgentArrival() {
  const presences = useStore((s) => s.presences)
  const arrived = useMemo(
    () => Object.values(presences).find((p) => p.kind === 'agent' && !roleByAgentName(p.name)),
    [presences],
  )
  return arrived ? (
    <span className="mr-auto inline-flex items-center gap-[7px] text-[12.5px] text-[#1e7a4c]">
      ✓ {arrived.name} is here — it worked
    </span>
  ) : (
    <span className="mr-auto inline-flex items-center gap-[7px] text-[12.5px] text-ink-faint">
      <Dot className="animate-[arrival-pulse_1.6s_ease-in-out_infinite] bg-brand" /> listening for your agent…
    </span>
  )
}
