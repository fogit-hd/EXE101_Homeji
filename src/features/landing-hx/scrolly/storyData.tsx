import { BookOpen, Camera, IdCard, Moon, ReceiptText, UtensilsCrossed, Volume1 } from 'lucide-react'
import { DISTRICT_OPTIONS } from '../../../lib/mock/homeji'

/** Illustrative data shared by the desktop story and the phone story. */
export const QUERY = 'Gần ĐH SPKT'
export const RESULTS = [
  { title: 'Phòng 16 m², có gác', where: 'Linh Trung, Thủ Đức', walk: '8 phút đi bộ', price: '2,5 triệu' },
  { title: 'Phòng 20 m², cửa sổ', where: 'Linh Chiểu, Thủ Đức', walk: '11 phút đi bộ', price: '2,8 triệu' },
  { title: 'Phòng 14 m², ban công', where: 'Bình Thọ, Thủ Đức', walk: '6 phút đi bộ', price: '2,3 triệu' },
]
export const BILL = [
  { label: 'Tiền phòng', amount: 2500000, note: '/tháng' },
  { label: 'Điện', amount: 3500, note: '/kWh', hot: true },
  { label: 'Nước', amount: 100000, note: '/người' },
  { label: 'Wifi', amount: 100000, note: '/phòng' },
  { label: 'Giữ xe', amount: 50000, note: '/xe' },
]
export const money = (n: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n))}đ`
/** The areas Homeji lists rooms in, for the band that runs past chapter 01. */
export const AREAS = DISTRICT_OPTIONS.filter(option => option.value).map(option => option.label)
export const CHECKS = [
  { icon: <IdCard aria-hidden="true" />, title: 'CCCD chủ nhà', body: 'Đối chiếu CCCD với người đăng tin.' },
  { icon: <Camera aria-hidden="true" />, title: 'Ảnh tại phòng', body: 'Chụp tại phòng, không dùng ảnh mạng.' },
  { icon: <ReceiptText aria-hidden="true" />, title: 'Giá đủ khoản', body: 'Điện, nước, wifi, giữ xe ghi rõ từng số.' },
]
/**
 * Chapter 04: two roommates' days on a 24-hour track (hours, illustrative). A block that crosses
 * midnight is split in two. The shared moments are what the match is made on.
 */
export type Slot = { kind: 'sleep' | 'study' | 'cook' | 'quiet'; from: number; to: number }
export const DAYS: { name: string; who: string; slots: Slot[] }[] = [
  { name: 'An', who: 'SV năm 2, SPKT', slots: [
    { kind: 'sleep', from: 0, to: 6 }, { kind: 'study', from: 7.5, to: 11.5 }, { kind: 'study', from: 13, to: 16.5 },
    { kind: 'cook', from: 18, to: 19.25 }, { kind: 'quiet', from: 20.5, to: 22.75 }, { kind: 'sleep', from: 22.75, to: 24 },
  ] },
  { name: 'Bình', who: 'SV năm 2, SPKT', slots: [
    { kind: 'sleep', from: 0, to: 6.5 }, { kind: 'study', from: 8, to: 11 }, { kind: 'study', from: 14, to: 17.5 },
    { kind: 'cook', from: 18.25, to: 19.5 }, { kind: 'quiet', from: 21, to: 22.5 }, { kind: 'sleep', from: 22.5, to: 24 },
  ] },
]
export const KINDS = [
  { kind: 'sleep', label: 'Ngủ', icon: <Moon aria-hidden="true" /> },
  { kind: 'study', label: 'Đi học', icon: <BookOpen aria-hidden="true" /> },
  { kind: 'cook', label: 'Nấu ăn', icon: <UtensilsCrossed aria-hidden="true" /> },
  { kind: 'quiet', label: 'Giờ yên tĩnh', icon: <Volume1 aria-hidden="true" /> },
] as const
/** The stretches of the day the two share: what chapter 04 numbers on the dial. */
export const SHARED = [
  { from: 18.25, to: 19.25, time: '18:15', label: 'Cùng nấu bữa tối' },
  { from: 21, to: 22.5, time: '21:00', label: 'Cùng giờ yên tĩnh' },
  { from: 22.75, to: 24, time: '22:45', label: 'Cùng ngủ trước 23h' },
]
/** The clock hand sweeps from 6:00 to 23:30. */
export const DAY_FROM = 6
export const DAY_TO = 23.5
/** How far through the 6:00 → 23:30 sweep an hour falls, 0 to 1. */
export const sweep = (hour: number) => Math.min(Math.max((hour - DAY_FROM) / (DAY_TO - DAY_FROM), 0), 1)
export const clock = (hour: number) => `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.floor(((hour % 1) * 60) / 15) * 15).padStart(2, '0')}`
export const CHAPTERS = ['Tìm theo trường', 'Giá minh bạch', 'Xác minh', 'Ở ghép', 'Về phòng']


/** Chapter 04's dial, in degrees clockwise from the top: 12h at 0°, 18h at 90°, midnight at 180°, 6h at 270°. */
export const dialAngle = (hour: number) => ((hour - 12) / 24) * 360
