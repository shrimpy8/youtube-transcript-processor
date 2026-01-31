# API Reference

Base URL: `/api`

All endpoints accept and return JSON. Set `Content-Type: application/json` on all requests with a body.

---

## Endpoints Summary

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| POST | `/api/transcript` | Fetch transcript via YoutubeTranscript | 20/min |
| POST | `/api/transcript/ytdlp` | Fetch transcript via yt-dlp | 20/min |
| POST | `/api/discover` | Discover videos from playlist or channel | 10/min |
| POST | `/api/channel` | Get channel info and top videos | 10/min |
| GET | `/api/ai-summary/config` | Check configured LLM providers | None |
| POST | `/api/ai-summary` | Generate AI summary from transcript | 10/min |

---

## POST /api/transcript

Fetch a video transcript using the YoutubeTranscript library. At least one of `url` or `videoId` must be provided.

### Request Body

```typescript
interface TranscriptRequest {
  url?: string;
  videoId?: string;
}
```

### Success Response

**Status: 200 OK**

```typescript
interface TranscriptResponse {
  success: true;
  data: {
    videoId: string;
    segments: TranscriptSegment[];
    segmentCount: number;
  };
}

interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
  lang?: string;
}
```

### Error Responses

| Status | Type | Description |
|--------|------|-------------|
| 400 | `INVALID_URL` | Missing or invalid `url` and `videoId` |
| 404 | `NO_TRANSCRIPT` | Video exists but has no transcript available |
| 404 | `VIDEO_NOT_FOUND` | No video found for the given URL or ID |
| 429 | `RATE_LIMIT` | Rate limit exceeded (20 requests/min) |
| 503 | `NETWORK_ERROR` | Upstream request to YouTube failed |

### Rate Limit

20 requests per minute per IP.

---

## POST /api/transcript/ytdlp

Fetch a video transcript using yt-dlp. More reliable than the YoutubeTranscript method and includes optional video metadata. At least one of `url` or `videoId` must be provided.

### Request Body

```typescript
interface YtdlpTranscriptRequest {
  url?: string;
  videoId?: string;
  options?: {
    language?: string;
    format?: string;
    writeAutoSubs?: boolean;
  };
}
```

### Success Response

**Status: 200 OK**

```typescript
interface YtdlpTranscriptResponse {
  success: true;
  data: {
    videoId: string;
    segments: TranscriptSegment[];
    segmentCount: number;
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnail?: string;
    duration?: number;
  };
}
```

### Error Responses

| Status | Type | Description |
|--------|------|-------------|
| 400 | `INVALID_URL` | Missing or invalid `url` and `videoId` |
| 404 | `NO_TRANSCRIPT` | Video exists but has no transcript available |
| 404 | `VIDEO_NOT_FOUND` | No video found for the given URL or ID |
| 429 | `RATE_LIMIT` | Rate limit exceeded (20 requests/min) |
| 503 | `NETWORK_ERROR` | Upstream request to YouTube failed |

### Rate Limit

20 requests per minute per IP.

---

## POST /api/discover

Discover videos from a YouTube playlist or channel URL.

### Request Body

```typescript
interface DiscoverRequest {
  url: string;
  type?: "playlist" | "channel";
  maxVideos?: number; // default: 100, max: 500
}
```

### Success Response

**Status: 200 OK**

```typescript
interface DiscoverResponse {
  success: true;
  data: {
    id: string;
    title: string;
    url: string;
    videoCount: number;
    videos: VideoMetadata[];
  };
}

interface VideoMetadata {
  videoId: string;
  title: string;
  url: string;
  thumbnail?: string;
  duration?: number;
  publishedAt?: string;
}
```

### Error Responses

| Status | Type | Description |
|--------|------|-------------|
| 400 | `INVALID_URL` | Missing or invalid URL |
| 429 | `RATE_LIMIT` | Rate limit exceeded (10 requests/min) |
| 500 | `PROCESSING_ERROR` | Internal error while discovering videos |

### Rate Limit

10 requests per minute per IP.

---

## POST /api/channel

Get channel information and the top 10 videos from a video URL.

### Request Body

```typescript
interface ChannelRequest {
  videoUrl: string;
}
```

### Success Response

**Status: 200 OK**

