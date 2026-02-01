'use client'

import { useState, useCallback } from 'react'
import { FavoriteChannelEpisode } from '@/types'
import { MAX_FAVORITE_CHANNELS } from '@/lib/constants'
import { formatHeaderDate, formatEpisodeDate } from '@/lib/date-display-utils'
import { useFavoriteChannels } from '@/hooks/useFavoriteChannels'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  RefreshCw,
  Settings,
  Loader2,
  X,
  Play,
} from 'lucide-react'

interface FavoriteChannelsProps {
  onSummarize?: (episode: FavoriteChannelEpisode) => void
}

export function FavoriteChannels({ onSummarize }: FavoriteChannelsProps) {
  const {
    channels,
    episodes,
    channelErrors,
    isFetching,
    fetchStatus,
    autoFetchEnabled,
    addChannel,
    updateChannel,
    removeChannel,
    refreshAllEpisodes,
    retryChannel,
    setAutoFetchEnabled,
  } = useFavoriteChannels()

  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set())
  const [isAdding, setIsAdding] = useState(false)
  const [addUrl, setAddUrl] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // Default expanded state: ≤2 channels = all expanded, >2 = all collapsed
  const isExpanded = useCallback(
    (channelId: string) => {
      if (expandedChannels.size > 0 || channels.length > 2) {
        return expandedChannels.has(channelId)
      }
      return true // Default expanded for ≤2 channels
    },
    [expandedChannels, channels.length]
  )

  const toggleExpanded = useCallback((channelId: string) => {
    setExpandedChannels((prev) => {
      const next = new Set(prev)
      if (next.has(channelId)) {
        next.delete(channelId)
      } else {
        next.add(channelId)
      }
      return next
    })
  }, [])

  const handleAdd = async () => {
    if (!addUrl.trim()) return
    setIsSubmitting(true)
    setAddError(null)

    const result = await addChannel(addUrl.trim())
    setIsSubmitting(false)

    if (result.success) {
      setAddUrl('')
      setIsAdding(false)
      // Auto-expand the new channel
      setExpandedChannels((prev) => new Set(prev).add(result.channel.id))
    } else {
      setAddError(result.error)
    }
  }

  const handleEdit = async (id: string) => {
    if (!editUrl.trim()) return
    setIsSubmitting(true)
    setEditError(null)

    const result = await updateChannel(id, editUrl.trim())
    setIsSubmitting(false)

    if (result.success) {
      setEditingId(null)
      setEditUrl('')
    } else {
      setEditError(result.error)
    }
  }

  const handleDelete = (id: string) => {
    removeChannel(id)
    setDeletingId(null)
  }

  const getChannelLabel = (ch: { name: string | null; url: string }) => {
    if (ch.name) {
      return ch.name.length > 50 ? ch.name.slice(0, 50) + '...' : ch.name
    }
    const handleMatch = ch.url.match(/@([^/?#]+)/)
    return handleMatch ? `@${handleMatch[1]}` : ch.url
  }

  const atMaxChannels = channels.length >= MAX_FAVORITE_CHANNELS

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">My Favorite Channels</h3>
          <p className="text-xs text-muted-foreground">{formatHeaderDate()}</p>
        </div>
        <div className="flex items-center gap-1">
          {/* Refresh */}
          <button
            type="button"
            onClick={() => refreshAllEpisodes()}
            disabled={isFetching || channels.length === 0}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
            title="Refresh episodes"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          {/* Settings */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
            {showSettings && (
              <div className="absolute right-0 top-full mt-1 z-20 w-64 rounded-md border bg-popover p-3 shadow-md">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium" htmlFor="auto-fetch-toggle">
                    Auto-fetch new episodes on page load
                  </label>
                  <Switch
                    id="auto-fetch-toggle"
                    checked={autoFetchEnabled}
                    onCheckedChange={setAutoFetchEnabled}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fetch status notification */}
      {fetchStatus && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
          {fetchStatus}
        </div>
      )}

      {/* Channel list */}
      {channels.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground mb-2">
            Save your favorite podcast channels for quick access
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {channels.map((ch) => {
            const channelEpisodes = episodes[ch.id] || []
            const channelError = channelErrors[ch.id] || null
            const label = getChannelLabel(ch)
            const expanded = isExpanded(ch.id)

            return (
              <Collapsible
                key={ch.id}
                open={expanded}
                onOpenChange={() => toggleExpanded(ch.id)}
              >
                <div className="group">
                  {/* Channel row */}
                  <div className="flex items-center gap-1 py-2 sm:py-1 px-1 rounded hover:bg-muted/50 transition-colors min-h-[44px] sm:min-h-0">
                    <CollapsibleTrigger asChild>
                      <button type="button" className="flex items-center gap-1 flex-1 min-w-0 text-left">
                        {expanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm font-medium truncate">{label}</span>
                          </TooltipTrigger>
                          {ch.name && ch.name.length > 50 && (
                            <TooltipContent>{ch.name}</TooltipContent>
                          )}
                        </Tooltip>
                      </button>
                    </CollapsibleTrigger>
                    {/* Actions (visible on hover) */}
                    <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {editingId !== ch.id && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingId(ch.id)
                              setEditUrl(ch.url)
                              setEditError(null)
                            }}
                            className="p-1 rounded text-muted-foreground hover:text-foreground"
                            title="Edit channel"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          {deletingId === ch.id ? (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-destructive">Remove?</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(ch.id)
                                }}
                                className="text-destructive hover:underline font-medium"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeletingId(null)
                                }}
                                className="text-muted-foreground hover:underline"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeletingId(ch.id)
                              }}
                              className="p-1 rounded text-muted-foreground hover:text-destructive"
                              title="Delete channel"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Edit inline */}
                  {editingId === ch.id && (
                    <div className="pl-6 py-1 space-y-1">
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEdit(ch.id)
                            if (e.key === 'Escape') {
                              setEditingId(null)
                              setEditError(null)
                            }
                          }}
                          className={`flex-1 text-xs px-2 py-1 rounded border bg-background ${editError ? 'border-destructive' : 'border-input'}`}
                          disabled={isSubmitting}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleEdit(ch.id)}
                          disabled={isSubmitting}
                          className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null)
                            setEditError(null)
                          }}
                          className="text-xs px-1.5 py-1 rounded text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      {editError && (
                        <p className="text-xs text-destructive">{editError}</p>
                      )}
                    </div>
                  )}

                  {/* Episodes */}
                  <CollapsibleContent>
                    <div className="pl-6 space-y-0.5">
                      {channelError && (
                        <div className="flex items-center gap-1 py-1">
                          <p className="text-xs text-destructive">
                            {channelError}
                          </p>
                          <button
                            type="button"
                            onClick={() => retryChannel(ch.id)}
                            className="p-0.5 rounded text-destructive hover:text-foreground"
                            title="Retry"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      {isFetching && channelEpisodes.length === 0 && !channelError ? (
                        <>
                          <Skeleton className="h-8 w-full" />
                          <Skeleton className="h-8 w-full" />
                        </>
                      ) : channelEpisodes.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-1 italic">
                          No recent episodes
                        </p>
                      ) : (
                        channelEpisodes.map((ep) => (
                          <div
                            key={ep.videoId}
                            className="flex items-center gap-2 py-2 sm:py-1.5 px-1 rounded hover:bg-muted/50 transition-colors group/ep min-h-[44px] sm:min-h-0"
                          >
                            <div className="flex-1 min-w-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-xs truncate max-w-full sm:max-w-[250px]">
                                    {ep.title}
                                  </p>
                                </TooltipTrigger>
                                {ep.title.length > 40 && (
                                  <TooltipContent side="top" className="max-w-xs">
                                    {ep.title}
                                  </TooltipContent>
                                )}
                              </Tooltip>
                              <p className="text-[10px] text-muted-foreground">
                                {formatEpisodeDate(ep.publishedAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover/ep:opacity-100 transition-opacity">
                              <a
                                href={ep.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded text-muted-foreground hover:text-foreground"
                                title="Watch on YouTube"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              {onSummarize && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onSummarize(ep)
                                  }}
                                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                                  title="Summarize this episode"
                                >
                                  <Play className="h-2.5 w-2.5" />
                                  Summarize
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )
          })}
        </div>
      )}

      {/* Add channel */}
      {isAdding ? (
        <div className="space-y-1">
          <div className="flex gap-1">
            <input
              type="text"
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') {
                  setIsAdding(false)
                  setAddUrl('')
                  setAddError(null)
                }
              }}
              placeholder="Paste YouTube channel URL (e.g., youtube.com/@name)"
              className={`flex-1 text-xs px-2 py-1.5 rounded border bg-background ${addError ? 'border-destructive' : 'border-input'}`}
              disabled={isSubmitting}
              autoFocus
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={isSubmitting}
              className="text-xs px-2 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false)
                setAddUrl('')
                setAddError(null)
              }}
              className="text-xs px-1.5 py-1.5 rounded text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          {addError && (
            <p className="text-xs text-destructive">{addError}</p>
          )}
        </div>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => {
                setIsAdding(true)
                setAddError(null)
              }}
              disabled={atMaxChannels}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add Channel
            </button>
          </TooltipTrigger>
          {atMaxChannels && (
            <TooltipContent>Maximum 5 channels. Remove one to add another.</TooltipContent>
          )}
        </Tooltip>
      )}
    </div>
  )
}
