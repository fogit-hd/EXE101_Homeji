import gsap from 'gsap'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { checkEmail, getApiBaseUrl, isEmailTaken } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/errors'
import {
  normalizeEmail,
  normalizeFullName,
  USER_INPUT_LIMITS,
  validateFullName,
  validateRegistrationEmail,
} from '../lib/userInputValidation'
import { ConfettiConfirmButton, ConfettiDoneMark, warmConfettiLottie, type ConfettiConfirmHandle } from './AuthPageConfetti'
import { ConnectHomejiCta, warmConnectLottie } from './AuthPageConnect'
import { AiVoiceFloat, PasswordEyeToggle, voiceTravelDuration } from './AuthPageMotion'
import { layoutWelcomeStrokes, WELCOME_PHRASE } from './authWelcomeHandwrite'
import './AuthPage.css'

const VIDEO = {
  desktop: '/video/auth-desktop-16x9.mp4',
  mobile: '/video/auth-mobile-9x16.mp4',
} as const

const MOBILE_MQ = '(max-width: 900px), (orientation: portrait) and (max-width: 1024px)'
const TOGGLE_COOLDOWN_MS = 1000

const TYPE_MS = 46
/** Nhịp sau khi Voice đã tới slot (cộng thêm vào thời gian trượt). */
const VOICE_LEAD_MS = 480
/** Nghỉ ngắn sau khi gõ xong trước khi chuyển bước. */
const VOICE_TAIL_MS = 520

const COPY = {
  context1:
    'Bạn muốn tìm chỗ quanh Thủ Đức hay Quận 9? Homeji giúp bạn gặp được phòng vừa ý, hợp gu — rõ ràng và yên tâm hơn.',
  askName: 'Hmm, trước hết, bạn muốn mình gọi bạn là gì nhỉ?',
  helloAfter: (name: string) => `Rất vui được gặp bạn, ${name}.`,
  context2: 'Một tài khoản thôi là đủ để bạn có thể tìm nhà, nói chuyện với chủ nhà đáng tin và bạn ở ghép dễ chịu lắm lun í.',
  askEmail: 'Email của bạn là gì ấy nhở!? chia sẻ với Homeji nhé!',
  askPassword: 'Hãy điền phần mật khẩu mà bạn có thể nhớ được — nhớ là phải từ 6 ký tự trở lên nhé.',
  ending:
    'Tuyệt vời — mọi thứ đã sẵn sàng. Bạn hãy double check lại các thông tin 1 lần nữa nhé, Click vào nút bên dưới, chúng mình rất nhanh sẽ gặp nhau thôi!!.',
  renameAfter: (name: string) =>
    `Tên hay quá dạ!! Homeji chúng mình chào mừng ${name} dữ lắm nha.`,
  connectCta: 'Kết nối với Homeji',
  stepBack: '← Lùi một bước',
} as const

export type AuthMode = 'signin' | 'signup'

/** Các bước cinematic signup (không hiện form card). */
type StoryStep =
  | 'welcome'
  | 'context1'
  | 'askName'
  | 'hello'
  | 'askEmail'
  | 'askPassword'
  | 'ending'
  | 'done'

type AuthPageProps = {
  initialMode?: AuthMode
}

function useIsMobileVideo() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MQ).matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return mobile
}

/**
 * Typewriter: gọi Voice tới slot → chờ ĐỦ thời gian trượt (khớp GSAP) → gõ.
 * Không race boolean; Sửa/đổi chỗ cũng phải đợi Voice tới mới chạy chữ.
 */
function TypeMessage({
  text,
  active,
  className,
  msPerChar = 28,
  onDone,
  onSpeaking,
  as: Tag = 'p',
  cancelKey = 0,
  voiceTraveling = false,
}: {
  text: string
  active: boolean
  className?: string
  msPerChar?: number
  onDone?: () => void
  /** Trả về ms Voice cần để tới slot (0 nếu đã đứng sẵn). */
  onSpeaking?: (speaking: boolean, slot: HTMLElement | null) => number | void
  as?: 'p' | 'span'
  cancelKey?: number
  voiceTraveling?: boolean
}) {
  const [count, setCount] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'wait' | 'typing' | 'tail' | 'done'>('idle')
  const doneRef = useRef(false)
  const slotRef = useRef<HTMLSpanElement>(null)
  const onDoneRef = useRef(onDone)
  const onSpeakingRef = useRef(onSpeaking)
  const cancelKeyRef = useRef(cancelKey)
  const voiceTravelingRef = useRef(voiceTraveling)
  const startedKeyRef = useRef(0)
  onDoneRef.current = onDone
  onSpeakingRef.current = onSpeaking
  cancelKeyRef.current = cancelKey
  voiceTravelingRef.current = voiceTraveling

  // Gọi Voice + chờ đủ travelMs rồi mới gõ
  useEffect(() => {
    doneRef.current = false
    setCount(0)
    setPhase('idle')
    if (!active || !text) return

    startedKeyRef.current = cancelKey
    setPhase('wait')

    let cancelled = false
    let waitTimer = 0
    let pollTimer = 0
    let raf2 = 0
    const startedKey = cancelKey

    const beginTyping = () => {
      if (cancelled || cancelKeyRef.current !== startedKey) return
      setPhase('typing')
    }

    const afterTravel = () => {
      if (cancelled || cancelKeyRef.current !== startedKey) return
      // Voice còn đang tween (chậm hơn dự kiến) → poll tới khi đứng
      if (voiceTravelingRef.current) {
        pollTimer = window.setTimeout(afterTravel, 40)
        return
      }
      beginTyping()
    }

    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        if (cancelled) return
        const travelMs = Number(onSpeakingRef.current?.(true, slotRef.current) ?? 0) || 0
        // Đợi đúng thời gian GSAP trượt + nhịp lead — text không chạy trước Voice
        waitTimer = window.setTimeout(afterTravel, travelMs + VOICE_LEAD_MS)
      })
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf1)
      window.cancelAnimationFrame(raf2)
      window.clearTimeout(waitTimer)
      window.clearTimeout(pollTimer)
      const slot = slotRef.current
      onSpeakingRef.current?.(false, slot?.isConnected ? slot : null)
    }
  }, [text, active, msPerChar, cancelKey])

  // typing → tail
  useEffect(() => {
    if (phase !== 'typing') return
    const startedKey = startedKeyRef.current
    let i = 0
    setCount(0)
    const intervalId = window.setInterval(() => {
      if (cancelKeyRef.current !== startedKey) {
        window.clearInterval(intervalId)
        return
      }
      i += 1
      setCount(i)
      if (i >= text.length) {
        window.clearInterval(intervalId)
        setPhase('tail')
      }
    }, msPerChar)
    return () => window.clearInterval(intervalId)
  }, [phase, text, msPerChar])

  // tail → done
  useEffect(() => {
    if (phase !== 'tail') return
    const startedKey = startedKeyRef.current
    const id = window.setTimeout(() => {
      if (cancelKeyRef.current !== startedKey || doneRef.current) return
      doneRef.current = true
      setPhase('done')
      onSpeakingRef.current?.(false, slotRef.current)
      onDoneRef.current?.()
    }, VOICE_TAIL_MS)
    return () => window.clearTimeout(id)
  }, [phase])

  const voiceOn = active && (phase === 'wait' || phase === 'typing' || phase === 'tail')

  useEffect(() => {
    if (!voiceOn) return
    let cancelled = false
    const report = () => {
      if (!cancelled) onSpeakingRef.current?.(true, slotRef.current)
    }
    const id = window.requestAnimationFrame(() => {
      requestAnimationFrame(report)
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(id)
    }
  }, [voiceOn, text, phase])

  const typing = phase === 'typing' && count < text.length
  const shown = phase === 'wait' || phase === 'idle' ? '' : text.slice(0, count)

  return (
    <>
      <span ref={slotRef} className="auth-cinema__ai-voice-slot" aria-hidden="true" />
      <Tag className={className} aria-live="polite">
        {shown}
        {typing ? <span className="auth-cinema__caret" aria-hidden="true" /> : null}
      </Tag>
    </>
  )
}

