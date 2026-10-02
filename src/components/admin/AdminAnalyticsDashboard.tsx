import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  AdminAnalyticsTrendPoint,
  AdminAreaInsight,
  AdminPriceSignal,
  AdminProductAnalytics,
} from '../../api'
import { useGoogleMaps } from '../../contexts/GoogleMapsProvider'
import {
  DEFAULT_MAP_CENTER,
  createMapOptions,
  isValidCoord,
  loadMarkerLibrary,
} from '../../lib/googleMaps'
import { importMapsLibrary } from '../../lib/loadGoogleMaps'
import { formatPrice } from '../../lib/labels'
import './AdminAnalyticsDashboard.css'

type TrendMetric = 'searches' | 'listingViews' | 'saves' | 'viewingRequests'

const trendMetrics: Array<{ id: TrendMetric; label: string; color: string }> = [
  { id: 'searches', label: 'Lượt tìm', color: '#2563eb' },
  { id: 'listingViews', label: 'Xem tin', color: '#0f766e' },
  { id: 'saves', label: 'Lưu phòng', color: '#ca8a04' },
  { id: 'viewingRequests', label: 'Yêu cầu xem', color: '#dc2626' },
]

const signalLabels: Record<AdminPriceSignal, string> = {
  test_increase: 'Thử tăng 3–5%',
  review_decrease: 'Xem xét giảm 3–5%',
  add_supply: 'Ưu tiên thêm nguồn cung',
  hold: 'Giữ giá và theo dõi',
  insufficient_data: 'Cần thêm dữ liệu',
}

const confidenceLabels = {
  low: 'Mẫu còn ít',
  medium: 'Mẫu vừa',
  high: 'Mẫu lớn',
} as const

type Props = {
  data: AdminProductAnalytics
  days: number
  loading?: boolean
  onDaysChange: (days: number) => void
}

