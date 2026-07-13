import { DEFAULT_MAP_CENTER } from '../../lib/googleMaps'

export type MapFocusPoint = { lat: number; lng: number; zoom?: number }

export type GuestAreaOption = {
  id: string
  label: string
  /** Keyword gửi API search rental posts */
  keyword: string
  focus: MapFocusPoint
  /** Địa chỉ / khu vực hiển thị trong gợi ý tìm kiếm */
  address?: string
  /** Mô tả ngắn: landmarks, đặc điểm khu vực */
  description?: string
  /** Nhãn phụ (vd. "Khu sinh viên", "Gần metro") */
  badge?: string
}

/** Homeji guest map chỉ phục vụ TP.HCM · Thủ Đức / khu Q.9 cũ. */
export const GUEST_CITY = {
  id: 'hcm',
  label: 'TP. Hồ Chí Minh',
} as const

export const GUEST_DISTRICTS: GuestAreaOption[] = [
  {
    id: 'thu-duc',
    label: 'Thành phố Thủ Đức',
    keyword: 'Thủ Đức',
    focus: { lat: 10.8505, lng: 106.772, zoom: 13 },
    address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Làng Đại học, Võ Văn Ngân, xa lộ Hà Nội — phòng trọ sinh viên dày đặc',
    badge: 'Khu vực chính',
  },
  {
    id: 'q9',
    label: 'Khu vực Quận 9 (cũ)',
    keyword: 'Quận 9',
    focus: { lat: 10.842, lng: 106.828, zoom: 13 },
    address: 'Quận 9 (cũ), TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'FPT, Long Thạnh Mỹ, Tăng Nhơn Phú — gần Khu CNC & ĐH FPT',
    badge: 'Khu vực chính',
  },
]

/** Phường phổ biến quanh Làng ĐH / khu sinh viên. */
export const GUEST_WARDS: Array<GuestAreaOption & { districtId: string }> = [
  {
    id: 'linh-trung',
    districtId: 'thu-duc',
    label: 'Phường Linh Trung',
    keyword: 'Linh Trung Thủ Đức',
    focus: { lat: 10.8706, lng: 106.7974, zoom: 15 },
    address: 'Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Làng ĐH, UIT, Nông Lâm — trung tâm thuê phòng sinh viên',
    badge: 'Làng Đại học',
  },
  {
    id: 'linh-xuan',
    districtId: 'thu-duc',
    label: 'Phường Linh Xuân',
    keyword: 'Linh Xuân Thủ Đức',
    focus: { lat: 10.8805, lng: 106.779, zoom: 15 },
    address: 'Phường Linh Xuân, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Gần quốc lộ 1K, KTX và phòng trọ giá mềm',
    badge: 'Phường',
  },
  {
    id: 'linh-chieu',
    districtId: 'thu-duc',
    label: 'Phường Linh Chiểu',
    keyword: 'Linh Chiểu Thủ Đức',
    focus: { lat: 10.856, lng: 106.763, zoom: 15 },
    address: 'Phường Linh Chiểu, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Võ Văn Ngân, SPKT — nhiều studio & căn hộ mini',
    badge: 'Phường',
  },
  {
    id: 'truong-tho',
    districtId: 'thu-duc',
    label: 'Phường Trường Thọ',
    keyword: 'Trường Thọ Thủ Đức',
    focus: { lat: 10.852, lng: 106.752, zoom: 15 },
    address: 'Phường Trường Thọ, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Xa lộ Hà Nội, ga metro — thuận tiện đi quận 1',
    badge: 'Gần metro',
  },
  {
    id: 'hiep-binh',
    districtId: 'thu-duc',
    label: 'Phường Hiệp Bình Phước',
    keyword: 'Hiệp Bình Phước',
    focus: { lat: 10.828, lng: 106.725, zoom: 15 },
    address: 'Phường Hiệp Bình Phước, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Sông Sài Gòn, khu dân cư yên tĩnh hơn Làng ĐH',
    badge: 'Phường',
  },
  {
    id: 'long-thanh-my',
    districtId: 'q9',
    label: 'Phường Long Thạnh Mỹ',
    keyword: 'Long Thạnh Mỹ',
    focus: { lat: 10.843, lng: 106.835, zoom: 15 },
    address: 'Phường Long Thạnh Mỹ, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Cổng ĐH FPT, Khu CNC — phòng mới, tiện ích đầy đủ',
    badge: 'Gần FPT',
  },
  {
    id: 'phuoc-long-b',
    districtId: 'q9',
    label: 'Phường Phước Long B',
    keyword: 'Phước Long B',
    focus: { lat: 10.818, lng: 106.78, zoom: 15 },
    address: 'Phường Phước Long B, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Đường Đỗ Xuân Hợp — phòng trọ & căn hộ dịch vụ',
    badge: 'Phường',
  },
  {
    id: 'tang-nhon-phu-a',
    districtId: 'q9',
    label: 'Phường Tăng Nhơn Phú A',
    keyword: 'Tăng Nhơn Phú A',
    focus: { lat: 10.845, lng: 106.795, zoom: 15 },
    address: 'Phường Tăng Nhơn Phú A, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Lê Văn Việt — giao thông thuận, nhiều nhà trọ',
    badge: 'Phường',
  },
  {
    id: 'tang-nhon-phu-b',
    districtId: 'q9',
    label: 'Phường Tăng Nhơn Phú B',
    keyword: 'Tăng Nhơn Phú B',
    focus: { lat: 10.835, lng: 106.805, zoom: 15 },
    address: 'Phường Tăng Nhơn Phú B, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Gần chợ & tiện ích quanh Lê Văn Việt',
    badge: 'Phường',
  },
  {
    id: 'long-binh',
    districtId: 'q9',
    label: 'Phường Long Bình',
    keyword: 'Long Bình Quận 9',
    focus: { lat: 10.865, lng: 106.83, zoom: 15 },
    address: 'Phường Long Bình, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Khu vực rộng, giá thuê đa dạng gần biên Hòa Lợi',
    badge: 'Phường',
  },
]

