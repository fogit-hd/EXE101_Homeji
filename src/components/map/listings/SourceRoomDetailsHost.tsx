import { useSearchParams } from 'react-router-dom'
import { SourceRoomDetail } from './SourceRoomDetail'

export function SourceRoomDetailsHost() {
  const [params, setParams] = useSearchParams()
  const id = params.get('source')
  if (!id || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id)) return null
  return <SourceRoomDetail key={id} id={id} onClose={() => { const next = new URLSearchParams(params); next.delete('source'); setParams(next, { replace: true }) }} />
}
