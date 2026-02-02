import { createSwaggerSpec } from 'next-swagger-doc'

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'YouTube Podcast Transcript API',
        version: '1.0.0',
        description:
          'API for extracting YouTube transcripts, discovering channel/playlist videos, and generating AI summaries.',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Local development',
        },
      ],
      components: {
        schemas: {
          VideoMetadata: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              url: { type: 'string' },
              publishedAt: { type: 'string', format: 'date-time' },
              duration: { type: 'number' },
              thumbnail: { type: 'string' },
              channelTitle: { type: 'string' },
              viewCount: { type: 'integer' },
            },
          },
          TranscriptSegment: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              start: { type: 'number' },
              duration: { type: 'number' },
            },
          },
          ErrorResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              type: { type: 'string' },
              requestId: { type: 'string' },
              suggestion: { type: 'string' },
            },
          },
        },
      },
    },
  })
  return spec
}
