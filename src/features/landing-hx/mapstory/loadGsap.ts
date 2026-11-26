/** GSAP + ScrollTrigger, fetched after first paint so the story's words show before the motion layer arrives. */
let engine: Promise<{ gsap: typeof import('gsap').gsap; ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger }> | null = null

export function loadGsap() {
  engine ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([core, st]) => {
    core.gsap.registerPlugin(st.ScrollTrigger)
    return { gsap: core.gsap, ScrollTrigger: st.ScrollTrigger }
  })
  return engine
}
