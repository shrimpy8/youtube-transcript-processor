'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { FavoriteChannel, FavoriteChannelEpisode } from '@/types'
import { MAX_FAVORITE_CHANNELS, MAX_EPISODES_PER_CHANNEL } from '@/lib/constants'
import {
  readChannels,
  writeChannels,
  readEpisodeCache,
  isCacheValid,
  readAutoFetch,
  writeAutoFetch,
  clearChannelCache,
  updateChannelCache,
} from '@/lib/favorite-channels-storage'
import { fetchChannelEpisodes } from '@/lib/api-client'
import { isValidYouTubeUrl, getUrlType } from '@/lib/youtube-validator'
import { createLogger } from '@/lib/logger'

const logger = createLogger('FavChannels')

export type AddChannelResult =
  | { success: true; channel: FavoriteChannel }
  | { success: false; error: string }

export interface UseFavoriteChannelsReturn {
  channels: FavoriteChannel[]
  episodes: Record<string, FavoriteChannelEpisode[]>
  channelErrors: Record<string, string>
  isFetching: boolean
  fetchStatus: string | null
  autoFetchEnabled: boolean
  addChannel(url: string): Promise<AddChannelResult>
  updateChannel(id: string, newUrl: string): Promise<AddChannelResult>
  removeChannel(id: string): void
  refreshAllEpisodes(): Promise<void>
  retryChannel(channelId: string): Promise<void>
  setAutoFetchEnabled(enabled: boolean): void
}

/**
 * Normalizes a YouTube channel URL for duplicate comparison.
 * Strips protocol, www, trailing slashes, lowercases.
 */
function normalizeForComparison(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
}

