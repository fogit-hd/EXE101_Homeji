import type { CSSProperties, SVGProps } from 'react'

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number
  className?: string
  style?: CSSProperties
}

const defaultProps = (props: IconProps) => {
  const size = props.size || 16
  return {
    width: props.width || size,
    height: props.height || size,
    viewBox: '0 0 24 24',
    fill: props.fill || 'none',
    stroke: props.stroke || 'currentColor',
    strokeWidth: props.strokeWidth || 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
    ...props,
  }
}

export function HouseIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M3 10.5L12 3l9 7.5v9.5a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  )
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

export function SnowflakeIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" />
      <path d="m9 3 3 3 3-3M9 21l3-3 3 3M3 9l3 3-3 3M21 9l-3 3 3 3" />
    </svg>
  )
}

export function LoftLadderIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8" />
    </svg>
  )
}

export function ShowerIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M4 4h7a4 4 0 0 1 4 4v12" />
      <path d="M15 8h4a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2z" />
      <circle cx="13" cy="15" r=".6" fill="currentColor" />
      <circle cx="16" cy="16" r=".6" fill="currentColor" />
      <circle cx="19" cy="15" r=".6" fill="currentColor" />
    </svg>
  )
}

export function PawIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <circle cx="12" cy="15" r="3.5" />
      <circle cx="7" cy="9.5" r="1.8" />
      <circle cx="17" cy="9.5" r="1.8" />
      <circle cx="10" cy="5.5" r="1.5" />
      <circle cx="14" cy="5.5" r="1.5" />
    </svg>
  )
}

export function CalculatorIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="16" y1="14" x2="16" y2="18" />
      <circle cx="8" cy="10" r=".7" fill="currentColor" />
      <circle cx="12" cy="10" r=".7" fill="currentColor" />
      <circle cx="16" cy="10" r=".7" fill="currentColor" />
      <circle cx="8" cy="14" r=".7" fill="currentColor" />
      <circle cx="12" cy="14" r=".7" fill="currentColor" />
      <circle cx="8" cy="18" r=".7" fill="currentColor" />
      <circle cx="12" cy="18" r=".7" fill="currentColor" />
    </svg>
  )
}

export function ElectricBoltIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

export function WaterDropIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  )
}

export function MotorbikeIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <circle cx="5.5" cy="16.5" r="3" />
      <circle cx="18.5" cy="16.5" r="3" />
      <path d="M5.5 16.5L9.5 9h5l3 7.5M9.5 9h4M14 6l3 3" />
    </svg>
  )
}

export function LightbulbIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-6 6c0 2.2 1.3 4.1 3.2 5.2.5.3.8.8.8 1.4V16h4v-.4c0-.6.3-1.1.8-1.4A6.002 6.002 0 0 0 18 9a6 6 0 0 0-6-6z" />
    </svg>
  )
}

export function StarIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

export function CrownIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M2 19h20M4 19l2-13 5 5 1-8 1 8 5-5 2 13H4z" />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

export function GraduationCapIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
    </svg>
  )
}

export function MetroTrainIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <rect x="4" y="3" width="16" height="15" rx="3" />
      <line x1="4" y1="11" x2="20" y2="11" />
      <circle cx="8" cy="15" r=".7" fill="currentColor" />
      <circle cx="16" cy="15" r=".7" fill="currentColor" />
      <path d="m8 18-2 3M16 18l2 3" />
    </svg>
  )
}

export function FloodFreeIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M3 20h18M6 16l3-8 3 4 3-6 3 10" />
      <circle cx="18" cy="6" r="2.5" />
    </svg>
  )
}

export function SecurityCameraIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M2 10h5l4-3 9 3v4l-9 3-4-3H2v-4z" />
      <circle cx="16.5" cy="12" r="1.2" fill="currentColor" />
      <path d="M7 14v4M4 18h6" />
    </svg>
  )
}

export function IdCardCheckIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8" cy="10" r="2.5" />
      <path d="M5 16c0-1.5 1.5-2.5 3-2.5s3 1 3 2.5" />
      <polyline points="14 13 16 15 20 10" />
    </svg>
  )
}

export function CameraCheckIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="3" />
      <polyline points="16 7 18 9 22 5" />
    </svg>
  )
}

export function NoHiddenFeeIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M15 9.5a2.5 2.5 0 0 0-5 0c0 2 5 2 5 4a2.5 2.5 0 0 1-5 0" />
    </svg>
  )
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  )
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" />
    </svg>
  )
}

export function NoteEditIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

export function TagIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="2.5" />
    </svg>
  )
}

export function MessageCircleIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

export function LocationPinIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

export function AreaRulerIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="m21.3 15.3-6.6 6.6a1 1 0 0 1-1.4 0l-11-11a1 1 0 0 1 0-1.4l6.6-6.6a1 1 0 0 1 1.4 0l11 11a1 1 0 0 1 0 1.4z" />
      <path d="m14.5 4.5 2 2" />
      <path d="m11.5 7.5 3 3" />
      <path d="m8.5 10.5 2 2" />
      <path d="m5.5 13.5 3 3" />
    </svg>
  )
}

export function MoneyIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  )
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export function PhoneIcon(props: IconProps) {
  return (
    <svg {...defaultProps(props)}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

export function HeartIcon(props: IconProps & { filled?: boolean }) {
  const { filled = false, ...rest } = props
  return (
    <svg {...defaultProps(rest)} fill={filled ? 'currentColor' : 'none'}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}
