# Homeji authentication motion research

Research date: 2026-10-04. Scope: an animated login/register experience; no authentication, billing, or business-logic changes.

## Recommended direction (design recommendations, not source claims)

Build a small procedural, low-poly city diorama beside the form: a terracotta earth island, stylized green hills, a winding Saigon-inspired river, apartment blocks and rental houses, with a simplified tall city landmark. Hills are an artistic landscape motif, not a geographically accurate depiction of central Ho Chi Minh City. Warm cream, jade and sunset orange should remain compatible with Homeji's existing identity.

Use Three.js only for this decorative scene and GSAP for the entrance, cloud/river/marker movement and login/register transitions. Keep the existing HTML form, labels, validation, focus and submit controls fully independent of the canvas. Recommended interactions: a bounded pointer parallax, gentle marker bobbing, a sunrise entrance, and a brief neighborhood reveal when switching forms. Do not require users to interact with the scene to log in.

## Verified implementation facts

- An orthographic camera keeps apparent object size constant with distance, making it suitable for a stylized isometric view. Camera property changes require `updateProjectionMatrix()`. [Three.js OrthographicCamera](https://threejs.org/docs/pages/OrthographicCamera.html)
- GSAP supports DOM, Three.js and WebGL animation. Its React hook automatically reverts animations on teardown; delayed or event-handler animations must be context-safe, and manually registered listeners still need removal. If retaining the existing GSAP dependency without adding `@gsap/react`, use a scoped `gsap.context()` and return `context.revert()` from the React effect. [GSAP React guide](https://gsap.com/resources/React/), [GSAP context](https://gsap.com/docs/v3/GSAP/gsap.context%28%29/)
- `gsap.matchMedia()` records and reverts animations when matching conditions change. It supports `prefers-reduced-motion` and internally creates a context, so nesting a separate context solely for the same setup is unnecessary. [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia%28%29/)
- Three.js provides `WebGL.isWebGL2Available()` as a capability check before initialization. A decorative auth scene should show a static CSS/SVG fallback when unavailable or renderer creation fails rather than presenting a WebGL error as an auth error. The fallback is a Homeji recommendation. [Three.js compatibility check](https://threejs.org/manual/pages/webgl-compatibility-check.html)
- Three.js resources are not automatically cleaned up during client-side navigation: geometries, materials and textures need explicit disposal. Track shared resources with sets so each resource is disposed once, stop the animation loop and dispose the renderer during teardown. [Three.js cleanup](https://threejs.org/manual/pages/cleanup.html), [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)
- Rendering resolution has a material GPU cost. The responsive manual recommends explicit drawing-buffer sizing and demonstrates a maximum pixel-count cap; unrestricted device-pixel-ratio rendering can waste resources. For this panel, use a modest capped drawing buffer and update the camera on container resize. Suggested cap around 1–1.5 DPR is a project budget, not an official universal value. [Three.js responsive rendering](https://threejs.org/manual/pages/responsive.html)
- `WebGLRenderer.setAnimationLoop()` is the documented preferred animation-loop API. Static scenes can render only when needed to avoid wasting device power. With reduced motion, render a composed still frame and redraw on resize; do not retain continuous cloud/marker motion. [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html), [Rendering on demand](https://threejs.org/manual/pages/rendering-on-demand.html)
- `visibilitychange` and `document.hidden` let an application detect when its tab is not visible. Pause the scene's local GSAP timelines and rendering while hidden; resume only that component's motion when visible. Do not globally sleep the GSAP ticker, which could affect unrelated Homeji animations. [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- A canvas can emit `webglcontextlost`; handle loss by stopping decoration rendering and preserving the static fallback and usable form. [MDN webglcontextlost](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event)
- Repeated meshes sharing geometry and material can use `InstancedMesh` to reduce draw calls. For a small diorama, ordinary shared geometries/materials may be simpler; instance only if measured draw-call cost warrants it. [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)

## QA requirements

1. Login/register validation and Google sign-in remain unchanged and usable while the scene loads or fails.
2. Desktop, narrow mobile and short-height screens show all inputs without horizontal overflow.
3. Reduced-motion preference displays a stable scene, including when the preference changes while mounted.
4. Route switching and React Strict Mode do not accumulate canvases, timelines, listeners or GPU resources.
5. Hidden-tab suspension does not pause unrelated application animations.
6. WebGL unavailable/context-loss paths leave the form and static illustration usable.
7. Decorative canvas is hidden from assistive technology; pointer movement must not intercept form input.
