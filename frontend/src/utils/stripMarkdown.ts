/**
 * Strip markdown syntax from text for natural TTS output.
 */
export function stripMarkdown(text: string): string {
  return (
    text
      // Remove code blocks (```...```)
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code (`...`)
      .replace(/`([^`]+)`/g, '$1')
      // Remove images ![alt](url)
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Convert links [text](url) to just text
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      // Remove headings (# ## ### etc)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold **text** or __text__
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      // Remove italic *text* or _text_
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // Remove strikethrough ~~text~~
      .replace(/~~(.*?)~~/g, '$1')
      // Remove blockquote >
      .replace(/^>\s?/gm, '')
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, '')
      // Remove table separator rows (---|---|---)
      .replace(/^\|?[\s-]*:?-+:?[\s-]*(\|[\s-]*:?-+:?[\s-]*)*\|?\s*$/gm, '')
      // Remove table pipes and extract cell content
      .replace(/^\|(.+)\|$/gm, (_match, inner: string) =>
        inner
          .split('|')
          .map((cell: string) => cell.trim())
          .filter(Boolean)
          .join('、'),
      )
      // Remove any remaining standalone pipes
      .replace(/\|/g, ' ')
      // Remove unordered list markers
      .replace(/^[\s]*[-*+]\s+/gm, '')
      // Remove ordered list markers
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // Remove HTML tags
      .replace(/<[^>]+>/g, '')
      // Collapse multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}
