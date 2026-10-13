import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { motion, useInView } from 'motion/react'
import { TEXT_REVEAL } from '../../lib/motionTokens'
import './reveal-text.css'

const TAGS = { h1: motion.h1, h2: motion.h2, h3: motion.h3, p: motion.p, span: motion.span, div: motion.div } as const

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
  ? new Intl.Segmenter('vi', { granularity: 'grapheme' })
  : null
/** Grapheme split so Vietnamese stacked marks (ộ, ầ, ố) never break apart. */
const graphemes = (word: string) => segmenter
  ? Array.from(segmenter.segment(word.normalize('NFC')), s => s.segment)
  : Array.from(word.normalize('NFC'))

/** True once the brand intro overlay has finished, so above-the-fold reveals are actually seen. */
function useIntroDone() {
  const read = () => typeof document === 'undefined' || document.documentElement.dataset.intro !== '1'
  const [done, setDone] = useState(read)
  useEffect(() => {
    if (done) return
    const html = document.documentElement
    const obs = new MutationObserver(() => { if (read()) { setDone(true); obs.disconnect() } })
    obs.observe(html, { attributes: true, attributeFilter: ['data-intro'] })
    return () => obs.disconnect()
  }, [done])
  return done
}

type Props = {
  /** Text to reveal; use '\n' for a forced line break. */
  text: string
  as?: keyof typeof TAGS
  className?: string
  id?: string
  style?: CSSProperties
  /** Extra delay before the first grapheme (seconds). */
  delay?: number
}

/**
 * Lively heading reveal (Motion): graphemes rise, unblur and settle, staggered across the
 * line, when the heading scrolls into view. Screen readers get the plain text once.
 */
export function RevealText({ text, as = 'h2', className, id, style, delay = 0 }: Props) {
  const Tag = TAGS[as]
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.35 })
  const introDone = useIntroDone()
  const lines = useMemo(() => text.split('\n').map(line => line.split(' ').filter(Boolean).map(graphemes)), [text])
  const count = lines.reduce((n, words) => n + words.reduce((m, w) => m + w.length, 0), 0)
  const stagger = Math.min(TEXT_REVEAL.perChar, TEXT_REVEAL.maxStagger / Math.max(1, count))

  return (
    <Tag
      ref={ref as never}
      id={id}
      style={style}
      className={['hj-reveal', className].filter(Boolean).join(' ')}
      aria-label={text.replace(/\n/g, ' ')}
      initial="hidden"
      animate={inView && introDone ? 'show' : 'hidden'}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
    >
      {lines.map((words, li) => (
        <span key={li} className="hj-reveal__line" aria-hidden="true">
          {words.map((chars, wi) => (
            <Fragment key={wi}>
              {wi > 0 ? ' ' : null}
              <span className="hj-reveal__word">
                {chars.map((g, ci) => (
                  <motion.span key={ci} className="hj-reveal__char" variants={TEXT_REVEAL.char}>{g}</motion.span>
                ))}
              </span>
            </Fragment>
          ))}
        </span>
      ))}
    </Tag>
  )
}
