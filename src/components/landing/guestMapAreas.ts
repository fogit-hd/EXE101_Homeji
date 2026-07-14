import { DEFAULT_MAP_CENTER, MAP_FOCUS_ZOOM } from '../../lib/googleMaps'

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
  /** Phường chứa trường (dùng lọc dropdown Gần trường) */
  wardIds?: string[]
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

/** Phường TP. Thủ Đức (gồm khu Thủ Đức cũ + Q.9 cũ) — phục vụ lọc guest map. */
export const GUEST_WARDS: Array<GuestAreaOption & { districtId: string }> = [
  // --- Thủ Đức cũ ---
  {
    id: 'linh-trung',
    districtId: 'thu-duc',
    label: 'Phường Linh Trung',
    keyword: 'Linh Trung Thủ Đức',
    focus: { lat: 10.8706, lng: 106.7974, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Làng ĐH, UIT, Nông Lâm — trung tâm thuê phòng sinh viên',
    badge: 'Làng Đại học',
  },
  {
    id: 'linh-xuan',
    districtId: 'thu-duc',
    label: 'Phường Linh Xuân',
    keyword: 'Linh Xuân Thủ Đức',
    focus: { lat: 10.8805, lng: 106.779, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Linh Xuân, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Gần quốc lộ 1K, KTX và phòng trọ giá mềm',
    badge: 'Phường',
  },
  {
    id: 'linh-chieu',
    districtId: 'thu-duc',
    label: 'Phường Linh Chiểu',
    keyword: 'Linh Chiểu Thủ Đức',
    focus: { lat: 10.856, lng: 106.763, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Linh Chiểu, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Võ Văn Ngân, SPKT — nhiều studio & căn hộ mini',
    badge: 'Phường',
  },
  {
    id: 'truong-tho',
    districtId: 'thu-duc',
    label: 'Phường Trường Thọ',
    keyword: 'Trường Thọ Thủ Đức',
    focus: { lat: 10.852, lng: 106.752, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Trường Thọ, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Xa lộ Hà Nội, ga metro — thuận tiện đi quận 1',
    badge: 'Gần metro',
  },
  {
    id: 'hiep-binh-phuoc',
    districtId: 'thu-duc',
    label: 'Phường Hiệp Bình Phước',
    keyword: 'Hiệp Bình Phước',
    focus: { lat: 10.828, lng: 106.725, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Hiệp Bình Phước, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Sông Sài Gòn, khu dân cư yên tĩnh hơn Làng ĐH',
    badge: 'Phường',
  },
  {
    id: 'hiep-binh-chanh',
    districtId: 'thu-duc',
    label: 'Phường Hiệp Bình Chánh',
    keyword: 'Hiệp Bình Chánh',
    focus: { lat: 10.825, lng: 106.72, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Hiệp Bình Chánh, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Gần sông Sài Gòn, khu dân cư và tiện ích',
    badge: 'Phường',
  },
  {
    id: 'binh-chieu',
    districtId: 'thu-duc',
    label: 'Phường Bình Chiểu',
    keyword: 'Bình Chiểu Thủ Đức',
    focus: { lat: 10.885, lng: 106.73, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Bình Chiểu, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Khu vực rộng, gần quốc lộ 1K',
    badge: 'Phường',
  },
  {
    id: 'tam-binh',
    districtId: 'thu-duc',
    label: 'Phường Tam Bình',
    keyword: 'Tam Bình Thủ Đức',
    focus: { lat: 10.865, lng: 106.74, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Tam Bình, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Gần Phạm Văn Đồng, giao thông thuận',
    badge: 'Phường',
  },
  {
    id: 'tam-phu',
    districtId: 'thu-duc',
    label: 'Phường Tam Phú',
    keyword: 'Tam Phú Thủ Đức',
    focus: { lat: 10.86, lng: 106.75, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Tam Phú, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Khu dân cư, phòng trọ đa dạng mức giá',
    badge: 'Phường',
  },
  {
    id: 'binh-tho',
    districtId: 'thu-duc',
    label: 'Phường Bình Thọ',
    keyword: 'Bình Thọ Thủ Đức',
    focus: { lat: 10.848, lng: 106.765, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Bình Thọ, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Gần chợ Thủ Đức và trục Võ Văn Ngân',
    badge: 'Phường',
  },
  {
    id: 'thu-duc-ward',
    districtId: 'thu-duc',
    label: 'Phường Thủ Đức',
    keyword: 'Phường Thủ Đức',
    focus: { lat: 10.852, lng: 106.771, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Thủ Đức, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Trung tâm cũ Thủ Đức — tiện ích & giao thông',
    badge: 'Phường',
  },
  // --- Quận 9 cũ (thuộc TP Thủ Đức) ---
  {
    id: 'long-thanh-my',
    districtId: 'q9',
    label: 'Phường Long Thạnh Mỹ',
    keyword: 'Long Thạnh Mỹ',
    focus: { lat: 10.843, lng: 106.835, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Long Thạnh Mỹ, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Cổng ĐH FPT, Khu CNC — phòng mới, tiện ích đầy đủ',
    badge: 'Gần FPT',
  },
  {
    id: 'phuoc-long-a',
    districtId: 'q9',
    label: 'Phường Phước Long A',
    keyword: 'Phước Long A',
    focus: { lat: 10.822, lng: 106.76, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Phước Long A, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Gần Đỗ Xuân Hợp, khu dân cư phát triển',
    badge: 'Phường',
  },
  {
    id: 'phuoc-long-b',
    districtId: 'q9',
    label: 'Phường Phước Long B',
    keyword: 'Phước Long B',
    focus: { lat: 10.818, lng: 106.78, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Phước Long B, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Đường Đỗ Xuân Hợp — phòng trọ & căn hộ dịch vụ',
    badge: 'Phường',
  },
  {
    id: 'tang-nhon-phu-a',
    districtId: 'q9',
    label: 'Phường Tăng Nhơn Phú A',
    keyword: 'Tăng Nhơn Phú A',
    focus: { lat: 10.845, lng: 106.795, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Tăng Nhơn Phú A, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Lê Văn Việt — giao thông thuận, nhiều nhà trọ',
    badge: 'Phường',
  },
  {
    id: 'tang-nhon-phu-b',
    districtId: 'q9',
    label: 'Phường Tăng Nhơn Phú B',
    keyword: 'Tăng Nhơn Phú B',
    focus: { lat: 10.835, lng: 106.805, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Tăng Nhơn Phú B, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Gần chợ & tiện ích quanh Lê Văn Việt',
    badge: 'Phường',
  },
  {
    id: 'long-binh',
    districtId: 'q9',
    label: 'Phường Long Bình',
    keyword: 'Long Bình Quận 9',
    focus: { lat: 10.865, lng: 106.83, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Long Bình, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Khu vực rộng, giá thuê đa dạng gần biên Hòa Lợi',
    badge: 'Phường',
  },
  {
    id: 'long-phuoc',
    districtId: 'q9',
    label: 'Phường Long Phước',
    keyword: 'Long Phước Thủ Đức',
    focus: { lat: 10.852, lng: 106.86, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Long Phước, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Khu vực ven, gần các trục vành đai',
    badge: 'Phường',
  },
  {
    id: 'hiep-phu',
    districtId: 'q9',
    label: 'Phường Hiệp Phú',
    keyword: 'Hiệp Phú Thủ Đức',
    focus: { lat: 10.848, lng: 106.775, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Hiệp Phú, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Gần xa lộ Hà Nội và khu dân cư đông',
    badge: 'Phường',
  },
  {
    id: 'phu-huu',
    districtId: 'q9',
    label: 'Phường Phú Hữu',
    keyword: 'Phú Hữu Thủ Đức',
    focus: { lat: 10.795, lng: 106.805, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Phú Hữu, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Gần rạch và các khu dân cư mới',
    badge: 'Phường',
  },
  {
    id: 'tan-phu',
    districtId: 'q9',
    label: 'Phường Tân Phú',
    keyword: 'Tân Phú Quận 9',
    focus: { lat: 10.86, lng: 106.815, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Tân Phú, TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Gần Khu CNC và các trục kết nối FPT',
    badge: 'Phường',
  },
]

/** Trường gắn phường — dùng lọc “Gần trường” theo phường đã chọn. */
export const GUEST_SCHOOL_FALLBACK: GuestAreaOption[] = [
  {
    id: 'fpt',
    label: 'Đại học FPT TP.HCM',
    keyword: 'FPT University',
    focus: { lat: 10.8415, lng: 106.8099, zoom: MAP_FOCUS_ZOOM },
    address: 'Lô E2a-7, Đường D1, Long Thạnh Mỹ, TP. Thủ Đức',
    wardIds: ['long-thanh-my', 'tan-phu'],
    badge: 'Đại học',
  },
  {
    id: 'uit',
    label: 'Đại học Công nghệ Thông tin – ĐHQG TP.HCM (UIT)',
    keyword: 'UIT',
    focus: { lat: 10.8701, lng: 106.803, zoom: MAP_FOCUS_ZOOM },
    address: 'Khu phố 6, Linh Trung, TP. Thủ Đức',
    wardIds: ['linh-trung'],
    badge: 'Đại học',
  },
  {
    id: 'iu',
    label: 'Đại học Quốc tế – ĐHQG TP.HCM (IU)',
    keyword: 'Đại học Quốc tế Thủ Đức',
    focus: { lat: 10.877, lng: 106.801, zoom: MAP_FOCUS_ZOOM },
    address: 'Làng Đại học, Linh Trung, TP. Thủ Đức',
    wardIds: ['linh-trung'],
    badge: 'Đại học',
  },
  {
    id: 'bk',
    label: 'Đại học Bách khoa – ĐHQG TP.HCM (HCMUT)',
    keyword: 'Bách Khoa Thủ Đức',
    focus: { lat: 10.7725, lng: 106.659, zoom: MAP_FOCUS_ZOOM },
    address: 'Khu ĐHQG, Linh Trung / cơ sở liên quan Thủ Đức',
    wardIds: ['linh-trung'],
    badge: 'Đại học',
  },
  {
    id: 'khtn',
    label: 'Đại học Khoa học Tự nhiên – ĐHQG TP.HCM (HCMUS)',
    keyword: 'Khoa học Tự nhiên Thủ Đức',
    focus: { lat: 10.875, lng: 106.799, zoom: MAP_FOCUS_ZOOM },
    address: 'Làng Đại học, Linh Trung, TP. Thủ Đức',
    wardIds: ['linh-trung'],
    badge: 'Đại học',
  },
  {
    id: 'ussh',
    label: 'Đại học Khoa học Xã hội và Nhân văn – ĐHQG TP.HCM (USSH)',
    keyword: 'KHXHNV Thủ Đức',
    focus: { lat: 10.873, lng: 106.798, zoom: MAP_FOCUS_ZOOM },
    address: 'Làng Đại học, Linh Trung, TP. Thủ Đức',
    wardIds: ['linh-trung'],
    badge: 'Đại học',
  },
  {
    id: 'uel',
    label: 'Đại học Kinh tế – Luật – ĐHQG TP.HCM (UEL)',
    keyword: 'Kinh tế Luật Thủ Đức',
    focus: { lat: 10.876, lng: 106.802, zoom: MAP_FOCUS_ZOOM },
    address: 'Làng Đại học, Linh Trung, TP. Thủ Đức',
    wardIds: ['linh-trung'],
    badge: 'Đại học',
  },
  {
    id: 'nong-lam',
    label: 'Đại học Nông Lâm TP.HCM',
    keyword: 'Nông Lâm',
    focus: { lat: 10.8715, lng: 106.7915, zoom: MAP_FOCUS_ZOOM },
    address: 'Khu phố 6, Linh Trung, TP. Thủ Đức',
    wardIds: ['linh-trung'],
    badge: 'Đại học',
  },
  {
    id: 'hcmute',
    label: 'Đại học Sư phạm Kỹ thuật TP.HCM (HCMUTE)',
    keyword: 'Sư phạm Kỹ thuật',
    focus: { lat: 10.8508, lng: 106.772, zoom: MAP_FOCUS_ZOOM },
    address: '01 Võ Văn Ngân, Linh Chiểu, TP. Thủ Đức',
    wardIds: ['linh-chieu', 'binh-tho'],
    badge: 'Đại học',
  },
  {
    id: 'hub',
    label: 'Đại học Ngân hàng TP.HCM (cơ sở Thủ Đức)',
    keyword: 'Ngân hàng Thủ Đức',
    focus: { lat: 10.854, lng: 106.758, zoom: MAP_FOCUS_ZOOM },
    address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
    wardIds: ['truong-tho', 'linh-chieu'],
    badge: 'Đại học',
  },
  {
    id: 'utc2',
    label: 'Đại học Giao thông Vận tải TP.HCM (cơ sở Thủ Đức)',
    keyword: 'Giao thông Vận tải Thủ Đức',
    focus: { lat: 10.848, lng: 106.76, zoom: MAP_FOCUS_ZOOM },
    address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
    wardIds: ['truong-tho'],
    badge: 'Đại học',
  },
  {
    id: 'tdtt',
    label: 'Đại học Thể dục Thể thao TP.HCM',
    keyword: 'Thể dục Thể thao Thủ Đức',
    focus: { lat: 10.858, lng: 106.755, zoom: MAP_FOCUS_ZOOM },
    address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
    wardIds: ['tam-binh', 'tam-phu'],
    badge: 'Đại học',
  },
  {
    id: 'iuh',
    label: 'Đại học Công nghiệp TP.HCM (IUH)',
    keyword: 'Công nghiệp Thủ Đức',
    focus: { lat: 10.855, lng: 106.78, zoom: MAP_FOCUS_ZOOM },
    address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
    wardIds: ['linh-chieu', 'truong-tho'],
    badge: 'Đại học',
  },
  {
    id: 'hutech',
    label: 'Đại học HUTECH (cơ sở Thủ Đức)',
    keyword: 'HUTECH Thủ Đức',
    focus: { lat: 10.845, lng: 106.8, zoom: MAP_FOCUS_ZOOM },
    address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
    wardIds: ['tang-nhon-phu-a', 'hiep-phu'],
    badge: 'Đại học',
  },
  {
    id: 'ntt',
    label: 'Đại học Nguyễn Tất Thành (cơ sở Thủ Đức)',
    keyword: 'Nguyễn Tất Thành Thủ Đức',
    focus: { lat: 10.84, lng: 106.79, zoom: MAP_FOCUS_ZOOM },
    address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
    wardIds: ['phuoc-long-b', 'tang-nhon-phu-b'],
    badge: 'Đại học',
  },
  {
    id: 'vlu',
    label: 'Đại học Văn Lang (cơ sở Thủ Đức)',
    keyword: 'Văn Lang Thủ Đức',
    focus: { lat: 10.855, lng: 106.786, zoom: MAP_FOCUS_ZOOM },
    address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
    wardIds: ['linh-chieu', 'truong-tho'],
    badge: 'Đại học',
  },
  {
    id: 'giadinh',
    label: 'Đại học Gia Định',
    keyword: 'Gia Định Thủ Đức',
    focus: { lat: 10.83, lng: 106.73, zoom: MAP_FOCUS_ZOOM },
    address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
    wardIds: ['hiep-binh-chanh', 'hiep-binh-phuoc'],
    badge: 'Đại học',
  },
  {
    id: 'ueh',
    label: 'Đại học Kinh tế TP.HCM (UEH) – cơ sở Thủ Đức',
    keyword: 'UEH Thủ Đức',
    focus: { lat: 10.85, lng: 106.77, zoom: MAP_FOCUS_ZOOM },
    address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
    wardIds: ['linh-chieu', 'binh-tho'],
    badge: 'Đại học',
  },
  {
    id: 'ptit',
    label: 'Học viện Công nghệ Bưu chính Viễn thông (phía Nam)',
    keyword: 'Bưu chính Viễn thông Thủ Đức',
    focus: { lat: 10.852, lng: 106.77, zoom: MAP_FOCUS_ZOOM },
    address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
    wardIds: ['linh-chieu', 'truong-tho'],
    badge: 'Học viện',
  },
  {
    id: 'thpt-thu-duc',
    label: 'THPT Thủ Đức',
    keyword: 'THPT Thủ Đức',
    focus: { lat: 10.851, lng: 106.772, zoom: MAP_FOCUS_ZOOM },
    address: 'Phường Thủ Đức, TP. Thủ Đức',
    wardIds: ['thu-duc-ward', 'binh-tho'],
    badge: 'THPT',
  },
  {
    id: 'thpt-nhh',
    label: 'THPT Nguyễn Hữu Huân',
    keyword: 'THPT Nguyễn Hữu Huân',
    focus: { lat: 10.86, lng: 106.76, zoom: MAP_FOCUS_ZOOM },
    address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
    wardIds: ['tam-binh', 'tam-phu'],
    badge: 'THPT',
  },
  {
    id: 'thpt-dvt',
    label: 'THPT Dương Văn Thì',
    keyword: 'THPT Dương Văn Thì',
    focus: { lat: 10.875, lng: 106.78, zoom: MAP_FOCUS_ZOOM },
    address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
    wardIds: ['linh-xuan', 'linh-trung'],
    badge: 'THPT',
  },
  {
    id: 'thpt-pl',
    label: 'THPT Phước Long',
    keyword: 'THPT Phước Long',
    focus: { lat: 10.82, lng: 106.775, zoom: MAP_FOCUS_ZOOM },
    address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
    wardIds: ['phuoc-long-a', 'phuoc-long-b'],
    badge: 'THPT',
  },
  {
    id: 'thpt-ltm',
    label: 'THPT Long Thạnh Mỹ',
    keyword: 'THPT Long Thạnh Mỹ',
    focus: { lat: 10.842, lng: 106.83, zoom: MAP_FOCUS_ZOOM },
    address: 'Long Thạnh Mỹ, TP. Thủ Đức',
    wardIds: ['long-thanh-my'],
    badge: 'THPT',
  },
  {
    id: 'thpt-lvv',
    label: 'THPT Lê Văn Việt',
    keyword: 'THPT Lê Văn Việt',
    focus: { lat: 10.84, lng: 106.8, zoom: MAP_FOCUS_ZOOM },
    address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
    wardIds: ['tang-nhon-phu-a', 'tang-nhon-phu-b'],
    badge: 'THPT',
  },
  {
    id: 'thpt-nvt',
    label: 'THPT Nguyễn Văn Tăng',
    keyword: 'THPT Nguyễn Văn Tăng',
    focus: { lat: 10.835, lng: 106.81, zoom: MAP_FOCUS_ZOOM },
    address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
    wardIds: ['tang-nhon-phu-b', 'long-binh'],
    badge: 'THPT',
  },
  {
    id: 'thpt-got',
    label: 'THPT Giồng Ông Tố',
    keyword: 'THPT Giồng Ông Tố',
    focus: { lat: 10.8, lng: 106.75, zoom: MAP_FOCUS_ZOOM },
    address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
    wardIds: ['phu-huu'],
    badge: 'THPT',
  },
]

export const GUEST_DEFAULT_FOCUS: MapFocusPoint = {
  ...DEFAULT_MAP_CENTER,
  zoom: 13,
}

/** TP Thủ Đức: hiện toàn bộ phường; Q.9 (cũ): chỉ phường thuộc khu đó. */
export function wardsForDistrict(districtId: string) {
  if (districtId === 'thu-duc') return GUEST_WARDS
  return GUEST_WARDS.filter((w) => w.districtId === districtId)
}

export function schoolsForWard(
  schools: GuestAreaOption[],
  wardId: string,
): GuestAreaOption[] {
  if (!wardId) return schools
  return schools.filter((s) => s.wardIds?.includes(wardId))
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
