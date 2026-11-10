import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { getDeviceLocation, DeviceLocationError } from '../../lib/geolocation'
import { createMapOptions, createStyledPin, geocodeAddress, getGoogleMapsApiKey, isValidCoord, selectedPinStyle, userPinStyle } from '../../lib/googleMaps'
import { importMapsLibrary, importMarkerLibrary, loadGoogleMaps } from '../../lib/loadGoogleMaps'
import { computeDrivingRoute, maneuverGlyph, type MapRouteSummary } from '../../lib/mapRoutes'
import { isGuestCoastPaused, pauseGuestCoast, resumeGuestCoast } from './guestCoast'
import './RoomDirectionsDialog.css'

type Point = { lat: number; lng: number }
type Props = {
  title: string
  address: string
  /** Room coordinates when the listing has them; otherwise the address is geocoded. */
  destination: Point | null
  onClose: () => void
}
type Status =
  | { kind: 'map' }
  | { kind: 'locating' }
  | { kind: 'routing' }
  | { kind: 'ready'; route: MapRouteSummary; originLabel: string }
  | { kind: 'need-origin'; message: string }
  | { kind: 'error'; message: string }

const point = (value: Point | null | undefined): Point | null =>
  value && isValidCoord(value.lat, value.lng) && (value.lat !== 0 || value.lng !== 0) ? value : null

