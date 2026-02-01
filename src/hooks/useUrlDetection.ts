'use client'

import { useState, useCallback, useMemo } from 'react'
import { fetchChannelName, fetchPlaylistName } from '@/lib/url-type-helpers'

interface DetectionMessage {
  type: 'channel' | 'playlist'
  name: string
  url: string
}

export interface UseUrlDetectionReturn {
  detectionMessage: DetectionMessage | null
  detectedChannelUrl: string | null
  detectedPlaylistUrl: string | null
  isFetchingChannelInfo: boolean
  isFetchingPlaylistInfo: boolean
  externalUrl: string | null
  handleChannelDetected: (url: string) => Promise<void>
  handlePlaylistDetected: (url: string) => Promise<void>
  handleClearDetectionMessage: () => void
  handleCopyUrl: (url: string) => void
  clearExternalUrl: () => void
}

export function useUrlDetection(): UseUrlDetectionReturn {
  const [detectedChannelUrl, setDetectedChannelUrl] = useState<string | null>(null)
  const [detectedPlaylistUrl, setDetectedPlaylistUrl] = useState<string | null>(null)
  const [channelName, setChannelName] = useState<string | null>(null)
  const [playlistName, setPlaylistName] = useState<string | null>(null)
  const [isFetchingChannelInfo, setIsFetchingChannelInfo] = useState(false)
  const [isFetchingPlaylistInfo, setIsFetchingPlaylistInfo] = useState(false)
  const [externalUrl, setExternalUrl] = useState<string | null>(null)

  const handleClearDetectionMessage = useCallback(() => {
    setDetectedChannelUrl(null)
    setDetectedPlaylistUrl(null)
    setChannelName(null)
    setPlaylistName(null)
  }, [])

  const handleChannelDetected = useCallback(async (url: string) => {
    setDetectedChannelUrl(url)
    setDetectedPlaylistUrl(null)
    setPlaylistName(null)

    setIsFetchingChannelInfo(true)
    try {
      const name = await fetchChannelName(url)
      setChannelName(name)
    } catch {
      setChannelName('Channel')
    } finally {
      setIsFetchingChannelInfo(false)
    }
  }, [])

  const handlePlaylistDetected = useCallback(async (url: string) => {
    setDetectedPlaylistUrl(url)
    setDetectedChannelUrl(null)
    setChannelName(null)

    setIsFetchingPlaylistInfo(true)
    try {
      const name = await fetchPlaylistName(url)
      setPlaylistName(name)
    } catch {
      setPlaylistName('Playlist')
    } finally {
      setIsFetchingPlaylistInfo(false)
    }
  }, [])

  const handleCopyUrl = useCallback((url: string) => {
    setExternalUrl(url)
    setDetectedChannelUrl(null)
    setDetectedPlaylistUrl(null)
    setChannelName(null)
    setPlaylistName(null)
  }, [])

  const clearExternalUrl = useCallback(() => {
    setExternalUrl(null)
  }, [])

  const detectionMessage = useMemo<DetectionMessage | null>(() => {
    if (detectedChannelUrl && channelName) {
      return { type: 'channel', name: channelName, url: detectedChannelUrl }
    }
    if (detectedPlaylistUrl && playlistName) {
      return { type: 'playlist', name: playlistName, url: detectedPlaylistUrl }
    }
    return null
  }, [detectedChannelUrl, channelName, detectedPlaylistUrl, playlistName])

  return {
    detectionMessage,
    detectedChannelUrl,
    detectedPlaylistUrl,
    isFetchingChannelInfo,
    isFetchingPlaylistInfo,
    externalUrl,
    handleChannelDetected,
    handlePlaylistDetected,
    handleClearDetectionMessage,
    handleCopyUrl,
    clearExternalUrl,
  }
}
