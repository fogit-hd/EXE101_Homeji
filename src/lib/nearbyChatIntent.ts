import type { NearbyPlaceCategory } from './placeAutocomplete'

export function nearbyChatIntent(text: string): NearbyPlaceCategory | null {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
  if (!/phong nay|ghim nay|o day/.test(normalized)) return null
  if (/nha thuoc|hieu thuoc/.test(normalized)) return 'pharmacy'
  if (/ca phe.*hoc|cafe.*hoc/.test(normalized)) return 'studyCafe'
  if (/ca phe|cafe/.test(normalized)) return 'cafe'
  if (/cua hang|tap hoa|sieu thi/.test(normalized)) return 'grocery'
  if (/quan an|do an|an uong/.test(normalized)) return 'food'
  if (/benh vien|y te/.test(normalized)) return 'health'
  return null
}
