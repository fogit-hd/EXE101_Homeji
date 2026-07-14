/** Trường đại học / cao đẳng / THPT tại TP. Thủ Đức (HCM). */
export const THU_DUC_SCHOOLS = [
  'Đại học FPT TP.HCM',
  'Đại học Công nghệ Thông tin – ĐHQG TP.HCM (UIT)',
  'Đại học Quốc tế – ĐHQG TP.HCM (IU)',
  'Đại học Bách khoa – ĐHQG TP.HCM (HCMUT)',
  'Đại học Khoa học Tự nhiên – ĐHQG TP.HCM (HCMUS)',
  'Đại học Khoa học Xã hội và Nhân văn – ĐHQG TP.HCM (USSH)',
  'Đại học Kinh tế – Luật – ĐHQG TP.HCM (UEL)',
  'Đại học Nông Lâm TP.HCM',
  'Đại học Sư phạm Kỹ thuật TP.HCM (HCMUTE)',
  'Đại học Ngân hàng TP.HCM (cơ sở Thủ Đức)',
  'Đại học Giao thông Vận tải TP.HCM (cơ sở Thủ Đức)',
  'Đại học Thể dục Thể thao TP.HCM',
  'Đại học Công nghiệp TP.HCM (IUH)',
  'Đại học HUTECH (cơ sở Thủ Đức)',
  'Đại học Nguyễn Tất Thành (cơ sở Thủ Đức)',
  'Đại học Văn Lang (cơ sở Thủ Đức)',
  'Đại học Gia Định',
  'Đại học Kinh tế TP.HCM (UEH) – cơ sở Thủ Đức',
  'Học viện Công nghệ Bưu chính Viễn thông (cơ sở phía Nam)',
  'Cao đẳng Kỹ thuật Cao Thắng (cơ sở Thủ Đức)',
  'Cao đẳng Công thương TP.HCM',
  'Cao đẳng Kinh tế Đối ngoại',
  'Cao đẳng Viễn Đông',
  'Trường Quốc tế Việt Úc (VAS) – cơ sở Thủ Đức',
  'THPT Thủ Đức',
  'THPT Nguyễn Hữu Huân',
  'THPT Dương Văn Thì',
  'THPT Phước Long',
  'THPT Long Thạnh Mỹ',
  'THPT Lê Văn Việt',
  'THPT Nguyễn Văn Tăng',
  'THPT Giồng Ông Tố',
] as const

export type ThuDucSchool = (typeof THU_DUC_SCHOOLS)[number]

/** Map saved school to a dropdown value; unknown legacy values fall back to empty. */
export function resolveSchoolSelectValue(school: string): string {
  const trimmed = school.trim()
  if (!trimmed) return ''
  return (THU_DUC_SCHOOLS as readonly string[]).includes(trimmed) ? trimmed : ''
}