/** Slot đậu Voice khi câu đã settle / đang chờ nhập — giữ chỗ + re-measure khi layout đổi. */
function VoiceParkSlot({
  active,
  onPark,
}: {
  active: boolean
  onPark: (slot: HTMLElement | null) => void
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!active) return
    const el = ref.current
    if (!el) return

    let cancelled = false
    const report = () => {
      if (!cancelled) onPark(el)
    }
    report()
    // Đợi layout ổn (ẩn/hiện dòng khác khi bấm Sửa) rồi đo lại
    const raf = window.requestAnimationFrame(() => {
      requestAnimationFrame(report)
    })
    const delay = window.setTimeout(report, 80)

    const ro = new ResizeObserver(report)
    ro.observe(el)
    const cascade = el.closest('.auth-cinema__cascade')
    if (cascade) ro.observe(cascade)
    window.addEventListener('resize', report)
    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
      window.clearTimeout(delay)
      ro.disconnect()
      window.removeEventListener('resize', report)
    }
  }, [active, onPark])

  return <span ref={ref} className="auth-cinema__ai-voice-slot" aria-hidden="true" />
}

export function AuthPage({ initialMode }: AuthPageProps) {
  const { login, register, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const modeFromPath: AuthMode =
    initialMode ?? (location.pathname.startsWith('/register') ? 'signup' : 'signin')

  const [mode, setMode] = useState<AuthMode>(modeFromPath)
  /** Skip Intro → hiện form card đầy đủ */
  const [skipped, setSkipped] = useState(modeFromPath === 'signin')
  const [storyStep, setStoryStep] = useState<StoryStep>(
    modeFromPath === 'signup' ? 'welcome' : 'done',
  )
  const [toggleLocked, setToggleLocked] = useState(false)
  const [videoReady, setVideoReady] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [draftName, setDraftName] = useState('')
  const [draftEmail, setDraftEmail] = useState('')
  const [draftPassword, setDraftPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  /** Lỗi API khi bấm Kết nối — ở lại màn hình, hiện Sad + mây chat. */
  const [connectError, setConnectError] = useState('')
  const [helloLine, setHelloLine] = useState('')
  const [helloPhase, setHelloPhase] = useState<'greet' | 'more'>('greet')
  /** Đã gõ xong các đoạn — giữ trên thread (không reset khi quay lại) */
  const [thread, setThread] = useState({
    context1: false,
    hello: false,
    context2: false,
  })
  /** Hiện ô nhập cạnh câu hỏi — chỉ sau khi typewriter xong */
  const [fieldReady, setFieldReady] = useState({
    name: false,
    email: false,
    password: false,
  })
  const resumeAfterEdit = useRef<StoryStep | null>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)
  const cascadeRef = useRef<HTMLDivElement>(null)
  const [cascadeEl, setCascadeEl] = useState<HTMLDivElement | null>(null)
  const nameConfirmRef = useRef<ConfettiConfirmHandle>(null)
  const emailConfirmRef = useRef<ConfettiConfirmHandle>(null)
  const passwordConfirmRef = useRef<ConfettiConfirmHandle>(null)
  const [voiceVisible, setVoiceVisible] = useState(false)
  const [voicePlaying, setVoicePlaying] = useState(false)
  const [voicePos, setVoicePos] = useState({ top: 0, left: 0 })
  /** Voice đang trượt tới slot (vị trí GSAP) — text phải chờ đứng đúng chỗ. */
  const [voiceTraveling, setVoiceTraveling] = useState(false)

  // Không bao giờ kẹt traveling=true (max ~duration trượt + buffer)
  useEffect(() => {
    if (!voiceTraveling) return
    const id = window.setTimeout(() => setVoiceTraveling(false), 2600)
    return () => window.clearTimeout(id)
  }, [voiceTraveling])
  /** Hiện CTA đăng ký sau câu kết + Voice biến mất */
  const [connectReady, setConnectReady] = useState(false)
  const voiceExitTimer = useRef<number | null>(null)
  /** Sau câu cuối: chặn onSpeaking bật lại Voice khi TypeMessage unmount */
  const voicePosRef = useRef({ top: 0, left: 0 })
  const voiceVisibleRef = useRef(false)
  voiceVisibleRef.current = voiceVisible
  const voiceDismissedRef = useRef(false)
  /** Bump khi Sửa / Quay lại để Voice snap vào slot mới */
  const [voiceSnapKey, setVoiceSnapKey] = useState(0)
  /** Sửa tại chỗ — không đổi storyStep, không chạy lại thread cũ */
  const [editingField, setEditingField] = useState<'name' | 'email' | 'password' | null>(null)
  /** Câu chào xanh sau khi Sửa tên — outro ẩn “Xin chào…” rồi mới gõ “Tên hay quá…” */
  const [nameBoost, setNameBoost] = useState<{
    text: string
    phase: 'outro' | 'typing' | 'settled'
    from?: string
  } | null>(null)
  const threadRef = useRef(thread)
  threadRef.current = thread
  /** Trước khi Sửa: Voice có đang bị ẩn ở màn kết không */
  const voiceWasDismissedRef = useRef(false)
  /** Tăng khi Lùi / Sửa / bắt đầu câu mới — hủy TypeMessage đang chạy */
  const [storyGen, setStoryGen] = useState(0)
  const storyGenRef = useRef(0)
  /** Câu kết bị ngắt giữa chừng → hiện bản settled, không chạy lại */
  const [endingSettled, setEndingSettled] = useState(false)

  /** Glow Lottie nặng phần dưới — kéo float lên để tâm quang học ngang chữ. */
  const VOICE_NUDGE_Y = -8

  const measureVoiceSlot = useCallback((slot: HTMLElement) => {
    if (!slot.isConnected) return null
    const box = cascadeEl ?? cascadeRef.current
    if (!box) return null
    const c = box.getBoundingClientRect()
    const a = slot.getBoundingClientRect()
    if (a.width < 1 && a.height < 1) return null
    return {
      top: a.top - c.top + VOICE_NUDGE_Y,
      left: a.left - c.left,
    }
  }, [cascadeEl])

  const onSpeaking = useCallback(
    (_speaking: boolean, slot: HTMLElement | null): number => {
      if (voiceDismissedRef.current) return 0
      let travelMs = 0
      const wasHidden = !voiceVisibleRef.current
      if (slot) {
        const pos = measureVoiceSlot(slot)
        if (pos) {
          const prev = voicePosRef.current
          const dist = Math.hypot(pos.top - prev.top, pos.left - prev.left)
          const fullMs = Math.round(voiceTravelDuration(dist) * 1000)
          // Lần hiện từ ẩn: Float snap — chỉ chờ ngắn. Đang hiện: chờ đủ thời gian tween.
          travelMs = wasHidden ? Math.min(fullMs, 320) : fullMs
          if (dist >= 0.75) {
            setVoiceTraveling(true)
            voicePosRef.current = pos
            setVoicePos(pos)
          } else {
            setVoiceTraveling(false)
            travelMs = 0
          }
        }
      }
      setVoiceVisible(true)
      setVoicePlaying(true)
      return travelMs
    },
    [measureVoiceSlot],
  )

  /** Park khi đang chờ user nhập — giữ Voice ở đầu câu hỏi vừa nói xong. */
  const onVoicePark = useCallback(
    (slot: HTMLElement | null) => {
      onSpeaking(false, slot)
    },
    [onSpeaking],
  )

  /** Bật lại Voice sau ending / khi Sửa / Quay lại. */
  const restoreVoice = useCallback(() => {
    voiceDismissedRef.current = false
    if (voiceExitTimer.current) {
      window.clearTimeout(voiceExitTimer.current)
      voiceExitTimer.current = null
    }
    const wasHidden = !voiceVisibleRef.current
    setVoiceVisible(true)
    setVoicePlaying(true)
    // Chỉ snap khi đang ẩn — nếu đã hiện, để GSAP tween tới slot (đồng bộ với text)
    if (wasHidden) setVoiceSnapKey((k) => k + 1)
  }, [])

  /** Sau Sửa (khi đang gõ câu cuối): chạy lại đoạn ending từ đầu. */
  const replayEndingAfterEdit = useCallback(() => {
    if (resumeAfterEdit.current !== 'ending') return false
    resumeAfterEdit.current = null
    setConnectReady(false)
    setEndingSettled(false)
    setConnectError('')
    voiceDismissedRef.current = false
    voiceWasDismissedRef.current = false
    storyGenRef.current += 1
    setStoryGen(storyGenRef.current)
    setVoiceVisible(true)
    setVoicePlaying(true)
    return true
  }, [])

  /**
   * Chỉ cho 1 TypeMessage chạy: hủy mọi câu đang gõ + settle dòng đó
   * (không gọi onDone → không bị nhảy bước / chạy song song).
   */
  const interruptTyping = useCallback(() => {
    storyGenRef.current += 1
    setStoryGen(storyGenRef.current)
    setNameBoost(null)

    setThread((t) => {
      let next = t
      if (storyStep === 'context1' && !t.context1) next = { ...next, context1: true }
      if (storyStep === 'hello' && helloPhase === 'greet' && !t.hello) next = { ...next, hello: true }
      if (storyStep === 'hello' && helloPhase === 'more' && !t.context2) next = { ...next, context2: true }
      return next
    })

    setFieldReady((f) => {
      let next = f
      if (storyStep === 'askName' && !f.name) next = { ...next, name: true }
      if (storyStep === 'askEmail' && !f.email) next = { ...next, email: true }
      if (storyStep === 'askPassword' && !f.password) next = { ...next, password: true }
      return next
    })

    if (storyStep === 'ending' && !connectReady) {
      setEndingSettled(true)
    }
  }, [storyStep, helloPhase, connectReady])

  const isMobileVideo = useIsMobileVideo()
  const videoRef = useRef<HTMLVideoElement>(null)
  const welcomeRef = useRef<HTMLDivElement>(null)
  const formWrapRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const cooldownTimer = useRef<number | null>(null)
  const signupRunId = useRef(0)
  const modeRef = useRef(mode)
  const skippedRef = useRef(skipped)
  modeRef.current = mode
  skippedRef.current = skipped

  const welcomeLayout = useMemo(() => layoutWelcomeStrokes(WELCOME_PHRASE), [])

  const showStory = mode === 'signup' && !skipped
  const showFormCard = mode === 'signin' || skipped
  const introRunning = showStory && storyStep !== 'done'

  useEffect(() => {
    if (!showStory || storyStep === 'welcome' || storyStep === 'done') {
      setVoiceVisible(false)
      setVoicePlaying(false)
      voiceDismissedRef.current = storyStep === 'done' || !showStory
    }
  }, [showStory, storyStep])

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(mode === 'signin' ? from : '/', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate, from, mode])

  useEffect(() => {
    const next: AuthMode = location.pathname.startsWith('/register') ? 'signup' : 'signin'
    setMode(next)
    if (next === 'signin') {
      setSkipped(true)
      setStoryStep('done')
    } else {
      setSkipped(false)
      setStoryStep('welcome')
      setError('')
      setMessage('')
      setThread({ context1: false, hello: false, context2: false })
      setFieldReady({ name: false, email: false, password: false })
      setHelloPhase('greet')
      setConnectReady(false)
      setEndingSettled(false)
      setEditingField(null)
      setNameBoost(null)
      setConnectError('')
      setStoryGen(0)
      storyGenRef.current = 0
      voiceDismissedRef.current = false
      resumeAfterEdit.current = null
    }
  }, [location.pathname])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    if (showStory) warmConfettiLottie()
  }, [showStory])

  useEffect(() => {
    if (connectReady) warmConnectLottie()
  }, [connectReady])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const src = isMobileVideo ? VIDEO.mobile : VIDEO.desktop
    setVideoReady(false)
    el.dataset.src = src
    el.setAttribute('playsinline', 'true')
    el.setAttribute('webkit-playsinline', 'true')
    el.src = src
    el.load()
    const onReady = () => {
      setVideoReady(true)
      void el.play().catch(() => {})
    }
    const onFail = () => setVideoReady(false)
    el.addEventListener('loadeddata', onReady)
    el.addEventListener('error', onFail)
    return () => {
      el.removeEventListener('loadeddata', onReady)
      el.removeEventListener('error', onFail)
    }
  }, [isMobileVideo])

  const killIntro = () => {
    timelineRef.current?.kill()
    timelineRef.current = null
  }

  /** Chỉ Skip / Sign-in mới hiện form card. */
  const revealFormCard = useCallback(() => {
    killIntro()
    signupRunId.current += 1
    setSkipped(true)
    setStoryStep('done')
    const form = formWrapRef.current
    if (form) gsap.fromTo(form, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out' })
  }, [])

  /** Bước 1: Welcome viết tay (nhanh hơn một chút). */
  const playWelcomeDraw = useCallback(() => {
    killIntro()
    const welcome = welcomeRef.current
    if (!welcome || skippedRef.current || modeRef.current !== 'signup') return

    const letters = Array.from(welcome.querySelectorAll<SVGGElement>('.auth-hw-letter'))
    if (!letters.length) {
      window.requestAnimationFrame(() => playWelcomeDraw())
      return
    }

    const runId = ++signupRunId.current
    setStoryStep('welcome')
    gsap.set(welcome, { autoAlpha: 1, y: 0 })

    letters.forEach((letter) => {
      letter.querySelectorAll<SVGPathElement>('path').forEach((path) => {
        const len = path.getTotalLength()
        gsap.set(path, { opacity: 1, strokeDasharray: len, strokeDashoffset: len })
      })
    })

    const tl = gsap.timeline({
      onComplete: () => {
        if (runId !== signupRunId.current || skippedRef.current) return
        welcome.classList.add('is-drawn')
        window.setTimeout(() => {
          if (runId !== signupRunId.current || skippedRef.current) return
          setStoryStep('context1')
        }, 380)
      },
    })
    timelineRef.current = tl

    let cursor = 0.12
    letters.forEach((letter) => {
      const paths = Array.from(letter.querySelectorAll<SVGPathElement>('path'))
      const ink = paths.find((p) => p.classList.contains('auth-hw-stroke')) ?? paths[0]
      const len = ink.getTotalLength()
      const dur = gsap.utils.clamp(0.12, 0.32, len / 150)
      paths.forEach((path) => {
        tl.to(path, { strokeDashoffset: 0, duration: dur, ease: 'power1.inOut' }, cursor)
      })
      cursor += dur * 0.74
    })
  }, [])

  useEffect(() => {
    if (mode === 'signin') {
      setSkipped(true)
      setStoryStep('done')
      return
    }
    if (skipped) return

    let raf2 = 0
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => playWelcomeDraw())
    })
    return () => {
      window.cancelAnimationFrame(raf1)
      window.cancelAnimationFrame(raf2)
      killIntro()
    }
  }, [mode, skipped, playWelcomeDraw])

  useEffect(
    () => () => {
      killIntro()
      if (cooldownTimer.current) window.clearTimeout(cooldownTimer.current)
    },
    [],
  )

  const armToggleCooldown = () => {
    setToggleLocked(true)
    if (cooldownTimer.current) window.clearTimeout(cooldownTimer.current)
    cooldownTimer.current = window.setTimeout(() => setToggleLocked(false), TOGGLE_COOLDOWN_MS)
  }

  const switchMode = (next: AuthMode) => {
    if (toggleLocked || next === mode) return
    armToggleCooldown()
    setError('')
    setMessage('')
    setMode(next)
    navigate(next === 'signup' ? '/register' : '/login', {
      replace: true,
      state: location.state,
    })
  }

  const skipIntro = () => {
    if (!showStory || submitting) return
    // Đồng bộ draft → form card
    if (draftName.trim()) setDisplayName(normalizeFullName(draftName))
    if (draftEmail.trim()) setEmail(normalizeEmail(draftEmail))
    if (draftPassword) setPassword(draftPassword)
    revealFormCard()
  }

  const validateName = (): boolean => {
    const validationError = validateFullName(draftName)
    if (validationError) {
      setError(validationError)
      return false
    }
    setError('')
    return true
  }

  const applyName = () => {
    const name = normalizeFullName(draftName)
    setError('')

    // Sửa tại chỗ: fade “Xin chào…” → gõ “Tên hay quá…” — không kẹt story
    if (editingField === 'name') {
      const previousHello = helloLine || (displayName ? COPY.helloAfter(displayName) : '')
      interruptTyping()
      setEditingField(null)
      setDisplayName(name)
      voiceWasDismissedRef.current = storyStep === 'ending' && connectReady
      voiceDismissedRef.current = false
      setVoiceVisible(true)
      setVoicePlaying(true)
      const line = COPY.renameAfter(name)
      setHelloLine(line)
      setNameBoost({
        text: line,
        phase: previousHello ? 'outro' : 'typing',
        from: previousHello || undefined,
      })
      return
    }

    // Lần đầu đặt tên
    setDisplayName(name)
    interruptTyping()
    setHelloLine(COPY.helloAfter(name))
    setNameBoost(null)
    setHelloPhase('greet')
    setThread((t) => ({ ...t, hello: false, context2: false }))
    setFieldReady((f) => ({ ...f, email: false, password: false }))
    setStoryStep('hello')
  }

  const validateEmail = async (): Promise<boolean> => {
    const value = normalizeEmail(draftEmail)
    const validationError = validateRegistrationEmail(value)
    if (validationError) {
      setError(validationError)
      return false
    }
    try {
      const result = await checkEmail({ email: value })
      if (isEmailTaken(result)) {
        setError('Email này đã được dùng rồi — thử email khác nhé.')
        return false
      }
      setError('')
      return true
    } catch (err) {
      setError(getErrorMessage(err, 'Không kiểm tra được email — thử lại giúp mình.'))
      return false
    }
  }

  const returnVoiceAfterEdit = () => {
    if (replayEndingAfterEdit()) return
    if (storyStep === 'ending' && (connectReady || voiceWasDismissedRef.current)) {
      voiceWasDismissedRef.current = false
      voiceDismissedRef.current = true
      setVoicePlaying(false)
      setVoiceVisible(false)
      setConnectReady(true)
      return
    }
    voiceWasDismissedRef.current = false
    restoreVoice()
  }

  const applyEmail = () => {
    const value = normalizeEmail(draftEmail)
    setEmail(value)
    setError('')

    if (editingField === 'email') {
      setEditingField(null)
      returnVoiceAfterEdit()
      return
    }

    setFieldReady((f) => ({ ...f, password: false }))
    setStoryStep('askPassword')
  }

  const validatePassword = (): boolean => {
    if (draftPassword.length < 6) {
      setError('Mật khẩu cần từ 6 ký tự trở lên.')
      return false
    }
    setError('')
    return true
  }

  const applyPassword = () => {
    setPassword(draftPassword)
    setError('')

    if (editingField === 'password') {
      setEditingField(null)
      returnVoiceAfterEdit()
      return
    }

    interruptTyping()
    setConnectReady(false)
    setEndingSettled(false)
    voiceDismissedRef.current = false
    setStoryStep('ending')
  }

  const editField = (field: 'name' | 'email' | 'password') => {
    if (submitting) return
    setError('')
    setConnectError('')
    // Text cuối đang gõ → xóa (như Lùi), sửa xong sẽ chạy lại
    const shouldReplayEnding = storyStep === 'ending' && !connectReady
    interruptTyping()
    if (shouldReplayEnding) {
      setEndingSettled(false)
      setConnectReady(false)
      resumeAfterEdit.current = 'ending'
    }
    voiceWasDismissedRef.current = storyStep === 'ending' && (connectReady || !voiceVisible)
    voiceDismissedRef.current = false
    setVoiceVisible(true)
    setVoicePlaying(true)
    setEditingField(field)
    if (field === 'name') {
      setDraftName(displayName || draftName)
    } else if (field === 'email') {
      setDraftEmail(email || draftEmail)
    } else {
      setDraftPassword(password || draftPassword)
      setShowPassword(false)
    }
  }

  /** Lùi một bước: về section trước, hủy text đang gõ — khác với Sửa tại chỗ. */
  const goBackStep = () => {
    if (submitting) return
    setError('')

    // Đang Sửa tại chỗ → hủy sửa, giữ nguyên những gì đã chạy
    if (editingField) {
      setDraftName(displayName || draftName)
      setDraftEmail(email || draftEmail)
      setDraftPassword(password || draftPassword)
      setEditingField(null)
      returnVoiceAfterEdit()
      return
    }

    resumeAfterEdit.current = null
    interruptTyping()
    setConnectReady(false)
    setEndingSettled(false)
    restoreVoice()

    if (storyStep === 'ending') {
      // Về nhập mật khẩu — không gõ lại câu hỏi
      setFieldReady((f) => ({ ...f, password: true }))
      setStoryStep('askPassword')
    } else if (storyStep === 'askPassword') {
      // Về nhập email — không gõ lại câu hỏi
      setPassword('')
      setDraftPassword('')
      setFieldReady((f) => ({ ...f, password: false, email: true }))
      setStoryStep('askEmail')
    } else if (storyStep === 'askEmail' || storyStep === 'hello') {
      // Về thẳng nhập tên — bỏ qua hello/context2, không gõ lại “Trước hết…”
      const keep = displayName || draftName
      setEmail('')
      setDraftEmail('')
      setPassword('')
      setDraftPassword('')
      setHelloPhase('greet')
      setThread((t) => ({ ...t, hello: false, context2: false }))
      setDisplayName('')
      setHelloLine('')
      setDraftName(keep)
      setFieldReady((f) => ({ ...f, name: true, email: false, password: false }))
      setStoryStep('askName')
    } else if (storyStep === 'askName') {
      setFieldReady((f) => ({ ...f, name: false }))
      setThread((t) => ({ ...t, context1: false, hello: false, context2: false }))
      setDisplayName('')
      setHelloLine('')
      setStoryStep('context1')
    }
  }

  const finishInlineRegister = useCallback(async () => {
    if (submitting) return
    const nextEmail = normalizeEmail(email || draftEmail)
    const nextName = normalizeFullName(displayName || draftName)
    const validationError = validateFullName(nextName) || validateRegistrationEmail(nextEmail)
    if (validationError) {
      setConnectError(validationError)
      return
    }
    if ((password || draftPassword).length < 6) {
      setConnectError('Mật khẩu cần từ 6 ký tự trở lên.')
      return
    }
    setSubmitting(true)
    setConnectError('')
    setError('')
    try {
      const session = await register(
        nextEmail,
        password || draftPassword,
        nextName,
      )
      if (session.emailConfirmationRequired) {
        // Ở lại intro — báo qua mây chat (không nhảy form / không Perfect Wrong)
        setConnectError(
          'Đăng ký thành công. Vui lòng xác nhận email trước khi đăng nhập nhé.',
        )
      } else {
        navigate('/')
      }
    } catch (err) {
      setConnectError(getErrorMessage(err, 'Đăng ký thất bại — thử lại giúp mình nhé.'))
    } finally {
      setSubmitting(false)
    }
  }, [submitting, register, email, draftEmail, password, draftPassword, displayName, draftName, navigate])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Đăng nhập thất bại'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignUpCard = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    const nextName = normalizeFullName(displayName)
    const nextEmail = normalizeEmail(email)
    const validationError = validateFullName(nextName) || validateRegistrationEmail(nextEmail)
    if (validationError) {
      setError(validationError)
      return
    }
    setSubmitting(true)
    try {
      const session = await register(nextEmail, password, nextName)
      if (session.emailConfirmationRequired) {
        setMessage(session.message || 'Vui lòng xác nhận email trước khi đăng nhập.')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Đăng ký thất bại'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleLogin = () => {
    const redirectTo = `${window.location.origin}/auth/callback`
    const base = getApiBaseUrl()
    window.location.href = `${base}/api/account/google/redirect?redirectTo=${encodeURIComponent(redirectTo)}`
  }

  const onContext1Done = useCallback(() => {
    if (skippedRef.current) return
    const gen = storyGenRef.current
    setThread((t) => ({ ...t, context1: true }))
    if (storyGenRef.current !== gen) return
    setFieldReady((f) => ({ ...f, name: false }))
    setStoryStep('askName')
  }, [])

  const onNamePromptDone = useCallback(() => {
    setFieldReady((f) => ({ ...f, name: true }))
  }, [])

  const onEmailPromptDone = useCallback(() => {
    setFieldReady((f) => ({ ...f, email: true }))
  }, [])

  const onPasswordPromptDone = useCallback(() => {
    setFieldReady((f) => ({ ...f, password: true }))
  }, [])

  const onHelloGreetDone = useCallback(() => {
    if (skippedRef.current) return
    const gen = storyGenRef.current
    setThread((t) => ({ ...t, hello: true }))
    if (storyGenRef.current !== gen) return
    setHelloPhase('more')
  }, [])

  const onHelloMoreDone = useCallback(() => {
    if (skippedRef.current) return
    const gen = storyGenRef.current
    setThread((t) => ({ ...t, context2: true }))
    if (storyGenRef.current !== gen) return
    setFieldReady((f) => ({ ...f, email: false }))
    setStoryStep('askEmail')
  }, [])

  const onEndingDone = useCallback(() => {
    if (skippedRef.current) return
    const gen = storyGenRef.current
    setEndingSettled(true)
    voiceDismissedRef.current = true
    setVoicePlaying(false)
    setVoiceVisible(false)
    if (voiceExitTimer.current) window.clearTimeout(voiceExitTimer.current)
    voiceExitTimer.current = window.setTimeout(() => {
      if (storyGenRef.current !== gen) return
      setConnectReady(true)
      voiceExitTimer.current = null
    }, 720)
  }, [])

  const onNameBoostDone = useCallback(() => {
    if (skippedRef.current) return
    const gen = storyGenRef.current
    // Gộp vào dòng hello — chỉ còn “Tên hay quá…”, không chồng “Rất vui…”
    setNameBoost(null)
    setThread((t) => ({ ...t, hello: true }))

    // Sửa tên khi đang ở câu cuối → chạy lại ending
    if (replayEndingAfterEdit()) return

    if (storyStep === 'ending' && (connectReady || voiceWasDismissedRef.current)) {
      voiceWasDismissedRef.current = false
      voiceDismissedRef.current = true
      setVoicePlaying(false)
      setVoiceVisible(false)
      setConnectReady(true)
      return
    }

    voiceWasDismissedRef.current = false
    voiceDismissedRef.current = false
    setVoiceVisible(true)
    setVoicePlaying(true)
    if (storyGenRef.current !== gen) return

    // Sửa khi còn ở hello: tiếp tục đúng nhánh (tránh kẹt sau “Tên hay quá…”)
    if (storyStep === 'hello') {
      if (threadRef.current.context2) {
        setFieldReady((f) => ({ ...f, email: false }))
        setStoryStep('askEmail')
      } else {
        setHelloPhase('more')
      }
    }
  }, [storyStep, connectReady, replayEndingAfterEdit])

  /** Outro “Xin chào…” xong → bắt đầu gõ “Tên hay quá…” */
  useEffect(() => {
    if (nameBoost?.phase !== 'outro') return
    const id = window.setTimeout(() => {
      setNameBoost((b) => (b && b.phase === 'outro' ? { ...b, phase: 'typing' } : b))
    }, 480)
    return () => window.clearTimeout(id)
  }, [nameBoost?.phase])

  useEffect(() => {
    return () => {
      if (voiceExitTimer.current) window.clearTimeout(voiceExitTimer.current)
    }
  }, [])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [storyStep, helloPhase, thread, fieldReady, displayName, email, error, connectReady, editingField, nameBoost])

  const pastWelcome = storyStep !== 'welcome'
  const canGoBack =
    storyStep === 'hello' ||
    storyStep === 'askEmail' ||
    storyStep === 'askPassword' ||
    storyStep === 'ending' ||
    storyStep === 'askName' ||
    editingField !== null

  /** Đang Sửa tại chỗ → vẫn hiện các dòng đã chạy phía sau */
  const showAfterName =
    Boolean(displayName) &&
    storyStep !== 'context1' &&
    (storyStep !== 'askName' || editingField !== null)

  const showNameInput =
    editingField === 'name' || (storyStep === 'askName' && fieldReady.name && editingField === null)

  const showEmailInput =
    editingField === 'email' || (storyStep === 'askEmail' && fieldReady.email && editingField === null)

  const showPasswordInput =
    editingField === 'password' ||
    (storyStep === 'askPassword' && fieldReady.password && editingField === null)

  /** Chỉ khóa UI khi đang gọi API — sau khi báo lỗi thì bật lại Skip / Lùi / Đăng nhập / Sửa */
  const connectUiLocked = submitting

  return (
    <div
      className={`auth-cinema${connectUiLocked ? ' is-connect-locked is-connecting-hard' : ''}`}
      role="main"
      aria-label={mode === 'signin' ? 'Đăng nhập' : 'Đăng ký'}
    >
      <div className="auth-cinema__video-wrap" aria-hidden="true">
        <div className="auth-cinema__fallback">
          <span className="auth-cinema__orb auth-cinema__orb--a" />
          <span className="auth-cinema__orb auth-cinema__orb--b" />
          <span className="auth-cinema__orb auth-cinema__orb--c" />
          <div className="auth-cinema__grain" />
        </div>
        <video
          ref={videoRef}
          className={`auth-cinema__video${videoReady ? ' is-ready' : ''}`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        <div className="auth-cinema__overlay" />
      </div>

      {/* Chỉ Skip — không logo */}
      <div className="auth-cinema__top auth-cinema__top--skip-only">
        <button
          type="button"
          className={`auth-cinema__skip${introRunning ? '' : ' is-hidden'}`}
          onClick={skipIntro}
          disabled={connectUiLocked}
          aria-hidden={!introRunning}
          tabIndex={introRunning && !connectUiLocked ? 0 : -1}
        >
          Skip Intro
        </button>
      </div>

      {/* Cinematic story — Welcome góc trái + cascade thục lề */}
      {showStory ? (
        <div className="auth-cinema__story" aria-live="polite">
          <div
            ref={welcomeRef}
            className={`auth-cinema__welcome${storyStep === 'welcome' || pastWelcome ? ' is-active' : ''}${pastWelcome ? ' is-drawn' : ''}`}
            aria-label={WELCOME_PHRASE}
          >
            <svg
              className="auth-cinema__welcome-svg"
              viewBox={`0 0 ${welcomeLayout.width} ${welcomeLayout.height}`}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {welcomeLayout.strokes.map((stroke) => (
                <g
                  key={`${stroke.char}-${stroke.index}`}
                  className="auth-hw-letter"
                  transform={`translate(${stroke.x} 4)`}
                >
                  <path className="auth-hw-glow" d={stroke.d} />
                  <path className="auth-hw-stroke" d={stroke.d} />
                </g>
              ))}
            </svg>
          </div>

          {pastWelcome ? (
            <div
              ref={(el) => {
                cascadeRef.current = el
                setCascadeEl(el)
              }}
              className="auth-cinema__cascade"
            >
              <AiVoiceFloat
                visible={voiceVisible}
                playing={voicePlaying}
                top={voicePos.top}
                left={voicePos.left}
                snapKey={voiceSnapKey}
                onTravelStart={() => setVoiceTraveling(true)}
                onTravelEnd={() => setVoiceTraveling(false)}
              />
              {/* d0 — ngữ cảnh mở đầu */}
              {storyStep === 'context1' || thread.context1 ? (
                <div className="auth-cinema__line auth-cinema__line--d0">
                  {storyStep === 'context1' && !thread.context1 ? (
                    <TypeMessage
                      as="span"
                      text={COPY.context1}
                      active
                      className="auth-cinema__msg auth-cinema__msg--body"
                      msPerChar={TYPE_MS}
                      onDone={onContext1Done}
                      onSpeaking={onSpeaking}
                      cancelKey={storyGen}
                      voiceTraveling={voiceTraveling}
                    />
                  ) : (
                    <>
                      <span className="auth-cinema__ai-voice-slot" aria-hidden="true" />
                      <span className="auth-cinema__msg auth-cinema__msg--body auth-cinema__msg--settled">
                        {COPY.context1}
                      </span>
                    </>
                  )}
                </div>
              ) : null}

              {/* d0 — hỏi tên + nhập liệu kế bên */}
              {storyStep === 'askName' || displayName ? (
              <div className="auth-cinema__line auth-cinema__line--d0">
                {storyStep === 'askName' && !fieldReady.name && editingField === null ? (
                  <TypeMessage
                    as="span"
                    text={COPY.askName}
                    active
                    className="auth-cinema__msg auth-cinema__msg--ask"
                    msPerChar={TYPE_MS}
                    onDone={onNamePromptDone}
                    onSpeaking={onSpeaking}
                    cancelKey={storyGen}
                    voiceTraveling={voiceTraveling}
                  />
                ) : (
                  <>
                    <VoiceParkSlot
                      active={editingField === 'name' || (storyStep === 'askName' && fieldReady.name)}
                      onPark={onVoicePark}
                    />
                    <span className="auth-cinema__msg auth-cinema__msg--ask auth-cinema__msg--settled">
                      {COPY.askName}
                    </span>
                  </>
                )}
                {showNameInput ? (
                  <span className="auth-cinema__ghost-field">
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => {
                        setDraftName(e.target.value)
                        if (error) setError('')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          nameConfirmRef.current?.confirm()
                        }
                      }}
                      placeholder="Họ tên của bạn"
                      maxLength={USER_INPUT_LIMITS.fullName}
                      autoComplete="name"
                      autoFocus
                      aria-label="Họ tên"
                    />
                    <ConfettiConfirmButton
                      ref={nameConfirmRef}
                      resetKey={`name-${storyStep}-${editingField ?? 'flow'}`}
                      onValidate={validateName}
                      onSuccess={applyName}
                      onInvalid={() => {
                        setError(validateFullName(draftName) || 'Họ tên chưa hợp lệ.')
                      }}
                      label="Xác nhận tên"
                    />
                    {error && (editingField === 'name' || storyStep === 'askName') ? (
                      <span className="auth-cinema__inline-error" role="alert">
                        {error}
                      </span>
                    ) : null}
                  </span>
                ) : null}
                {displayName && !showNameInput ? (
                  <span className="auth-cinema__answer">
                    <span className="auth-cinema__answer-text">{displayName}</span>
                    <ConfettiDoneMark />
                    <button type="button" onClick={() => editField('name')}>
                      Sửa
                    </button>
                  </span>
                ) : null}
              </div>
              ) : null}

              {/* d1 — chào + ngữ cảnh */}
              {showAfterName ? (
                <>
                  {/* Lần đầu: Rất vui… | Sửa tên: fade out câu cũ → gõ Tên hay quá… */}
                  {!nameBoost ? (
                    <div className="auth-cinema__line auth-cinema__line--d0">
                      {storyStep === 'hello' && helloPhase === 'greet' && !thread.hello ? (
                        <TypeMessage
                          as="span"
                          text={helloLine || COPY.helloAfter(displayName)}
                          active
                          className="auth-cinema__msg auth-cinema__msg--hello"
                          msPerChar={TYPE_MS}
                          onDone={onHelloGreetDone}
                          onSpeaking={onSpeaking}
                          cancelKey={storyGen}
                          voiceTraveling={voiceTraveling}
                        />
                      ) : (
                        <>
                          <span className="auth-cinema__ai-voice-slot" aria-hidden="true" />
                          <span className="auth-cinema__msg auth-cinema__msg--hello auth-cinema__msg--settled auth-cinema__msg--settle-in">
                            {helloLine || COPY.helloAfter(displayName)}
                          </span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="auth-cinema__line auth-cinema__line--d0">
                      {nameBoost.phase === 'outro' && nameBoost.from ? (
                        <>
                          <span className="auth-cinema__ai-voice-slot" aria-hidden="true" />
                          <span className="auth-cinema__msg auth-cinema__msg--hello auth-cinema__msg--hello-out">
                            {nameBoost.from}
                          </span>
                        </>
                      ) : nameBoost.phase === 'typing' ? (
                        <TypeMessage
                          key={`boost-${storyGen}`}
                          as="span"
                          text={nameBoost.text}
                          active
                          className="auth-cinema__msg auth-cinema__msg--hello"
                          msPerChar={TYPE_MS}
                          onDone={onNameBoostDone}
                          onSpeaking={onSpeaking}
                          cancelKey={storyGen}
                          voiceTraveling={voiceTraveling}
                        />
                      ) : (
                        <>
                          <span className="auth-cinema__ai-voice-slot" aria-hidden="true" />
                          <span className="auth-cinema__msg auth-cinema__msg--hello auth-cinema__msg--settled auth-cinema__msg--settle-in">
                            {nameBoost.text}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {(storyStep === 'hello' && helloPhase === 'more') || thread.context2 ? (
                    <div className="auth-cinema__line auth-cinema__line--d0">
                      {storyStep === 'hello' && helloPhase === 'more' && !thread.context2 ? (
                        <TypeMessage
                          as="span"
                          text={COPY.context2}
                          active
                          className="auth-cinema__msg auth-cinema__msg--body"
                          msPerChar={TYPE_MS}
                          onDone={onHelloMoreDone}
                          onSpeaking={onSpeaking}
                          cancelKey={storyGen}
                          voiceTraveling={voiceTraveling}
                        />
                      ) : (
                        <>
                          <span className="auth-cinema__ai-voice-slot" aria-hidden="true" />
                          <span className="auth-cinema__msg auth-cinema__msg--body auth-cinema__msg--settled auth-cinema__msg--settle-in">
                            {COPY.context2}
                          </span>
                        </>
                      )}
                    </div>
                  ) : null}
                </>
              ) : null}

              {/* d2 — email */}
              {(storyStep === 'askEmail' ||
                storyStep === 'askPassword' ||
                storyStep === 'ending' ||
                Boolean(email) ||
                editingField === 'email') &&
              showAfterName &&
              storyStep !== 'hello' ? (
                <div className="auth-cinema__line auth-cinema__line--d0">
                  {storyStep === 'askEmail' && !fieldReady.email && editingField === null ? (
                    <TypeMessage
                      as="span"
                      text={COPY.askEmail}
                      active
                      className="auth-cinema__msg auth-cinema__msg--ask"
                      msPerChar={TYPE_MS}
                      onDone={onEmailPromptDone}
                      onSpeaking={onSpeaking}
                      cancelKey={storyGen}
                      voiceTraveling={voiceTraveling}
                    />
                  ) : (
                    <>
                      <VoiceParkSlot
                        active={
                          editingField === 'email' || (storyStep === 'askEmail' && fieldReady.email)
                        }
                        onPark={onVoicePark}
                      />
                      <span className="auth-cinema__msg auth-cinema__msg--ask auth-cinema__msg--settled">
                        {COPY.askEmail}
                      </span>
                    </>
                  )}
                  {showEmailInput ? (
                    <span className="auth-cinema__ghost-field">
                      <input
                        type="email"
                        value={draftEmail}
                        onChange={(e) => {
                          setDraftEmail(e.target.value)
                          if (error) setError('')
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            emailConfirmRef.current?.confirm()
                          }
                        }}
                        placeholder="ban@gmail.com"
                        maxLength={USER_INPUT_LIMITS.email}
                        autoComplete="email"
                        autoFocus
                        aria-label="Email"
                      />
                      <ConfettiConfirmButton
                        ref={emailConfirmRef}
                        resetKey={`email-${storyStep}-${editingField ?? 'flow'}`}
                        onValidate={validateEmail}
                        onSuccess={applyEmail}
                        label="Xác nhận email"
                      />
                      {error && (editingField === 'email' || storyStep === 'askEmail') ? (
                        <span className="auth-cinema__inline-error" role="status">
                          {error}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                  {email && !showEmailInput ? (
                    <span className="auth-cinema__answer">
                      <span className="auth-cinema__answer-text">{email}</span>
                      <ConfettiDoneMark />
                      <button type="button" onClick={() => editField('email')}>
                        Sửa
                      </button>
                    </span>
                  ) : null}
                </div>
              ) : null}

              {/* d2 — mật khẩu */}
              {(storyStep === 'askPassword' ||
                storyStep === 'ending' ||
                Boolean(password) ||
                editingField === 'password') &&
              email &&
              showAfterName &&
              storyStep !== 'askEmail' &&
              storyStep !== 'hello' ? (
                <>
                  <div className="auth-cinema__line auth-cinema__line--d0">
                    {storyStep === 'askPassword' && !fieldReady.password && editingField === null ? (
                      <TypeMessage
                        as="span"
                        text={COPY.askPassword}
                        active
                        className="auth-cinema__msg auth-cinema__msg--ask"
                        msPerChar={TYPE_MS}
                        onDone={onPasswordPromptDone}
                        onSpeaking={onSpeaking}
                        cancelKey={storyGen}
                        voiceTraveling={voiceTraveling}
                      />
                    ) : (
                      <>
                        <VoiceParkSlot
                          active={
                            editingField === 'password' ||
                            (storyStep === 'askPassword' && fieldReady.password)
                          }
                          onPark={onVoicePark}
                        />
                        <span className="auth-cinema__msg auth-cinema__msg--ask auth-cinema__msg--settled">
                          {COPY.askPassword}
                        </span>
                      </>
                    )}
                    {showPasswordInput ? (
                      <span className="auth-cinema__ghost-field">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={draftPassword}
                          onChange={(e) => {
                            setDraftPassword(e.target.value)
                            if (error) setError('')
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              passwordConfirmRef.current?.confirm()
                            }
                          }}
                          placeholder="Ít nhất 6 ký tự"
                          autoComplete="new-password"
                          autoFocus
                          aria-label="Mật khẩu"
                          aria-invalid={Boolean(
                            error &&
                              showPasswordInput &&
                              (editingField === 'password' || storyStep === 'askPassword'),
                          )}
                        />
                        <PasswordEyeToggle
                          visible={showPassword}
                          onToggle={() => setShowPassword((v) => !v)}
                        />
                        <ConfettiConfirmButton
                          ref={passwordConfirmRef}
                          resetKey={`password-${storyStep}-${editingField ?? 'flow'}`}
                          onValidate={validatePassword}
                          onSuccess={applyPassword}
                          label="Xác nhận mật khẩu"
                        />
                      </span>
                    ) : null}
                    {password && !showPasswordInput ? (
                      <span className="auth-cinema__answer">
                        <span className="auth-cinema__answer-text">••••••••</span>
                        <ConfettiDoneMark />
                        <button type="button" onClick={() => editField('password')}>
                          Sửa
                        </button>
                      </span>
                    ) : null}
                  </div>
                  {error &&
                  showPasswordInput &&
                  (editingField === 'password' || storyStep === 'askPassword') ? (
                    <p className="auth-cinema__password-error" role="status">
                      {error}
                    </p>
                  ) : null}
                </>
              ) : null}

              {storyStep === 'ending' && editingField === null && !nameBoost ? (
                <div className="auth-cinema__line auth-cinema__line--d0">
                  {connectReady || endingSettled ? (
                    <>
                      <span className="auth-cinema__ai-voice-slot" aria-hidden="true" />
                      <span className="auth-cinema__msg auth-cinema__msg--body auth-cinema__msg--settled auth-cinema__msg--settle-in">
                        {COPY.ending}
                      </span>
                    </>
                  ) : (
                    <TypeMessage
                      key={`ending-${storyGen}`}
                      as="span"
                      text={COPY.ending}
                      active
                      className="auth-cinema__msg auth-cinema__msg--body"
                      msPerChar={TYPE_MS}
                      onDone={onEndingDone}
                      onSpeaking={onSpeaking}
                      cancelKey={storyGen}
                      voiceTraveling={voiceTraveling}
                    />
                  )}
                </div>
              ) : null}

              {storyStep === 'ending' && connectReady ? (
                <div className="auth-cinema__line auth-cinema__line--d0 auth-cinema__line--connect">
                  <ConnectHomejiCta
                    label={COPY.connectCta}
                    connecting={submitting}
                    error={connectError}
                    onConnect={() => void finishInlineRegister()}
                  />
                </div>
              ) : null}

              {/* Lỗi ngoài field — không trùng với inline name/email/password */}
              {error &&
              !showNameInput &&
              !showEmailInput &&
              !showPasswordInput &&
              !connectError ? (
                <p className="auth-cinema__story-error" role="status">
                  {error}
                </p>
              ) : null}

              <div ref={threadEndRef} />
            </div>
          ) : null}
        </div>
      ) : null}

      {showStory && canGoBack ? (
        <button
          type="button"
          className="auth-cinema__fixed-back"
          onClick={goBackStep}
          disabled={connectUiLocked}
          title="Lùi một bước để xem lại hiệu ứng — không phải về trang chủ"
        >
          {COPY.stepBack}
        </button>
      ) : null}

      {showStory ? (
        <p className="auth-cinema__fixed-login">
          Đã có tài khoản?{' '}
          <button
            type="button"
            disabled={toggleLocked || connectUiLocked}
            onClick={() => switchMode('signin')}
          >
            Đăng nhập
          </button>
        </p>
      ) : null}

      {/* Form card: Sign-in luôn có / Sign-up chỉ khi Skip */}
      {showFormCard ? (
        <div className="auth-cinema__stage">
          <div ref={formWrapRef} className="auth-cinema__form-wrap is-ready">
            <div className="auth-cinema__card">
              {mode === 'signin' ? (
                <>
                  <h1 className="auth-cinema__title">Đăng nhập</h1>
                  <p className="auth-cinema__subtitle">Chào mừng trở lại Homeji</p>
                  {error ? (
                    <div className="auth-cinema__alert auth-cinema__alert--error">{error}</div>
                  ) : null}
                  <form onSubmit={(e) => void handleSignIn(e)}>
                    <div className="auth-cinema__field">
                      <label htmlFor="auth-email">Email</label>
                      <input
                        id="auth-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        placeholder="ban@email.com"
                      />
                    </div>
                    <div className="auth-cinema__field">
                      <label htmlFor="auth-password">Mật khẩu</label>
                      <input
                        id="auth-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
                      />
                    </div>
                    <button type="submit" className="auth-cinema__submit" disabled={submitting}>
                      {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                  </form>
                  <div className="auth-cinema__divider">hoặc</div>
                  <button type="button" className="auth-cinema__google" onClick={handleGoogleLogin}>
                    Đăng nhập với Google
                  </button>
                  <p className="auth-cinema__footer">
                    Chưa có tài khoản?{' '}
                    <button type="button" disabled={toggleLocked} onClick={() => switchMode('signup')}>
                      Đăng ký
                    </button>
                  </p>
                  <div style={{ textAlign: 'center' }}>
                    <Link className="auth-cinema__forgot" to="/forgot-password">
                      Quên mật khẩu?
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="auth-cinema__title">Đăng ký</h1>
                  <p className="auth-cinema__subtitle">Tạo tài khoản Homeji miễn phí</p>
                  {error ? (
                    <div className="auth-cinema__alert auth-cinema__alert--error">{error}</div>
                  ) : null}
                  {message ? (
                    <div className="auth-cinema__alert auth-cinema__alert--ok">{message}</div>
                  ) : null}
                  <form onSubmit={(e) => void handleSignUpCard(e)}>
                    <div className="auth-cinema__field">
                      <label htmlFor="auth-name">Họ tên</label>
                      <input
                        id="auth-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        maxLength={USER_INPUT_LIMITS.fullName}
                        autoComplete="name"
                        placeholder="Nguyễn Văn A"
                      />
                    </div>
                    <div className="auth-cinema__field">
                      <label htmlFor="auth-reg-email">Email</label>
                      <input
                        id="auth-reg-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        maxLength={USER_INPUT_LIMITS.email}
                        autoComplete="email"
                        placeholder="ban@gmail.com"
                      />
                    </div>
                    <div className="auth-cinema__field">
                      <label htmlFor="auth-reg-password">Mật khẩu</label>
                      <input
                        id="auth-reg-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={6}
                        required
                        autoComplete="new-password"
                        placeholder="Ít nhất 6 ký tự"
                      />
                    </div>
                    <button type="submit" className="auth-cinema__submit" disabled={submitting}>
                      {submitting ? 'Đang đăng ký...' : 'Đăng ký'}
                    </button>
                  </form>
                  <p className="auth-cinema__footer">
                    Đã có tài khoản?{' '}
                    <button type="button" disabled={toggleLocked} onClick={() => switchMode('signin')}>
                      Đăng nhập
                    </button>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
