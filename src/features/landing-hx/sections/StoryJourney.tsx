import { useCallback, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { LISTINGS, STORY } from '../../../lib/mock/homeji'
import { StoryVisual } from '../art/StoryVisual'
import { Reveal } from '../motion/Reveal'
import { StoryStep } from '../motion/StoryStep'
import { useMediaQuery, useScrollProgress } from '../motion/useScrollProgress'
import { Container, SectionHeading } from '../ui/primitives'

/**
 * "Hành trình tìm tổ ấm". Desktop (≥1024px, motion allowed): text chapters
 * scroll naturally on the left while one sticky stage on the right changes
 * state per chapter, with a 4-part progress bar tied to scroll. Mobile, tablet
 * and reduced motion: no sticky stage; each chapter carries its own still visual.
 */
export function StoryJourney() {
  const reduce = useReducedMotion()
  const wide = useMediaQuery('(min-width: 1024px)')
  const pinned = wide && !reduce
  const [active, setActive] = useState(0)
  const onActive = useCallback((index: number) => setActive(index), [])
  const chaptersRef = useRef<HTMLDivElement>(null)
  const progress = useScrollProgress(chaptersRef)
  // The story's "found it" card sits under the filters "Gần trường · Dưới 3 triệu", so it must be a listing that fits them.
  const listing = LISTINGS.find(item => item.id === 'l-01') ?? LISTINGS[0]

  return (
    <section id="hanh-trinh" className={`hx-section hx-story${pinned ? ' is-pinned' : ''}`} aria-labelledby="hx-story-title">
      <Container>
        <SectionHeading
          id="hx-story-title"
          title="Hành trình tìm tổ ấm"
          lead="Câu chuyện của An, sinh viên năm nhất vừa lên TP.HCM, và bốn chặng từ hoang mang tới lúc cầm chìa khóa."
        />

        <div className="hx-story__grid">
          <div ref={chaptersRef} className="hx-story__chapters">
            {STORY.map((chapter, index) => (
              <StoryStep
                key={chapter.id}
                index={index}
                active={pinned ? active === index : false}
                onActive={onActive}
                className="hx-story__chapter"
              >
                <Reveal>
                  <p className="hx-story__count">Chặng {index + 1}/{STORY.length}</p>
                  <h3 className="hx-story__title">{chapter.title}</h3>
                  <p className="hx-story__body">{chapter.body}</p>
                </Reveal>
                {pinned ? null : (
                  <Reveal className="hx-story__inline-visual" delay={0.08}>
                    <StoryVisual step={index} listing={listing} />
                  </Reveal>
                )}
              </StoryStep>
            ))}
          </div>

          {pinned ? (
            <div className="hx-story__sticky">
              <div className="hx-story__progress" aria-hidden="true">
                <div className="hx-story__track">
                  <motion.div className="hx-story__fill" style={{ scaleX: progress }} />
                </div>
                <ol className="hx-story__marks">
                  {STORY.map((chapter, index) => (
                    <li key={chapter.id} className={index <= active ? 'is-done' : undefined}>
                      <span>{index + 1}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <StoryVisual step={active} listing={listing} />
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  )
}
