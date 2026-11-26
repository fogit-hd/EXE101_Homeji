import { X } from 'lucide-react'
import { useFloatingToolsTucked } from '../../hooks/useFloatingToolsTucked'
import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useRentalJourney } from '../../contexts/rental-journey'
import { useRentalAssistantComparison, useRentalAssistantOpener } from '../../contexts/rental-assistant-context'
import { MAX_RENTAL_CHOICES, type RentalChoice } from '../../lib/rentalJourney'
import { aiFeatureFlags } from '../../lib/aiFeatureFlags'
import { RentalDecisionPanel } from './RentalDecisionPanel'
import './RentalJourney.css'

function ChoiceList({ choices, remove }: { choices: RentalChoice[]; remove: (postId: string) => void }) {
  return <ul className="rental-journey__choices">{choices.map(choice => <li key={choice.postId}>
    <Link to={`/?post=${encodeURIComponent(choice.postId)}`}>{choice.title || 'Tin phòng đã chọn'}</Link>
    <button type="button" aria-label={`Bỏ ${choice.title || 'phòng'} khỏi cân nhắc`} title={`Bỏ ${choice.title || 'phòng'} khỏi cân nhắc`} onClick={() => remove(choice.postId)}><X aria-hidden="true" size={18} style={{ verticalAlign: 'middle' }} /></button>
  </li>)}</ul>
}

const JOURNEY_STEPS = ['Cân nhắc', 'So sánh', 'Hẹn xem', 'Liên hệ'] as const

export function RentalJourneyTray() {
  const journey = useRentalJourney()
  const location = useLocation()
  const section = new URLSearchParams(location.search).get('section')
  const floating = location.pathname === '/' && (!section || section === 'listings')
  const visible = floating && aiFeatureFlags.decisionTools && journey?.enabled && Boolean(journey.choices.length)
  const tucked = useFloatingToolsTucked(Boolean(visible), `${location.pathname}:${section ?? ''}`)
  const tray = useRef<HTMLElement>(null)
  useEffect(() => {
    const element = tray.current
    if (!floating || !visible || !element) return
    const measure = () => document.documentElement.style.setProperty('--rental-tray-height', `${element.getBoundingClientRect().height}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--rental-tray-height') }
  }, [floating, visible])
  if (!visible || !journey) return null
  return <aside ref={tray} data-floating={floating || undefined} className={`rental-journey-tray${tucked ? ' is-tucked' : ''}`} inert={tucked} aria-label="Danh sách phòng đang cân nhắc" data-glass-exclude>
    <div><strong>Đang cân nhắc · {journey.choices.length}/{journey.maxChoices ?? MAX_RENTAL_CHOICES}</strong><ol className="rental-journey-tray__steps" aria-label="Các bước thuê">{JOURNEY_STEPS.map((step, index) => <li key={step} aria-current={index === (journey.choices.length >= 2 ? 1 : 0) ? 'step' : undefined}>{step}</li>)}</ol></div>
    <Link className="btn btn-primary btn-sm" to="/?section=saved&view=considering">{journey.choices.length >= 2 ? 'So sánh các lựa chọn' : 'Xem lựa chọn'}</Link>
  </aside>
}

export function RentalShortlistWorkspace() {
  const journey = useRentalJourney()
  const openAssistant = useRentalAssistantOpener()
  const choices = journey?.choices ?? []
  const postIds = choices.map(item => item.postId)
  const limit = journey?.maxChoices ?? MAX_RENTAL_CHOICES
  const withinLimit = choices.length <= limit
  useRentalAssistantComparison(aiFeatureFlags.decisionTools && journey?.enabled && choices.length >= 2 && withinLimit
    ? { postIds, title: choices.map(choice => choice.title || 'Tin phòng đã chọn').join(' · '), scenario: journey.scenario } : null)
  if (!aiFeatureFlags.decisionTools || !journey?.enabled) return null
  return <section className="rental-journey-workspace" aria-label="Danh sách cân nhắc và so sánh chung">
    <h2>Đang cân nhắc</h2>
    {/* Empty, the panel says only how to start; the limits and next steps appear once there is something to compare. */}
    {choices.length ? <>
      <p>Gói hiện tại cho phép so sánh tối đa {limit} phòng mỗi lần. Chọn từ tìm kiếm, bản đồ hoặc chi tiết; không cần lưu tin trước.</p>
      {!withinLimit && <p role="status">Danh sách đang có {choices.length} phòng. Bỏ bớt {choices.length - limit} phòng để so sánh với gói hiện tại; lựa chọn của bạn vẫn được giữ lại.</p>}
      <ChoiceList choices={choices} remove={journey.remove} />
      {choices.length >= 2 && withinLimit ? <>
        <RentalDecisionPanel postIds={postIds} scenario={journey.scenario} onScenarioChange={journey.setScenario} />
        {openAssistant ? <button type="button" className="btn btn-secondary" onClick={openAssistant}>Hỏi trợ lý về các lựa chọn này</button> : null}
      </> : choices.length < 2 ? <p>Chọn thêm một phòng để đối chiếu cùng kịch bản chi phí.</p> : null}
      <p>Mở chi tiết phòng từ danh sách để xem phí, sửa nháp câu hỏi và yêu cầu lịch xem. Các thao tác liên hệ vẫn do bạn xác nhận.</p>
    </> : <p>Chưa chọn phòng. Dùng “Thêm vào cân nhắc” trên tin phòng để bắt đầu.</p>}
  </section>
}