/** Directions to a room drawn on a Homeji map, without leaving the site. */
export function RoomDirectionsDialog({ title, address, destination, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const mapNode = useRef<HTMLDivElement>(null)
  const map = useRef<google.maps.Map | null>(null)
  const target = useRef<Point | null>(point(destination))
  const overlays = useRef<{ lines: google.maps.Polyline[]; markers: google.maps.marker.AdvancedMarkerElement[] }>({ lines: [], markers: [] })
  const request = useRef(0)
  const [status, setStatus] = useState<Status>({ kind: 'map' })
  const [origin, setOrigin] = useState('')
  const titleId = useId()
  const originId = useId()

  // The landing page's auto-scrolling strip pauses while the dialog is open.
  useEffect(() => {
    const wasPaused = isGuestCoastPaused()
    pauseGuestCoast()
    dialog.current?.showModal()
    return () => { if (!wasPaused) resumeGuestCoast() }
  }, [])

  const clearRoute = () => {
    overlays.current.lines.forEach(line => line.setMap(null))
    overlays.current.markers.forEach(marker => { marker.map = null })
    overlays.current = { lines: [], markers: [] }
  }

  const drawRoute = async (from: Point, originLabel: string) => {
    const to = target.current
    const current = ++request.current
    if (!to || !map.current) return
    setStatus({ kind: 'routing' })
    try {
      const result = await computeDrivingRoute(from, to, { trafficAware: true, mode: 'preview' })
      if (current !== request.current || !map.current) return
      clearRoute()
      const lines = result.route.createPolylines({ polylineOptions: { strokeColor: '#0f9488', strokeOpacity: .92, strokeWeight: 6, zIndex: 4 } })
      lines.forEach(line => line.setMap(map.current))
      const { AdvancedMarkerElement, PinElement } = await importMarkerLibrary()
      const markers = [
        new AdvancedMarkerElement({ map: map.current, position: from, title: originLabel, content: createStyledPin(PinElement, userPinStyle()).element }),
        new AdvancedMarkerElement({ map: map.current, position: to, title, content: createStyledPin(PinElement, selectedPinStyle()).element }),
      ]
      overlays.current = { lines, markers }
      if (result.viewport) map.current.fitBounds(result.viewport, 56)
      setStatus({ kind: 'ready', route: result, originLabel })
    } catch {
      if (current === request.current) setStatus({ kind: 'need-origin', message: 'Chưa tìm được đường đi từ vị trí này. Thử nhập một điểm xuất phát khác.' })
    }
  }

  const locate = async () => {
    const current = ++request.current
    setStatus({ kind: 'locating' })
    try {
      const here = await getDeviceLocation({ fast: true })
      if (current === request.current) await drawRoute({ lat: here.lat, lng: here.lng }, 'Vị trí của bạn')
    } catch (error) {
      if (current !== request.current) return
      const message = error instanceof DeviceLocationError && error.code === 'denied'
        ? 'Bạn chưa cho phép quyền vị trí. Nhập điểm xuất phát, ví dụ tên trường hoặc địa chỉ.'
        : 'Chưa lấy được vị trí của bạn. Nhập điểm xuất phát để xem đường đi.'
      setStatus({ kind: 'need-origin', message })
    }
  }

  // Load the map once, place the room, then try the visitor's location.
  useEffect(() => {
    let cancelled = false
    const apiKey = getGoogleMapsApiKey()
    void (async () => {
      try {
        await loadGoogleMaps(apiKey)
        const { Map } = await importMapsLibrary()
        if (cancelled || !mapNode.current) return
        target.current ??= point(await geocodeAddress(address))
        if (cancelled) return
        if (!target.current) { setStatus({ kind: 'error', message: 'Tin này chưa có vị trí rõ ràng nên chưa chỉ đường được.' }); return }
        map.current = new Map(mapNode.current, createMapOptions(undefined, { center: target.current, zoom: 15, gestureHandling: 'cooperative', clickableIcons: false, zoomControl: true }))
        void locate()
      } catch {
        if (!cancelled) setStatus({ kind: 'error', message: apiKey ? 'Không tải được bản đồ. Vui lòng thử lại sau.' : 'Bản đồ chưa được cấu hình trên trang này.' })
      }
    })()
    // Bumping the counter makes any in-flight locate or route result ignore itself.
    const requests = request
    return () => { cancelled = true; requests.current++; clearRoute() }
    // Runs once per opened dialog; the room cannot change while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submitOrigin = async (event: FormEvent) => {
    event.preventDefault()
    const text = origin.trim()
    if (!text || !map.current) return
    const current = ++request.current
    setStatus({ kind: 'routing' })
    const found = await geocodeAddress(text.length < 6 ? `${text}, TP. Hồ Chí Minh` : text)
    if (current !== request.current) return
    if (!found) { setStatus({ kind: 'need-origin', message: 'Không tìm thấy địa điểm này. Thử ghi rõ hơn, ví dụ "ĐH Kinh tế - Luật, Thủ Đức".' }); return }
    await drawRoute({ lat: found.lat, lng: found.lng }, found.formattedAddress)
  }

  const busy = status.kind === 'map' || status.kind === 'locating' || status.kind === 'routing'
  return createPortal(
    <dialog ref={dialog} className="room-directions" aria-labelledby={titleId} data-glass-exclude=""
      onCancel={event => { event.preventDefault(); onClose() }}
      onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <header className="room-directions__header">
        <div>
          <p>Chỉ đường tới phòng</p>
          <h2 id={titleId}>{title}</h2>
          <span>{address || 'Chưa có địa chỉ'}</span>
        </div>
        <button type="button" className="room-directions__close" onClick={onClose} aria-label="Đóng chỉ đường">×</button>
      </header>
      <div className="room-directions__map" aria-hidden="true">
        <div ref={mapNode} />
        {busy ? <span className="room-directions__busy">{status.kind === 'locating' ? 'Đang lấy vị trí của bạn…' : status.kind === 'routing' ? 'Đang tìm đường…' : 'Đang tải bản đồ…'}</span> : null}
      </div>
      <div className="room-directions__body" data-lenis-prevent="">
        <p className="room-directions__status" role="status">
          {status.kind === 'ready' ? null : status.kind === 'need-origin' || status.kind === 'error' ? status.message : null}
        </p>
        {status.kind === 'ready' ? <>
          <div className="room-directions__summary">
            <strong>{status.route.durationText}</strong>
            <span>{status.route.distanceText}</span>
            <small>Lái xe từ {status.originLabel}{status.route.trafficAware ? ', đã tính tình trạng giao thông' : ''}</small>
          </div>
          {status.route.steps.length ? <ol className="room-directions__steps" aria-label="Các bước đi">
            {status.route.steps.map((step, index) => <li key={index}>
              <span aria-hidden="true">{maneuverGlyph(step.maneuver)}</span>
              <p>{step.instruction}</p>
              <small>{step.distanceText}</small>
            </li>)}
          </ol> : null}
        </> : null}
        {status.kind !== 'error' ? <form className="room-directions__origin" onSubmit={event => void submitOrigin(event)}>
          <label htmlFor={originId}>{status.kind === 'need-origin' ? 'Điểm xuất phát' : 'Đi từ nơi khác?'}</label>
          <div>
            <input id={originId} className="form-input" value={origin} maxLength={160} onChange={event => setOrigin(event.target.value)} placeholder="Tên trường, ký túc xá hoặc địa chỉ" autoComplete="off" enterKeyHint="go" />
            <button type="submit" className="btn btn-primary" disabled={busy || !origin.trim()}>Tìm đường</button>
          </div>
          <button type="button" className="room-directions__locate" disabled={busy} onClick={() => void locate()}>Dùng vị trí hiện tại của tôi</button>
        </form> : null}
      </div>
    </dialog>,
    document.body,
  )
}
