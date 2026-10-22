import type { RentalPost } from '../api/types'
import type { RentalPriceBasis } from '../components/ai/rentalPriceBasis'

export const RENTAL_OWNER_DRAFT_MAX_LENGTH = 2000

type QuestionFacts = Pick<RentalPost, 'title' | 'price' | 'deposit' | 'electricityPrice' | 'waterPrice' | 'internetPrice' | 'houseRules'>
const positiveAmount = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) && value > 0
const money = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value)
const cleanText = (value: string, multiline: boolean) => Array.from(value, character => {
  const code = character.charCodeAt(0)
  if (code >= 32 && code !== 127) return character
  return multiline ? (code === 9 || code === 10 || code === 13 ? character : '') : ' '
}).join('')

/** Listing amounts have no explicit-free marker: zero remains unconfirmed. */
export function rentalOwnerQuestions(post: QuestionFacts, basis: RentalPriceBasis): string[] {
  const questions = ['Tin này hiện còn phòng hoặc chỗ ở không, và có thể vào ở từ ngày nào?']
  if (!positiveAmount(post.price)) questions.push('Giá thuê hoặc chi phí dự kiến hiện tại là bao nhiêu?')
  if (basis === 'unknown') questions.push('Giá trên tin là theo người hay cả phòng mỗi tháng, đã gồm những khoản nào?')
  else if (basis === 'person') questions.push('Chi phí dự kiến mỗi người đã gồm những khoản nào, có thay đổi theo số người ở không?')

  for (const [label, amount, usageUnit] of [
    ['Điện', post.electricityPrice, 'kWh'], ['Nước', post.waterPrice, 'm³'],
  ] as const) {
    questions.push(positiveAmount(amount)
      ? `${label} ghi ${money(amount!)} đồng trên tin: tính theo ${usageUnit}, theo người hay cả phòng mỗi tháng?`
      : `${label} tính theo ${usageUnit}, theo người hay cả phòng mỗi tháng, và đơn giá là bao nhiêu?`)
  }
  questions.push(positiveAmount(post.internetPrice)
    ? `Internet ghi ${money(post.internetPrice!)} đồng trên tin: tính theo người hay cả phòng mỗi tháng, đã nằm trong giá chưa?`
    : 'Internet đã gồm trong giá chưa; nếu chưa thì mức phí và đơn vị tính là gì?')
  questions.push(positiveAmount(post.deposit)
    ? `Tiền cọc ghi ${money(post.deposit)} đồng trên tin: kỳ thanh toán và điều kiện hoàn cọc thế nào?`
    : 'Cần cọc bao nhiêu, kỳ thanh toán và điều kiện hoàn cọc thế nào?')
  questions.push('Ngoài ra còn phí giữ xe, vệ sinh, dịch vụ hoặc phí ban đầu nào không; mức phí và cách tính cụ thể thế nào?')
  if (!post.houseRules?.trim()) questions.push('Nội quy về giờ giấc, khách đến và vật nuôi thế nào?')
  return [...new Set(questions)]
}

/** Bound handoff text as well as the textarea; do not copy address, phone or description. */
export function normalizeRentalOwnerDraft(value: string): string {
  return cleanText(value, true).slice(0, RENTAL_OWNER_DRAFT_MAX_LENGTH).trim()
}

export function buildRentalOwnerDraft(post: QuestionFacts, basis: RentalPriceBasis): string {
  const title = cleanText(post.title, false).replace(/\s+/g, ' ').trim().slice(0, 140)
  const greeting = title ? `Chào bạn, mình quan tâm tin “${title}”.` : 'Chào bạn, mình quan tâm tin của bạn.'
  return normalizeRentalOwnerDraft(`${greeting}\nMình muốn hỏi thêm trước khi sắp xếp xem:\n${rentalOwnerQuestions(post, basis).map(question => `- ${question}`).join('\n')}\nCảm ơn bạn!`)
}