```typescript
interface ChannelResponse {
  success: true;
  data: {
    channel: ChannelDetails;
    videos: VideoMetadata[];
  };
}

interface ChannelDetails {
  channelId: string;
  title: string;
  description?: string;
  subscriberCount?: number;
  videoCount?: number;
  thumbnail?: string;
  url: string;
}
```

### Error Responses

| Status | Type | Description |
|--------|------|-------------|
| 400 | `INVALID_URL` | Missing or invalid video URL |
| 429 | `RATE_LIMIT` | Rate limit exceeded (10 requests/min) |
| 500 | `PROCESSING_ERROR` | Internal error while fetching channel data |

### Rate Limit

10 requests per minute per IP.

---

## GET /api/ai-summary/config

Check which LLM providers have API keys configured on the server. No authentication or request body required.

### Request Body

None.

### Success Response

**Status: 200 OK**

```typescript
interface AISummaryConfigResponse {
  success: true;
  providers: {
    anthropic: boolean;
    "google-gemini": boolean;
    perplexity: boolean;
  };
}
```

### Error Responses

| Status | Type | Description |
|--------|------|-------------|
| 500 | `UNKNOWN` | Unexpected server error |

### Rate Limit

None.

---

## POST /api/ai-summary

Generate an AI-powered summary of a transcript using one or all configured LLM providers.

### Request Body

```typescript
interface AISummaryRequest {
  transcript: string; // max 500,000 characters
  provider: "anthropic" | "google-gemini" | "perplexity" | "all";
  summaryStyle?: "bullets" | "narrative" | "technical";
  videoUrl?: string;
}
```

### Success Response

**Status: 200 OK**

```typescript
interface AISummarySuccessResponse {
  success: true;
  summaries: AISummaryResponse[];
}

interface AISummaryResponse {
  provider: string;
  modelName: string;
  summary: string;
  success: boolean;
  error?: string;
}
```

When `provider` is `"all"`, the `summaries` array contains one entry per configured provider. Individual entries may have `success: false` with an `error` message if that specific provider failed, while the overall response remains `success: true`.

### Error Responses

| Status | Type | Description |
|--------|------|-------------|
| 400 | `INVALID_URL` | Missing or invalid request parameters |
| 400 | `PROCESSING_ERROR` | Transcript exceeds 500,000 character limit |
| 429 | `RATE_LIMIT` | Rate limit exceeded (10 requests/min) |
| 500 | `PROCESSING_ERROR` | All providers failed to generate a summary |

### Rate Limit

10 requests per minute per IP.

---

## Error Handling

### Error Types

All error responses include a `type` field from the following enum:

```typescript
enum ErrorType {
  INVALID_URL = "INVALID_URL",
  VIDEO_NOT_FOUND = "VIDEO_NOT_FOUND",
  NO_TRANSCRIPT = "NO_TRANSCRIPT",
  PROCESSING_ERROR = "PROCESSING_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  RATE_LIMIT = "RATE_LIMIT",
  UNKNOWN = "UNKNOWN",
}
```

### Standard Error Response Format

All error responses follow a consistent structure:

```typescript
interface ErrorResponse {
  error: string;
  type: string;
  suggestion?: string;
}
```

**Example:**

```json
{
  "error": "No transcript available for this video",
  "type": "NO_TRANSCRIPT",
  "suggestion": "Try the yt-dlp endpoint with writeAutoSubs enabled, or check that the video has captions."
}
```

---

## Rate Limiting

Rate limits are enforced per IP address using an in-memory store.

| Endpoint Group | Limit | Window |
|----------------|-------|--------|
| `/api/transcript`, `/api/transcript/ytdlp` | 20 requests | 1 minute |
| `/api/discover`, `/api/channel`, `/api/ai-summary` | 10 requests | 1 minute |
| `/api/ai-summary/config` | No limit | -- |

When a rate limit is exceeded, the server responds with:

**Status: 429 Too Many Requests**

```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "type": "RATE_LIMIT"
}
```

Rate limit windows are configurable on the server side. The in-memory store resets on server restart.

---

## How It Works

For a visual overview of how these API endpoints fit into the application architecture, see the interactive [How It Works](/how-it-works.html) page available within the running application.
