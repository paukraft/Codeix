import TurndownService from 'turndown'
import { tool } from 'ai'
import z from 'zod'

const MAX_RESPONSE_SIZE = 5 * 1024 * 1024 // 5MB
const DEFAULT_TIMEOUT = 30 * 1000 // 30 seconds
const MAX_TIMEOUT = 120 * 1000 // 2 minutes

const extractTextFromHTML = (html: string): string => {
  // Remove script, style, noscript, iframe, object, embed tags and their content
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    // Replace block elements with newlines
    .replace(/<\/?(?:div|p|br|h[1-6]|li|ul|ol|blockquote|pre|hr)[^>]*>/gi, '\n')
    // Replace other tags with spaces
    .replace(/<[^>]+>/g, ' ')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[#\w]+;/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()

  return text
}

const convertHTMLToMarkdown = (html: string): string => {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  })
  turndownService.remove(['script', 'style', 'meta', 'link'])
  return turndownService.turndown(html)
}

export const createWebFetchTool = () =>
  tool({
    description:
      'Fetch content from a URL. Supports text, markdown, and HTML formats. Automatically converts HTML to the requested format.',
    inputSchema: z.object({
      url: z.string().describe('The URL to fetch content from'),
      format: z
        .enum(['text', 'markdown', 'html'])
        .optional()
        .default('text')
        .describe('The format to return the content in (text, markdown, or html)'),
      timeout: z
        .number()
        .optional()
        .describe('Optional timeout in seconds (max 120)'),
    }),
    execute: async ({ url, format = 'text', timeout }) => {
      // Validate URL
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('URL must start with http:// or https://')
      }

      const timeoutMs = Math.min(
        (timeout ?? DEFAULT_TIMEOUT / 1000) * 1000,
        MAX_TIMEOUT,
      )

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      // Build Accept header based on requested format with q parameters for fallbacks
      let acceptHeader = '*/*'
      switch (format) {
        case 'markdown':
          acceptHeader =
            'text/markdown;q=1.0, text/x-markdown;q=0.9, text/plain;q=0.8, text/html;q=0.7, */*;q=0.1'
          break
        case 'text':
          acceptHeader =
            'text/plain;q=1.0, text/markdown;q=0.9, text/html;q=0.8, */*;q=0.1'
          break
        case 'html':
          acceptHeader =
            'text/html;q=1.0, application/xhtml+xml;q=0.9, text/plain;q=0.8, text/markdown;q=0.7, */*;q=0.1'
          break
        default:
          acceptHeader =
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      }

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: acceptHeader,
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Request failed with status code: ${response.status}`)
      }

      // Check content length
      const contentLength = response.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
        throw new Error('Response too large (exceeds 5MB limit)')
      }

      const arrayBuffer = await response.arrayBuffer()
      if (arrayBuffer.byteLength > MAX_RESPONSE_SIZE) {
        throw new Error('Response too large (exceeds 5MB limit)')
      }

      const content = new TextDecoder().decode(arrayBuffer)
      const contentType = response.headers.get('content-type') ?? ''

      const title = `${url} (${contentType})`

      // Handle content based on requested format and actual content type
      switch (format) {
        case 'markdown':
          if (contentType.includes('text/html')) {
            const markdown = convertHTMLToMarkdown(content)
            return {
              title,
              content: markdown,
              contentType,
              format: 'markdown',
            }
          }
          return {
            title,
            content,
            contentType,
            format: 'markdown',
          }

        case 'text':
          if (contentType.includes('text/html')) {
            const text = extractTextFromHTML(content)
            return {
              title,
              content: text,
              contentType,
              format: 'text',
            }
          }
          return {
            title,
            content,
            contentType,
            format: 'text',
          }

        case 'html':
          return {
            title,
            content,
            contentType,
            format: 'html',
          }

        default:
          return {
            title,
            content,
            contentType,
            format: 'text',
          }
      }
    },
  })

