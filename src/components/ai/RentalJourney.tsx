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
    <button type="button" aria-label={`Bỏ ${choice.title || 'phòng'} khỏi cân nhắc`} onClick={() => remove(choice.postId)}>×</button>
  </li>)}</ul>
}

export function RentalJourneyTray() {
  const journey = useRentalJourney()
  const location = useLocation()
  const tray = useRef<HTMLElement>(null)
  const onWorkspace = new URLSearchParams(location.search).get('section') === 'saved'
  const visible = aiFeatureFlags.decisionTools && journey?.enabled && Boolean(journey.choices.length) && !onWorkspace
  useEffect(() => {
    const element = tray.current
    if (!visible || !element) return
    const measure = () => document.documentElement.style.setProperty('--rental-tray-height', `${element.getBoundingClientRect().height}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--rental-tray-height') }
  }, [visible])
  if (!visible || !journey) return null
  return <aside ref={tray} className="rental-journey-tray" aria-label="Danh sách phòng đang cân nhắc" data-glass-exclude>
    <div><strong>Đang cân nhắc · {journey.choices.length}/{journey.maxChoices ?? MAX_RENTAL_CHOICES}</strong><span>Giữ cùng lựa chọn từ tìm kiếm đến liên hệ</span></div>
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
    <p>Gói hiện tại cho phép so sánh tối đa {limit} phòng mỗi lần. Chọn từ tìm kiếm, bản đồ hoặc chi tiết; không cần lưu tin trước.</p>
    {!withinLimit && <p role="status">Danh sách đang có {choices.length} phòng. Bỏ bớt {choices.length - limit} phòng để so sánh với gói hiện tại; lựa chọn của bạn vẫn được giữ lại.</p>}
    {choices.length ? <ChoiceList choices={choices} remove={journey.remove} /> : <p>Chưa chọn phòng. Dùng “Thêm vào cân nhắc” trên tin phòng để bắt đầu.</p>}
    {choices.length >= 2 && withinLimit ? <>
      <RentalDecisionPanel postIds={postIds} scenario={journey.scenario} onScenarioChange={journey.setScenario} />
      {openAssistant ? <button type="button" className="btn btn-secondary ai-spectrum-button" onClick={openAssistant}>Hỏi trợ lý về các lựa chọn này</button> : null}
    </> : choices.length < 2 ? <p>Chọn thêm một phòng để đối chiếu cùng kịch bản chi phí.</p> : null}
    <p>Mở chi tiết phòng từ danh sách để xem phí, sửa nháp câu hỏi và yêu cầu lịch xem. Các thao tác liên hệ vẫn do bạn xác nhận.</p>
  </section>
}
