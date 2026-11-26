import { useState } from 'react'
import { Link } from 'react-router-dom'
import { filterHelpFaq } from '../content/helpFaq'
import { HOMEJI_AI_PANEL_ID, HOMEJI_AI_TRIGGER_ATTR, toggleHomejiAi } from '../lib/homejiAiLauncher'
import './HelpPage.css'

export function HelpPage() {
  const [query, setQuery] = useState('')
  const results = filterHelpFaq(query)
  const groups = [...new Set(results.map(item => item.group))]
  return <div className="help-page">
    <label className="form-label" htmlFor="help-search">Tìm câu hỏi</label>
    <input id="help-search" className="form-input" type="search" placeholder="VD: đặt lịch xem phòng" value={query} onChange={event => setQuery(event.target.value)} />
    <p role="status" aria-live="polite">{results.length} câu hỏi</p>
    {groups.map(group => <section key={group}>
      <h2>{group}</h2>
      {results.filter(item => item.group === group).map(item => <details key={item.id}>
        <summary>{item.question}</summary>
        <div className="help-page__answer"><p>{item.answer}</p>{item.link && <Link to={item.link.to}>{item.link.label}</Link>}</div>
      </details>)}
    </section>)}
    {results.length === 0 && <div className="help-page__empty">
      <p>Không tìm thấy câu hỏi phù hợp.</p>
      <button type="button" className="btn btn-secondary" aria-haspopup="dialog" aria-controls={HOMEJI_AI_PANEL_ID} {...{ [HOMEJI_AI_TRIGGER_ATTR]: '' }} onClick={event => toggleHomejiAi(event.currentTarget, true)}>Hỏi Trợ lý AI</button>
    </div>}
  </div>
}
