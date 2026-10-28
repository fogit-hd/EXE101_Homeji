import { useCallback, useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react'
import './GlassDensityControl.css'

const STORAGE_KEY = 'homeji_glass_density'
export const DENSITY_TRANSPARENT = 0.2
export const DENSITY_BALANCED = 0.5
export const DENSITY_FROSTED = 0.85

/**
 * GlassDensityControl: Liquid glass density slider matching the reference images.
 * Smoothly tunes UI between Transparent (0.2), Balanced (0.5), and Frosted (0.85).
 */
export function GlassDensityControl({ className = '' }: { className?: string }) {
  const [density, setDensity] = useState<number>(() => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return DENSITY_BALANCED
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = parseFloat(saved)
        if (Number.isFinite(parsed) && parsed >= DENSITY_TRANSPARENT && parsed <= DENSITY_FROSTED) {
          return parsed
        }
      }
    } catch {
      // Storage might be restricted
    }
    return DENSITY_BALANCED
  })

  const [isDragging, setIsDragging] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  const applyDensity = useCallback((val: number) => {
    const clamped = Math.min(DENSITY_FROSTED, Math.max(DENSITY_TRANSPARENT, Math.round(val * 100) / 100))
    setDensity(clamped)
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, String(clamped))
      }
    } catch {
      // Storage might be restricted
    }
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--glass-density', String(density))
    }
  }, [density])

  // Normalized 0..1 ratio for thumb position
  const ratio = (density - DENSITY_TRANSPARENT) / (DENSITY_FROSTED - DENSITY_TRANSPARENT)

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return
    setIsDragging(true)
    trackRef.current.setPointerCapture(e.pointerId)
    const rect = trackRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const nextRatio = x / rect.width
    const nextVal = DENSITY_TRANSPARENT + nextRatio * (DENSITY_FROSTED - DENSITY_TRANSPARENT)
    applyDensity(nextVal)
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const nextRatio = x / rect.width
    const nextVal = DENSITY_TRANSPARENT + nextRatio * (DENSITY_FROSTED - DENSITY_TRANSPARENT)
    applyDensity(nextVal)
  }

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (isDragging && trackRef.current) {
      try {
        trackRef.current.releasePointerCapture(e.pointerId)
      } catch {
        // Safe ignore
      }
      setIsDragging(false)
      // Magnetic snap to primary reference stops
      if (Math.abs(density - DENSITY_BALANCED) <= 0.08) {
        applyDensity(DENSITY_BALANCED)
      } else if (density <= 0.28) {
        applyDensity(DENSITY_TRANSPARENT)
      } else if (density >= 0.77) {
        applyDensity(DENSITY_FROSTED)
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      applyDensity(Math.min(DENSITY_FROSTED, density + 0.05))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      applyDensity(Math.max(DENSITY_TRANSPARENT, density - 0.05))
    } else if (e.key === 'Home') {
      e.preventDefault()
      applyDensity(DENSITY_TRANSPARENT)
    } else if (e.key === 'End') {
      e.preventDefault()
      applyDensity(DENSITY_FROSTED)
    }
  }

  return (
    <div
      className={`glass-density-control${className ? ` ${className}` : ''}`}
      role="region"
      aria-label="Điều chỉnh độ mờ kính"
    >
      <div className="glass-density-control__slider-row">
        {/* Transparent Icon Button */}
        <button
          type="button"
          className={`glass-density-icon-btn${density <= 0.3 ? ' is-active' : ''}`}
          title="Trong suốt (Độ xuyên thấu cao)"
          onClick={() => applyDensity(DENSITY_TRANSPARENT)}
          aria-label="Đặt độ trong suốt cao"
        >
          <svg
            className="glass-density-svg-icon"
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="7" width="13" height="13" rx="3.5" />
            <path d="M7 4h9a3 3 0 0 1 3 3v9" />
          </svg>
        </button>

        {/* Interactive Track */}
        <div
          ref={trackRef}
          className={`glass-density-track${isDragging ? ' is-dragging' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          tabIndex={0}
          role="slider"
          aria-label="Độ phủ kính (Glass Density)"
          aria-valuemin={DENSITY_TRANSPARENT}
          aria-valuemax={DENSITY_FROSTED}
          aria-valuenow={density}
          aria-valuetext={
            density < 0.35
              ? 'Trong suốt'
              : density < 0.7
              ? 'Cân bằng'
              : 'Phủ màu'
          }
          onKeyDown={handleKeyDown}
        >
          <div className="glass-density-track__rail" />

          {/* Reference Center Notch */}
          <div
            className="glass-density-dot glass-density-dot--middle"
            onClick={(e) => {
              e.stopPropagation()
              applyDensity(DENSITY_BALANCED)
            }}
            title="0.5 Cân bằng"
          />

          {/* 3D Liquid Glass Thumb */}
          <div
            className="glass-density-thumb"
            style={{ left: `calc(${ratio * 100}% - ${ratio * 36}px)` }}
            aria-hidden="true"
          />
        </div>

        {/* Frosted Icon Button */}
        <button
          type="button"
          className={`glass-density-icon-btn${density >= 0.75 ? ' is-active' : ''}`}
          title="Phủ màu (Tăng độ mờ và tương phản)"
          onClick={() => applyDensity(DENSITY_FROSTED)}
          aria-label="Đặt độ phủ màu mờ đục"
        >
          <svg
            className="glass-density-svg-icon"
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="currentColor"
            stroke="none"
            aria-hidden="true"
          >
            <rect x="3" y="7" width="13" height="13" rx="3.5" opacity="0.3" />
            <rect x="7" y="4" width="13" height="13" rx="3.5" opacity="0.9" />
          </svg>
        </button>
      </div>

      <p className="glass-density-control__caption">
        Tùy chọn &ldquo;Trong suốt&rdquo; có độ xuyên thấu cao hơn, còn &ldquo;Phủ màu&rdquo; làm
        tăng độ mờ và tương phản cho nội dung và các nút điều khiển.
      </p>
    </div>
  )
}