export function useFavoriteChannels(): UseFavoriteChannelsReturn {
  const [channels, setChannels] = useState<FavoriteChannel[]>([])
  const [episodes, setEpisodes] = useState<Record<string, FavoriteChannelEpisode[]>>({})
  const [channelErrors, setChannelErrors] = useState<Record<string, string>>({})
  const [isFetching, setIsFetching] = useState(false)
  const [fetchStatus, setFetchStatus] = useState<string | null>(null)
  const [autoFetchEnabled, setAutoFetchEnabledState] = useState(true)
  const hasMounted = useRef(false)
  const fetchStatusTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = readChannels()
    setChannels(stored)
    setAutoFetchEnabledState(readAutoFetch())

    // Load cached episodes
    const cache = readEpisodeCache()
    const episodesMap: Record<string, FavoriteChannelEpisode[]> = {}
    for (const [chId, entry] of Object.entries(cache)) {
      if (entry?.episodes) {
        episodesMap[chId] = entry.episodes
      }
    }
    setEpisodes(episodesMap)

    hasMounted.current = true
  }, [])

  // Auto-fetch on mount when conditions are met
  useEffect(() => {
    if (!hasMounted.current) return
    if (channels.length === 0) return
    if (!autoFetchEnabled) return

    // Check if any channel's cache is expired
    const anyExpired = channels.some((ch) => !isCacheValid(ch.id))
    logger.debug('Auto-fetch check', { anyExpired, channelCount: channels.length })
    if (!anyExpired) return

    // Trigger auto-fetch
    logger.debug('Auto-fetch triggered', { channels: channels.map(c => c.url) })
    fetchAllEpisodes(channels)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels.length > 0 && autoFetchEnabled && hasMounted.current])

  const clearStatusAfterDelay = useCallback((ms: number = 3000) => {
    if (fetchStatusTimeout.current) clearTimeout(fetchStatusTimeout.current)
    fetchStatusTimeout.current = setTimeout(() => setFetchStatus(null), ms)
  }, [])

  const fetchAllEpisodes = useCallback(
    async (channelList: FavoriteChannel[], bypassCache = false) => {
      if (channelList.length === 0) return
      setIsFetching(true)
      setFetchStatus('Checking latest episodes for all channels...')

      // Fetch channels sequentially to avoid YouTube rate-limiting
      // when multiple yt-dlp processes hit YouTube concurrently
      const results: Array<
        | { status: 'fulfilled'; value: { channelId: string; episodes?: FavoriteChannelEpisode[]; skipped: boolean } }
        | { status: 'rejected'; reason: unknown }
      > = []

      for (const ch of channelList) {
        if (!bypassCache && isCacheValid(ch.id)) {
          logger.debug('Cache valid, skipping fetch', { url: ch.url })
          results.push({ status: 'fulfilled', value: { channelId: ch.id, skipped: true } })
          continue
        }

        try {
          logger.debug('Fetching episodes', { url: ch.url, id: ch.id })
          const res = await fetchChannelEpisodes(ch.url, MAX_EPISODES_PER_CHANNEL)
          logger.debug('Fetch response', { url: ch.url, success: res.success, error: res.error, episodeCount: res.data?.episodes?.length })
          if (!res.success || !res.data) {
            results.push({ status: 'rejected', reason: new Error(res.error || 'Failed to fetch episodes') })
            continue
          }

          const mapped: FavoriteChannelEpisode[] = res.data.episodes.map((ep) => ({
            channelId: ch.id,
            videoId: ep.videoId,
            title: ep.title,
            publishedAt: ep.publishedAt,
            url: ep.url,
            thumbnail: ep.thumbnail,
            duration: ep.duration,
          }))

          // Update cache
          updateChannelCache(ch.id, {
            episodes: mapped,
            fetchedAt: new Date().toISOString(),
          })

          // Update channel name if we got one and current is null
          if (res.data.channel.name && ch.name === null) {
            const updatedChannels = readChannels().map((c) =>
              c.id === ch.id ? { ...c, name: res.data!.channel.name, lastFetchedAt: new Date().toISOString() } : c
            )
            writeChannels(updatedChannels)
            setChannels(updatedChannels)
          }

          results.push({ status: 'fulfilled', value: { channelId: ch.id, episodes: mapped, skipped: false } })
        } catch (error) {
          results.push({ status: 'rejected', reason: error })
        }
      }

      // Process results
      const newEpisodes: Record<string, FavoriteChannelEpisode[]> = { ...episodes }
      const newErrors: Record<string, string> = {}
      let succeeded = 0
      const total = channelList.length

      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const ch = channelList[i]
        if (result.status === 'fulfilled') {
          const val = result.value
          if (!val.skipped && val.episodes) {
            newEpisodes[val.channelId] = val.episodes
          }
          succeeded++
        } else {
          const errMsg = result.reason instanceof Error ? result.reason.message : 'Failed to fetch episodes'
          logger.warn('Fetch failed', { url: ch.url, error: errMsg })
          newErrors[ch.id] = errMsg.includes('not found') || errMsg.includes('404')
            ? 'Channel not found or no longer available'
            : 'Unable to fetch episodes'
        }
      }

      setChannelErrors(newErrors)

      setEpisodes(newEpisodes)
      setIsFetching(false)

      if (succeeded === total) {
        setFetchStatus('All episodes fetched')
      } else if (succeeded === 0) {
        setFetchStatus('Unable to fetch episodes. Check your connection.')
      } else {
        setFetchStatus(`Fetched episodes for ${succeeded} of ${total} channels`)
      }

      clearStatusAfterDelay()
    },
    [episodes, clearStatusAfterDelay]
  )

  const addChannel = useCallback(
    async (url: string): Promise<AddChannelResult> => {
      // Validate URL
      if (!isValidYouTubeUrl(url)) {
        return { success: false, error: 'Please enter a valid YouTube channel URL' }
      }

      const urlType = getUrlType(url)
      if (urlType !== 'channel') {
        return { success: false, error: 'URL must be a YouTube channel, not a video or playlist' }
      }

      // Check max
      const current = readChannels()
      if (current.length >= MAX_FAVORITE_CHANNELS) {
        return { success: false, error: 'Maximum 5 channels reached' }
      }

      // Check duplicates
      const normalized = normalizeForComparison(url)
      const isDuplicate = current.some(
        (ch) => normalizeForComparison(ch.url) === normalized
      )
      if (isDuplicate) {
        return { success: false, error: 'This channel is already saved' }
      }

      // Fetch channel info
      logger.debug('addChannel: fetching episodes', { url })
      const res = await fetchChannelEpisodes(url, MAX_EPISODES_PER_CHANNEL)
      logger.debug('addChannel: response', { success: res.success, error: res.error, episodeCount: res.data?.episodes?.length })
      const channelName = res.success && res.data ? res.data.channel.name : null

      const newChannel: FavoriteChannel = {
        id: crypto.randomUUID(),
        url,
        name: channelName,
        addedAt: new Date().toISOString(),
        lastFetchedAt: res.success ? new Date().toISOString() : null,
      }

      const updated = [...current, newChannel]
      const writeOk = writeChannels(updated)
      if (!writeOk) {
        return { success: false, error: 'Storage full. Try removing some channels or clearing browser data.' }
      }

      setChannels(updated)

      // Cache episodes if we got them
      if (res.success && res.data) {
        const mapped: FavoriteChannelEpisode[] = res.data.episodes.map((ep) => ({
          channelId: newChannel.id,
          videoId: ep.videoId,
          title: ep.title,
          publishedAt: ep.publishedAt,
          url: ep.url,
          thumbnail: ep.thumbnail,
          duration: ep.duration,
        }))
        updateChannelCache(newChannel.id, {
          episodes: mapped,
          fetchedAt: new Date().toISOString(),
        })
        setEpisodes((prev) => ({ ...prev, [newChannel.id]: mapped }))
      }

      return { success: true, channel: newChannel }
    },
    []
  )

  const updateChannelFn = useCallback(
    async (id: string, newUrl: string): Promise<AddChannelResult> => {
      if (!isValidYouTubeUrl(newUrl)) {
        return { success: false, error: 'Please enter a valid YouTube channel URL' }
      }

      const urlType = getUrlType(newUrl)
      if (urlType !== 'channel') {
        return { success: false, error: 'URL must be a YouTube channel, not a video or playlist' }
      }

      const current = readChannels()
      const normalized = normalizeForComparison(newUrl)
      const isDuplicate = current.some(
        (ch) => ch.id !== id && normalizeForComparison(ch.url) === normalized
      )
      if (isDuplicate) {
        return { success: false, error: 'This channel is already saved' }
      }

      // Fetch new channel info
      const res = await fetchChannelEpisodes(newUrl, MAX_EPISODES_PER_CHANNEL)
      const channelName = res.success && res.data ? res.data.channel.name : null

      const updatedChannel: FavoriteChannel = {
        id,
        url: newUrl,
        name: channelName,
        addedAt: current.find((c) => c.id === id)?.addedAt || new Date().toISOString(),
        lastFetchedAt: res.success ? new Date().toISOString() : null,
      }

      const updated = current.map((ch) => (ch.id === id ? updatedChannel : ch))
      const writeOk = writeChannels(updated)
      if (!writeOk) {
        return { success: false, error: 'Storage full. Try removing some channels or clearing browser data.' }
      }

      // Clear old cache, set new
      clearChannelCache(id)
      setChannels(updated)

      if (res.success && res.data) {
        const mapped: FavoriteChannelEpisode[] = res.data.episodes.map((ep) => ({
          channelId: id,
          videoId: ep.videoId,
          title: ep.title,
          publishedAt: ep.publishedAt,
          url: ep.url,
          thumbnail: ep.thumbnail,
          duration: ep.duration,
        }))
        updateChannelCache(id, {
          episodes: mapped,
          fetchedAt: new Date().toISOString(),
        })
        setEpisodes((prev) => ({ ...prev, [id]: mapped }))
      } else {
        setEpisodes((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      }

      return { success: true, channel: updatedChannel }
    },
    []
  )

  const removeChannel = useCallback((id: string) => {
    const current = readChannels()
    const updated = current.filter((ch) => ch.id !== id)
    writeChannels(updated)
    clearChannelCache(id)
    setChannels(updated)
    setEpisodes((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const refreshAllEpisodes = useCallback(async () => {
    await fetchAllEpisodes(channels, true)
  }, [channels, fetchAllEpisodes])

  const retryChannel = useCallback(
    async (channelId: string) => {
      const ch = channels.find((c) => c.id === channelId)
      if (!ch) return
      // Clear the error for this channel
      setChannelErrors((prev) => {
        const next = { ...prev }
        delete next[channelId]
        return next
      })
      await fetchAllEpisodes([ch], true)
    },
    [channels, fetchAllEpisodes]
  )

  const setAutoFetchEnabled = useCallback((enabled: boolean) => {
    writeAutoFetch(enabled)
    setAutoFetchEnabledState(enabled)
  }, [])

  return {
    channels,
    episodes,
    channelErrors,
    isFetching,
    fetchStatus,
    autoFetchEnabled,
    addChannel,
    updateChannel: updateChannelFn,
    removeChannel,
    refreshAllEpisodes,
    retryChannel,
    setAutoFetchEnabled,
  }
}
