import type { RevealTimelineArgs, RevealTimelineBuilder } from '../scroll/useSceneReveal'

/** Entrance timelines, played once on the way down (seconds, timeline default ease). */
function revealCopy({ gsap, timeline, q }: Pick<RevealTimelineArgs, 'gsap' | 'timeline' | 'q'>) {
  const eyebrow = q('[data-scrub="eyebrow"]')
  const title = q('[data-scrub="title"]')
  const lead = q('[data-scrub="lead"]')
  const visual = q('[data-scrub="visual"]')

  gsap.set(eyebrow, { autoAlpha: 0, y: 18 })
  gsap.set(title, { autoAlpha: 0, y: 36 })
  gsap.set(lead, { autoAlpha: 0, y: 24 })
  gsap.set(visual, { autoAlpha: 0, scale: 0.96, transformOrigin: '50% 50%' })

  timeline
    .to(eyebrow, { autoAlpha: 1, y: 0, duration: 0.5 }, 0)
    .to(title, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.08)
    .to(lead, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.2)
    .to(visual, { autoAlpha: 1, scale: 1, duration: 0.8 }, 0.15)
}

export const buildHeroTimeline: RevealTimelineBuilder = ({ gsap, timeline, q }) => {
  const brand = q('[data-scrub="brand"]')
  const title = q('[data-scrub="title"]')
  const lead = q('[data-scrub="lead"]')
  const visual = q('[data-scrub="visual"]')

  gsap.set(brand, { autoAlpha: 0, y: 12 })
  gsap.set(title, { autoAlpha: 0, y: 32 })
  gsap.set(lead, { autoAlpha: 0, y: 20 })
  gsap.set(visual, { autoAlpha: 0, scale: 1.06, transformOrigin: '50% 45%' })

  timeline
    .to(visual, { autoAlpha: 1, scale: 1, duration: 1.1 }, 0)
    .to(brand, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.1)
    .to(title, { autoAlpha: 1, y: 0, duration: 0.75 }, 0.2)
    .to(lead, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.35)
}

export const buildMissionTimeline: RevealTimelineBuilder = (args) => {
  revealCopy(args)
  const panel = args.q('[data-scrub="panel"]')
  args.gsap.set(panel, { autoAlpha: 0, x: 40 })
  args.timeline.to(panel, { autoAlpha: 1, x: 0, duration: 0.7 }, 0.25)
}

export const buildListingsTimeline: RevealTimelineBuilder = (args) => {
  revealCopy(args)
  const cards = args.q('[data-scrub-card]')
  args.gsap.set(cards, { autoAlpha: 0, y: 48 })
  args.timeline.to(cards, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1 }, 0.2)
}

export const buildMapTimeline: RevealTimelineBuilder = ({ gsap, timeline, q }) => {
  const frame = q('[data-scrub="map-frame"]')
  const title = q('[data-scrub="title"]')
  const lead = q('[data-scrub="lead"]')

  gsap.set([title, lead], { autoAlpha: 0, y: 20 })
  gsap.set(frame, { autoAlpha: 0, scale: 0.97, transformOrigin: '50% 50%' })

  timeline
    .to([title, lead], { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08 }, 0)
    .to(frame, { autoAlpha: 1, scale: 1, duration: 0.8 }, 0.1)
}

export const buildHowTimeline: RevealTimelineBuilder = (args) => {
  revealCopy(args)
  const steps = args.q('[data-scrub-step]')
  args.gsap.set(steps, { autoAlpha: 0, x: -24 })
  args.timeline.to(steps, { autoAlpha: 1, x: 0, duration: 0.55, stagger: 0.12 }, 0.22)
}

export const buildStartTimeline: RevealTimelineBuilder = (args) => {
  revealCopy(args)
  const cta = args.q('[data-scrub="cta"]')
  args.gsap.set(cta, { autoAlpha: 0, scale: 0.94 })
  args.timeline.to(cta, { autoAlpha: 1, scale: 1, duration: 0.5 }, 0.35)
}