/** Fallback khi Google Places chưa sẵn sàng / lỗi quota. */
export const GUEST_SCHOOL_FALLBACK: GuestAreaOption[] = [
  {
    id: 'fpt',
    label: 'Đại học FPT TP.HCM',
    keyword: 'FPT University',
    focus: { lat: 10.8415, lng: 106.8099, zoom: 15 },
    address: 'Lô E2a-7, Đường D1, Long Thạnh Mỹ, TP. Thủ Đức',
    description: 'Khu CNC · nhiều phòng trọ / studio trong bán kính 1–2 km',
    badge: 'Đại học',
  },
  {
    id: 'uit',
    label: 'Đại học Công nghệ Thông tin (UIT)',
    keyword: 'UIT',
    focus: { lat: 10.8701, lng: 106.803, zoom: 15 },
    address: 'Khu phố 6, Linh Trung, TP. Thủ Đức',
    description: 'Làng ĐH · phòng ghép & trọ sinh viên IT phổ biến',
    badge: 'Đại học',
  },
  {
    id: 'bk',
    label: 'Đại học Bách Khoa (cơ sở 2)',
    keyword: 'Bách Khoa Thủ Đức',
    focus: { lat: 10.8413, lng: 106.8099, zoom: 15 },
    address: 'Võ Văn Ngân / khu vực Thủ Đức',
    description: 'Gần SPKT & xa lộ Hà Nội',
    badge: 'Đại học',
  },
  {
    id: 'nong-lam',
    label: 'Đại học Nông Lâm TP.HCM',
    keyword: 'Nông Lâm',
    focus: { lat: 10.8715, lng: 106.7915, zoom: 15 },
    address: 'Khu phố 6, Linh Trung, TP. Thủ Đức',
    description: 'Làng ĐH · khu trọ dày đặc quanh cổng trường',
    badge: 'Đại học',
  },
  {
    id: 'khtn',
    label: 'Đại học Khoa học Tự nhiên',
    keyword: 'Khoa học Tự nhiên Thủ Đức',
    focus: { lat: 10.875, lng: 106.799, zoom: 15 },
    address: 'Làng Đại học, Linh Trung, TP. Thủ Đức',
    description: 'Cùng cụm Làng ĐH với UIT / Nông Lâm',
    badge: 'Đại học',
  },
  {
    id: 'vlu',
    label: 'Đại học Văn Lang (cơ sở 3)',
    keyword: 'Văn Lang',
    focus: { lat: 10.855, lng: 106.786, zoom: 15 },
    address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Cơ sở 3 · phòng trọ quanh trục Võ Văn Ngân',
    badge: 'Đại học',
  },
  {
    id: 'sgu',
    label: 'Đại học Sư phạm Kỹ thuật',
    keyword: 'Sư phạm Kỹ thuật',
    focus: { lat: 10.8508, lng: 106.772, zoom: 15 },
    address: '01 Võ Văn Ngân, Linh Chiểu, TP. Thủ Đức',
    description: 'Trục Võ Văn Ngân · studio & phòng có nội thất',
    badge: 'Đại học',
  },
]

export const GUEST_DEFAULT_FOCUS: MapFocusPoint = {
  ...DEFAULT_MAP_CENTER,
  zoom: 13,
}

export function wardsForDistrict(districtId: string) {
  return GUEST_WARDS.filter((w) => w.districtId === districtId)
}

export function buildGuestSearchKeyword(parts: {
  schoolKeyword?: string
  wardKeyword?: string
  districtKeyword?: string
}) {
  return (
    parts.schoolKeyword?.trim() ||
    parts.wardKeyword?.trim() ||
    parts.districtKeyword?.trim() ||
    'Thủ Đức'
  )
}
