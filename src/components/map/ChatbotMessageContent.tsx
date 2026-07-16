import { Fragment, type ReactNode } from 'react'

type MessageBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; lines: string[] }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'code'; text: string }

const INLINE_MARKUP_PATTERN = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s<]+)/gi

function parseBlocks(content: string): MessageBlock[] {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  const blocks: MessageBlock[] = []
  let paragraph: string[] = []
  let codeLines: string[] | null = null

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', lines: paragraph })
      paragraph = []
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      flushParagraph()
      if (codeLines === null) codeLines = []
      else {
        blocks.push({ type: 'code', text: codeLines.join('\n') })
        codeLines = null
      }
      continue
    }

    if (codeLines !== null) {
      codeLines.push(line)
      continue
    }

    if (!trimmed) {
      flushParagraph()
      continue
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] })
      continue
    }

    const unorderedItem = trimmed.match(/^[-*•]\s+(.+)$/)
    const orderedItem = trimmed.match(/^\d+[.)]\s+(.+)$/)
    if (unorderedItem || orderedItem) {
      flushParagraph()
      const ordered = Boolean(orderedItem)
      const items = [unorderedItem?.[1] ?? orderedItem?.[1] ?? '']
      while (index + 1 < lines.length) {
        const next = (lines[index + 1] ?? '').trim()
        const match = ordered ? next.match(/^\d+[.)]\s+(.+)$/) : next.match(/^[-*•]\s+(.+)$/)
        if (!match) break
        items.push(match[1])
        index += 1
      }
      blocks.push({ type: 'list', ordered, items })
      continue
    }

    paragraph.push(trimmed)
  }

  flushParagraph()
  if (codeLines !== null && codeLines.length > 0) {
    blocks.push({ type: 'code', text: codeLines.join('\n') })
  }
  return blocks
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(INLINE_MARKUP_PATTERN)
  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index}>{part.slice(1, -1)}</code>
    }

    const markdownLink = part.match(/^\[([^\]]+)]\((https?:\/\/[^)\s]+)\)$/i)
    const href = markdownLink?.[2] ?? (part.match(/^https?:\/\//i) ? part : null)
    if (href) {
      return (
        <a key={index} href={href} target="_blank" rel="noopener noreferrer">
          {markdownLink?.[1] ?? part}
        </a>
      )
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}

export function ChatbotMessageContent({ content }: { content: string }) {
  const blocks = parseBlocks(content)

  return (
    <div className="map-chatbot__formatted-content">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const Heading = block.level === 1 ? 'h3' : block.level === 2 ? 'h4' : 'h5'
          return <Heading key={index}>{renderInline(block.text)}</Heading>
        }
        if (block.type === 'list') {
          const List = block.ordered ? 'ol' : 'ul'
          return (
            <List key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </List>
          )
        }
        if (block.type === 'code') {
          return <pre key={index}><code>{block.text}</code></pre>
        }
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line)}
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}