export function AdminAnalyticsDashboard({ data, days, loading, onDaysChange }: Props) {
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('searches')
  const [selectedAreaName, setSelectedAreaName] = useState<string | null>(
    data.areas[0]?.areaName ?? null,
  )
  const selectedArea =
    data.areas.find((area) => area.areaName === selectedAreaName) ?? data.areas[0] ?? null
  const kpis = data.kpis
  const cards = [
    {
      label: 'Người dùng',
      value: kpis.totalUsers.toLocaleString('vi-VN'),
      detail: `+${kpis.newUsers.toLocaleString('vi-VN')} trong ${days} ngày`,
    },
    {
      label: 'Tin đang hoạt động',
      value: kpis.activeListings.toLocaleString('vi-VN'),
      detail: `+${kpis.newListings.toLocaleString('vi-VN')} tin mới`,
    },
    {
      label: 'Giá thuê trung vị',
      value: formatPrice(kpis.medianMonthlyPrice),
      detail: `${formatPrice(kpis.averagePricePerSquareMeter)}/m²`,
    },
    {
      label: 'Nhu cầu tìm phòng',
      value: kpis.searches.toLocaleString('vi-VN'),
      detail: `${kpis.listingViews.toLocaleString('vi-VN')} lượt xem tin`,
    },
    {
      label: 'Tỷ lệ lưu / xem',
      value: `${kpis.saveToViewRate.toLocaleString('vi-VN')}%`,
      detail: `${kpis.saves.toLocaleString('vi-VN')} lượt lưu`,
    },
    {
      label: 'Lịch xem / lượt lưu',
      value: `${kpis.viewingRequestToSaveRate.toLocaleString('vi-VN')}%`,
      detail: `${kpis.viewingRequests.toLocaleString('vi-VN')} yêu cầu xem`,
    },
  ]

  return (
    <div className={`admin-analytics${loading ? ' is-loading' : ''}`}>
      <div className="admin-analytics__toolbar">
        <div>
          <span className="admin-analytics__eyebrow">Bảng điều hành sản phẩm</span>
          <h2>Nhu cầu, nguồn cung và tín hiệu giá theo khu vực</h2>
          <p>Dữ liệu từ hệ thống Homeji, không phải dự báo do AI tự sinh. Có thể bao gồm tin mẫu và hoạt động kiểm thử; cần đối soát trước quyết định kinh doanh.</p>
        </div>
        <div className="admin-analytics__range" role="group" aria-label="Khoảng thời gian phân tích">
          {[7, 30, 90].map((range) => (
            <button
              key={range}
              type="button"
              className={days === range ? 'is-active' : ''}
              aria-pressed={days === range}
              disabled={loading}
              onClick={() => onDaysChange(range)}
            >
              {range} ngày
            </button>
          ))}
        </div>
      </div>

      <div className="admin-analytics__kpis">
        {cards.map((card) => (
          <article key={card.label} className="admin-kpi-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.detail}</small>
          </article>
        ))}
      </div>

      <div className="admin-analytics__primary-grid">
        <section className="admin-analytics__panel admin-analytics__map-panel">
          <div className="admin-analytics__panel-heading">
            <div>
              <span className="admin-analytics__eyebrow">Ưu tiên bản đồ</span>
              <h3>Thị trường theo phường</h3>
            </div>
            <span className="admin-analytics__legend">Kích thước = số tin · màu = tín hiệu giá</span>
          </div>
          <AdminDemandMap
            areas={data.areas}
            selectedAreaName={selectedArea?.areaName ?? null}
            onSelectArea={setSelectedAreaName}
          />
          {selectedArea ? <AreaDecisionCard area={selectedArea} /> : (
            <div className="admin-analytics__empty">Chưa có tin đang hoạt động để phân tích theo khu vực.</div>
          )}
        </section>

        <section className="admin-analytics__panel admin-analytics__trend-panel">
          <div className="admin-analytics__panel-heading">
            <div>
              <span className="admin-analytics__eyebrow">Xu hướng</span>
              <h3>Biểu đồ hoạt động theo ngày</h3>
            </div>
          </div>
          <div className="admin-trend-metrics" role="group" aria-label="Chỉ số biểu đồ">
            {trendMetrics.map((metric) => (
              <button
                key={metric.id}
                type="button"
                className={trendMetric === metric.id ? 'is-active' : ''}
                aria-pressed={trendMetric === metric.id}
                onClick={() => setTrendMetric(metric.id)}
              >
                <span style={{ backgroundColor: metric.color }} />
                {metric.label}
              </button>
            ))}
          </div>
          <AdminTrendChart points={data.trend} metric={trendMetric} />
          <div className="admin-analytics__funnel" aria-label="Số hoạt động trong kỳ, không phải phễu chuyển đổi">
            <FunnelStep label="Xem tin" value={kpis.listingViews} />
            <FunnelStep label="Lưu phòng" value={kpis.saves} />
            <FunnelStep label="Yêu cầu xem" value={kpis.viewingRequests} />
          </div>
        </section>
      </div>

      <section className="admin-analytics__panel">
        <div className="admin-analytics__panel-heading">
          <div>
            <span className="admin-analytics__eyebrow">Hành động đề xuất</span>
            <h3>Khu vực cần quyết định</h3>
          </div>
          <span className="admin-analytics__legend">Tín hiệu dùng quy tắc minh bạch, không tự thay đổi giá</span>
        </div>
        <div className="admin-area-table-wrap">
          <table className="admin-area-table">
            <thead>
              <tr>
                <th>Khu vực</th>
                <th>Tin</th>
                <th>Giá trung vị</th>
                <th>Giá/m²</th>
                <th>Lưu/xem</th>
                <th>Chỉ số cầu</th>
                <th>Tín hiệu</th>
              </tr>
            </thead>
            <tbody>
              {data.areas.map((area) => (
                <tr
                  key={area.areaName}
                  className={selectedArea?.areaName === area.areaName ? 'is-selected' : ''}
                  onClick={() => setSelectedAreaName(area.areaName)}
                >
                  <td><button type="button" onClick={() => setSelectedAreaName(area.areaName)}>{area.areaName}</button><small>{confidenceLabels[area.confidence]}</small></td>
                  <td>{area.activeListings}</td>
                  <td>{formatPrice(area.medianMonthlyPrice)}</td>
                  <td>{formatPrice(area.averagePricePerSquareMeter)}</td>
                  <td>{area.saveRate.toLocaleString('vi-VN')}%</td>
                  <td>{area.demandIndex}</td>
                  <td><span className={`admin-price-signal is-${area.priceSignal}`}>{signalLabels[area.priceSignal]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <details className="admin-analytics__panel">
        <summary>Nguồn dữ liệu và cách đọc chỉ số</summary>
        <p>Tìm kiếm và xem tin chỉ ghi nhận người dùng đã đăng nhập; lượt xem không gồm chủ tin. Lượt lưu là các mục còn được lưu, tạo trong kỳ; bỏ lưu sẽ làm số này giảm. Yêu cầu xem gồm mọi trạng thái, không đồng nghĩa đã thuê thành công.</p>
        <p>Tỷ lệ lưu/xem và lịch xem/lưu là tỷ số hoạt động độc lập, có thể vượt 100%; không phải tỷ lệ chuyển đổi của cùng nhóm khách hàng. Ngày theo giờ Việt Nam; ngày hôm nay chưa hoàn tất.</p>
        <p>Nguồn cung và giá là ảnh chụp các tin đang hoạt động. Giá/m² là trung bình giá/m² của từng tin. Bản đồ hiển thị tối đa 20 khu vực có chỉ số cầu cao nhất và tọa độ hợp lệ; vị trí là tâm các tin, không phải ranh giới hành chính.</p>
        <p>Chỉ số cầu so với toàn bộ tin hoạt động: 65% tỷ số lưu/xem và 35% yêu cầu xem/tin trong kỳ, mốc 100 là trung bình, giới hạn 250. Mẫu vừa cần 4 tin và 50 lượt xem; mẫu lớn cần 8 tin và 200 lượt xem. Đây là ngưỡng vận hành, không phải kiểm định thống kê. So sánh giá giữa khu vực chưa kiểm soát chất lượng phòng; chỉ nên thử nghiệm, không tăng/giảm tự động.</p>
      </details>
      <p className="admin-analytics__updated">
        Cập nhật {new Date(data.generatedAt).toLocaleString('vi-VN')} · Tín hiệu giá chỉ dùng để thử nghiệm có kiểm soát.
      </p>
    </div>
  )
}

function AreaDecisionCard({ area }: { area: AdminAreaInsight }) {
  return (
    <div className="admin-area-decision">
      <div>
        <span className={`admin-price-signal is-${area.priceSignal}`}>{signalLabels[area.priceSignal]}</span>
        <h4>{area.areaName}</h4>
        <p>{area.recommendation}</p>
      </div>
      <dl>
        <div><dt>Chỉ số cầu</dt><dd>{area.demandIndex}</dd></div>
        <div><dt>Tin hoạt động</dt><dd>{area.activeListings}</dd></div>
        <div><dt>Giá trung vị</dt><dd>{formatPrice(area.medianMonthlyPrice)}</dd></div>
        <div><dt>Lịch xem</dt><dd>{area.viewingRequests}</dd></div>
      </dl>
    </div>
  )
}

function FunnelStep({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value.toLocaleString('vi-VN')}</strong>
    </div>
  )
}

function AdminTrendChart({
  points,
  metric,
}: {
  points: AdminAnalyticsTrendPoint[]
  metric: TrendMetric
}) {
  const width = 720
  const height = 248
  const padding = { top: 24, right: 22, bottom: 42, left: 44 }
  const metricConfig = trendMetrics.find((item) => item.id === metric) ?? trendMetrics[0]
  const values = points.map((point) => point[metric])
  const maxValue = Math.max(1, ...values)
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const coordinates = points.map((point, index) => ({
    x: padding.left + (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth),
    y: padding.top + plotHeight - (point[metric] / maxValue) * plotHeight,
    value: point[metric],
    date: point.date,
  }))
  const path = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
  const total = values.reduce((sum, value) => sum + value, 0)
  const labelIndexes = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])

  return (
    <div className="admin-trend-chart">
      <div className="admin-trend-chart__summary">
        <strong>{total.toLocaleString('vi-VN')}</strong>
        <span>{metricConfig.label.toLowerCase()} trong kỳ</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${metricConfig.label} theo ngày`}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + plotHeight * ratio
          const value = Math.round(maxValue * (1 - ratio))
          return (
            <g key={ratio}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
              <text x={padding.left - 8} y={y + 4} textAnchor="end">{value}</text>
            </g>
          )
        })}
        <path className="admin-trend-chart__area" d={`${path} L${coordinates.at(-1)?.x ?? padding.left},${padding.top + plotHeight} L${coordinates[0]?.x ?? padding.left},${padding.top + plotHeight} Z`} style={{ fill: `${metricConfig.color}18` }} />
        <path className="admin-trend-chart__line" d={path} style={{ stroke: metricConfig.color }} />
        {coordinates.map((point, index) => (
          <g key={point.date}>
            <circle cx={point.x} cy={point.y} r={point.value > 0 ? 4 : 2.5} style={{ fill: metricConfig.color }}>
              <title>{new Date(`${point.date}T00:00:00+07:00`).toLocaleDateString('vi-VN')}: {point.value}</title>
            </circle>
            {labelIndexes.has(index) ? (
              <text x={point.x} y={height - 13} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}>
                {new Date(`${point.date}T00:00:00+07:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  )
}

function AdminDemandMap({
  areas,
  selectedAreaName,
  onSelectArea,
}: {
  areas: AdminAreaInsight[]
  selectedAreaName: string | null
  onSelectArea: (areaName: string) => void
}) {
  const { apiKey, mapId, isLoaded, loadError } = useGoogleMaps()
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const fittedAreasRef = useRef<AdminAreaInsight[] | null>(null)
  const [runtimeError, setRuntimeError] = useState('')
  const validAreas = useMemo(
    () => areas.filter((area) => isValidCoord(area.latitude, area.longitude)),
    [areas],
  )

  useEffect(() => {
    if (!apiKey || !isLoaded || !hostRef.current) return
    let cancelled = false

    void (async () => {
      try {
        if (!mapRef.current) {
          const { Map } = await importMapsLibrary()
          if (cancelled || !hostRef.current) return
          mapRef.current = new Map(
            hostRef.current,
            createMapOptions(mapId, {
              center: DEFAULT_MAP_CENTER,
              zoom: 12,
              zoomControl: true,
              gestureHandling: 'cooperative',
              clickableIcons: false,
            }),
          )
        }

        const { AdvancedMarkerElement } = await loadMarkerLibrary()
        if (cancelled || !mapRef.current) return
        markersRef.current.forEach((marker) => { marker.map = null })
        markersRef.current = []
        const bounds = new google.maps.LatLngBounds()

        validAreas.forEach((area) => {
          const content = document.createElement('button')
          content.type = 'button'
          content.className = `admin-demand-pin is-${area.priceSignal}${selectedAreaName === area.areaName ? ' is-selected' : ''}`
          content.setAttribute('aria-label', `${area.areaName}, ${area.activeListings} tin, chỉ số cầu ${area.demandIndex}`)
          content.textContent = String(area.activeListings)
          content.style.setProperty('--pin-scale', String(Math.min(1.45, 0.85 + area.activeListings * 0.08)))
          const marker = new AdvancedMarkerElement({
            map: mapRef.current!,
            position: { lat: area.latitude, lng: area.longitude },
            title: area.areaName,
            content,
          })
          marker.addListener('click', () => onSelectArea(area.areaName))
          markersRef.current.push(marker)
          bounds.extend({ lat: area.latitude, lng: area.longitude })
        })

        if (!bounds.isEmpty() && fittedAreasRef.current !== validAreas) {
          mapRef.current.fitBounds(bounds, 56)
          fittedAreasRef.current = validAreas
        }
        setRuntimeError('')
      } catch (error) {
        if (!cancelled) {
          setRuntimeError(error instanceof Error ? error.message : 'Không thể tải bản đồ phân tích.')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [apiKey, isLoaded, mapId, validAreas, selectedAreaName, onSelectArea])

  useEffect(() => () => {
    markersRef.current.forEach((marker) => { marker.map = null })
    markersRef.current = []
  }, [])

  if (!apiKey || loadError || runtimeError) {
    return (
      <div className="admin-demand-map admin-analytics__empty">
        Bản đồ tạm thời không khả dụng. Bảng khu vực bên dưới vẫn dùng được.
      </div>
    )
  }

  return <div ref={hostRef} className="admin-demand-map" aria-label="Bản đồ nhu cầu thuê phòng" />
}
