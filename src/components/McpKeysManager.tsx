import { useEffect, useState } from 'react'
import { api, type McpKeyInfo, type CreatedMcpKeyInfo } from '../lib/api'
import { Button } from './ui/button'
import { CodeBlock } from './ui/code-block'
import { Input } from './ui/input'
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Modal, ModalActions, ModalLede, ModalTitle } from './ui/modal'
import { Trash, Plus, Check, Copy, Key } from 'iconoir-react'

export function McpKeysManager() {
  const [keys, setKeys] = useState<McpKeyInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [expiryDays, setExpiryDays] = useState<number | undefined>(undefined)
  const [createdKey, setCreatedKey] = useState<CreatedMcpKeyInfo | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [creating, setCreating] = useState(false)

  const [currentTime] = useState(() => Date.now())

  useEffect(() => {
    let mounted = true
    api
      .listMcpKeys()
      .then((data) => {
        if (mounted) {
          setKeys(data)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Failed to load keys')
          setLoading(false)
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  async function handleCreate() {
    if (!newKeyName.trim()) return
    try {
      setCreating(true)
      const res = await api.createMcpKey(newKeyName.trim(), expiryDays)
      setCreatedKey(res)
      setNewKeyName('')
      setShowCreateModal(false)
      const updated = await api.listMcpKeys()
      setKeys(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create key')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        'Are you sure you want to revoke this Personal Access Token? Any MCP client using it will be disconnected.',
      )
    ) {
      return
    }
    try {
      await api.deleteMcpKey(id)
      setKeys((prev) => prev.filter((k) => k.id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to revoke key')
    }
  }

  const mcpUrl = `${location.origin}/mcp`

  function sampleConfig(tokenPlaceholder: string) {
    return JSON.stringify(
      {
        mcpServers: {
          doop: {
            type: 'http',
            url: mcpUrl,
            headers: {
              Authorization: `Bearer ${tokenPlaceholder}`,
            },
          },
        },
      },
      null,
      2,
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="size-4 text-brand" /> Personal Access Tokens (API Keys)
              </CardTitle>
              <CardDescription>
                Authenticate MCP clients without interactive browser OAuth (e.g. Cursor, Windsurf, Claude Desktop, CI/CD
                scripts).
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-1 size-3.5" /> Generate New Token
            </Button>
          </div>
        </CardHeader>

        {error && <div className="mx-6 mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</div>}

        {createdKey && (
          <div className="mx-6 mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Key Created — Copy it now!
              </span>
              <Button
                size="sm"
                variant="default"
                className="h-7 gap-1.5 text-xs text-emerald-800 dark:text-emerald-300"
                onClick={() => {
                  void navigator.clipboard.writeText(createdKey.token).then(() => {
                    setCopiedKey(true)
                    setTimeout(() => setCopiedKey(false), 2000)
                  })
                }}
              >
                {copiedKey ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                {copiedKey ? 'Copied' : 'Copy Key'}
              </Button>
            </div>
            <p className="mb-3 text-xs text-ink-soft">
              This token will <strong>never be shown again</strong>. Store it safely or paste it directly into your
              client config.
            </p>
            <div className="rounded bg-paper px-3 py-2 font-mono text-xs break-all text-ink selection:bg-brand selection:text-white">
              {createdKey.token}
            </div>

            <div className="mt-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                Ready-to-use Cursor / Client Config
              </span>
              <div className="mt-1">
                <CodeBlock text={sampleConfig(createdKey.token)} />
              </div>
            </div>
          </div>
        )}

        <div className="px-6 pb-6">
          {loading ? (
            <div className="py-6 text-center text-sm text-ink-faint">Loading tokens…</div>
          ) : keys.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-ink-faint">
              No personal access tokens generated yet. Click "Generate New Token" to create one.
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {keys.map((k) => {
                const isExpired = k.expiresAt !== null && k.expiresAt < currentTime
                return (
                  <div key={k.id} className="flex items-center justify-between p-3.5 text-sm">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-ink">{k.name}</span>
                      <div className="flex items-center gap-3 text-xs text-ink-faint font-mono">
                        <span>{k.prefix}</span>
                        <span>•</span>
                        <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                        {k.lastUsedAt ? (
                          <>
                            <span>•</span>
                            <span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>
                          </>
                        ) : (
                          <>
                            <span>•</span>
                            <span>Never used</span>
                          </>
                        )}
                        {k.expiresAt && (
                          <>
                            <span>•</span>
                            <span className={isExpired ? 'text-red-500' : ''}>
                              {isExpired ? 'Expired' : `Expires ${new Date(k.expiresAt).toLocaleDateString()}`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-ink-faint hover:text-red-600"
                      title="Revoke token"
                      onClick={() => void handleDelete(k.id)}
                    >
                      <Trash className="size-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>

      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <ModalTitle>Generate Personal Access Token</ModalTitle>
          <ModalLede>
            Create a static bearer token to connect your MCP-enabled editor (Cursor, Windsurf, Claude Desktop, etc.)
            directly without an OAuth browser window.
          </ModalLede>

          <div className="my-4 flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-soft">Token Name / Description</label>
              <Input
                placeholder="e.g. Cursor MacBook, CI Bot"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-soft">Expiration</label>
              <select
                className="w-full rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                value={expiryDays ?? ''}
                onChange={(e) => setExpiryDays(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">No expiration (recommended for personal devices)</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
              </select>
            </div>
          </div>

          <ModalActions>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button disabled={!newKeyName.trim() || creating} onClick={() => void handleCreate()}>
              {creating ? 'Generating…' : 'Generate Token'}
            </Button>
          </ModalActions>
        </Modal>
      )}
    </div>
  )
}
