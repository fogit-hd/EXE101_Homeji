/**
 * Fallback data and option definitions for the guest landing.
 * Real listings are fetched from the public API when available; these entries
 * serve as an offline/dev fallback only.
 */

export type ListingKind = 'room' | 'roommate'
export type ListingTag = 'verified' | 'available' | 'roommate' | 'new'

export type Listing = {
  id: string
  kind: ListingKind
  title: string
  /** VND per month. */
  price: number
  /** Square metres. */
  area: number
  /** Short address: street, ward/district. */
  address: string
  district: string
  tags: ListingTag[]
  image: ListingImage
  owner: { name: string; role: 'Chủ trọ' | 'Người tìm ở ghép' }
  /** Optional link to the live listing detail view. */
  href?: string
}

export type StoryChapter = {
  id: 'lost' | 'verified' | 'match' | 'home'
  title: string
  body: string
}

export type HowStep = { title: string; body: string }

export type FooterColumn = {
  title: string
  links: { label: string; to: string }[]
}

export type Option = { value: string; label: string }

export type ListingImage = {
  /** Full-size WebP. */
  src: string
  /** Half-size WebP for 1x screens and small slots. */
  srcSmall: string
  width: number
  height: number
  alt: string
}

/**
 * MẪU: every listing photo is an AI-generated stand-in, one per listing and matched to
 * its room type (provenance in public/landing/hero/README.md and public/landing/listings/README.md).
 * Swap in the owner's real photos once listings come from the API.
 */
function photo(dir: 'hero' | 'listings' | 'diorama', name: string, width: number, height: number, alt: string): ListingImage {
  return {
    src: `/landing/${dir}/${name}-${width}.webp`,
    srcSmall: `/landing/${dir}/${name}-${width / 2}.webp`,
    width,
    height,
    alt,
  }
}

/**
 * Blender stills of the story's sets, all Poly Haven CC0 models on one plinth
 * (provenance in public/landing/diorama/README.md). On wide screens the acts
 * scrub through the rendered sequence instead; these stand in on phones,
 * tablets and with reduced motion. `room` is the hero.
 */
export type DioramaState = 'room' | 'street' | 'tea' | 'night'

export const DIORAMA: Record<DioramaState, ListingImage> = {
  room: photo('diorama', 'room-found', 1600, 1376, 'Mô hình 3D một phòng trọ ở TP.HCM: giường sắt đơn, bàn học có laptop và đèn cạnh cửa sổ song sắt, ghế nhựa, ấm đun nước và đồng hồ treo tường.'),
  street: photo('diorama', 'set-street', 1280, 1100, 'Góc vỉa hè dưới cột đèn đường: hai chiếc vali cũ, vài thùng carton và bốt điện thoại công cộng trên bức tường trống.'),
  tea: photo('diorama', 'set-tea', 1280, 1100, 'Bàn gỗ nhỏ với ấm trà và hai tách, hai ghế nhựa kê đối diện nhau trên tấm chiếu.'),
  night: photo('diorama', 'room-night', 1280, 1100, 'Căn phòng trọ buổi tối, đèn vàng ấm và đèn bàn bật sáng, đã có người dọn vào ở.'),
}

export const DISTRICT_OPTIONS: Option[] = [
  { value: '', label: 'Tất cả khu vực' },
  { value: 'thu-duc', label: 'TP. Thủ Đức' },
  { value: 'quan-9', label: 'Quận 9 (cũ)' },
  { value: 'binh-thanh', label: 'Bình Thạnh' },
  { value: 'go-vap', label: 'Gò Vấp' },
  { value: 'quan-7', label: 'Quận 7' },
]

export const PRICE_OPTIONS: Option[] = [
  { value: '', label: 'Mọi mức giá' },
  { value: '0-2000000', label: 'Dưới 2 triệu' },
  { value: '2000000-3500000', label: '2 – 3,5 triệu' },
  { value: '3500000-5000000', label: '3,5 – 5 triệu' },
  { value: '5000000-', label: 'Trên 5 triệu' },
]

export const LISTINGS: Listing[] = [
  {
    id: 'l-studio',
    kind: 'room',
    title: 'Studio cửa sổ lớn, có góc làm việc',
    price: 5_200_000,
    area: 25,
    address: 'Đường Điện Biên Phủ, Phường 25',
    district: 'Bình Thạnh',
    tags: ['verified', 'available'],
    image: photo('hero', 'studio', 1024, 1280, 'Phòng studio sáng, giường đôi trải ga màu be, bàn học cạnh cửa sổ lớn nhìn ra mái nhà và cây xanh'),
    owner: { name: 'Chị Hạnh', role: 'Chủ trọ' },
  },
  {
    id: 'l-shared',
    kind: 'roommate',
    title: 'Căn hộ ở ghép còn 1 chỗ, ban công nhiều cây',
    price: 2_900_000,
    area: 30,
    address: 'Đường Nguyễn Thị Thập, Phường Tân Phú',
    district: 'Quận 7',
    tags: ['roommate', 'verified'],
    image: photo('hero', 'shared', 1280, 1024, 'Phòng khách căn hộ ở ghép với sofa xanh rêu, bàn trà gỗ và cửa ban công đầy cây'),
    owner: { name: 'Thảo Vy', role: 'Người tìm ở ghép' },
  },
  {
    id: 'l-kitchen',
    kind: 'room',
    title: 'Phòng có bếp riêng, nắng chiều',
    price: 4_100_000,
    area: 22,
    address: 'Đường Phan Văn Trị, Phường 5',
    district: 'Gò Vấp',
    tags: ['verified', 'new'],
    image: photo('hero', 'kitchen', 1024, 1024, 'Góc bếp nhỏ tủ trắng, bếp từ hai vùng nấu và bàn ăn tròn cạnh cửa sổ nắng chiều'),
    owner: { name: 'Anh Phúc', role: 'Chủ trọ' },
  },
  {
    id: 'l-01',
    kind: 'room',
    title: 'Phòng ban công kính gần Làng Đại học',
    price: 2_800_000,
    area: 22,
    address: 'Đường Tô Vĩnh Diện, Linh Trung',
    district: 'TP. Thủ Đức',
    tags: ['verified', 'available'],
    image: photo('listings', 'balcony', 1280, 960, 'Phòng trọ sàn gạch trắng, giường đơn ga xanh, bàn học nhỏ và cửa kính lùa ra ban công có giàn phơi đồ'),
    owner: { name: 'Cô Lan', role: 'Chủ trọ' },
  },
  {
    id: 'l-02',
    kind: 'roommate',
    title: 'Tìm 1 bạn nữ ở ghép, phòng nhìn ra sân vườn',
    price: 1_900_000,
    area: 28,
    address: 'Đường Lê Văn Việt, Hiệp Phú',
    district: 'Quận 9 (cũ)',
    tags: ['roommate', 'new'],
    image: photo('listings', 'garden-shared', 1280, 960, 'Phòng ở ghép hai giường đơn ga hồng, tủ gỗ chung, sàn gạch đỏ và cửa sổ nhìn ra vườn có cây chuối'),
    owner: { name: 'Minh Thư', role: 'Người tìm ở ghép' },
  },
  {
    id: 'l-03',
    kind: 'room',
    title: 'Phòng gác lửng có bếp nhỏ gần ĐH FPT',
    price: 3_500_000,
    area: 25,
    address: 'Đường D1, Phường Long Thạnh Mỹ',
    district: 'TP. Thủ Đức',
    tags: ['verified', 'available'],
    image: photo('listings', 'loft-studio', 1280, 960, 'Phòng có gác lửng thang sắt, bên dưới là bếp nhỏ, tủ lạnh, bàn gấp hai ghế đẩu và cửa sổ khung sắt'),
    owner: { name: 'Anh Tuấn', role: 'Chủ trọ' },
  },
  {
    id: 'l-04',
    kind: 'roommate',
    title: 'Ở ghép phòng rộng gần chợ Thủ Đức',
    price: 2_200_000,
    area: 32,
    address: 'Đường Võ Văn Ngân, Phường Linh Chiểu',
    district: 'TP. Thủ Đức',
    tags: ['roommate', 'verified'],
    image: photo('listings', 'twin-desks', 1280, 960, 'Phòng rộng cho hai người với hai giường ga xám, hai bàn học dưới cửa sổ lớn, tủ áo trắng và quạt trần'),
    owner: { name: 'Bảo Ngọc', role: 'Người tìm ở ghép' },
  },
  {
    id: 'l-08',
    kind: 'roommate',
    title: 'Ở ghép gần ĐH Công nghiệp, giờ giấc tự do',
    price: 1_800_000,
    area: 26,
    address: 'Đường Quang Trung, Phường 10',
    district: 'Gò Vấp',
    tags: ['roommate', 'available'],
    image: photo('listings', 'loft-shared', 1280, 960, 'Phòng trọ có gác gỗ đặt hai nệm, bên dưới kệ nhỏ, quạt đứng, giá treo đồ và cửa sổ lá sách'),
    owner: { name: 'Lan Anh', role: 'Người tìm ở ghép' },
  },
]

export const STORY: StoryChapter[] = [
  {
    id: 'lost',
    title: 'Loay hoay giữa vô số tin trọ ảo',
    body: 'Tuần đầu lên thành phố, An lướt hàng chục nhóm cho thuê. Ảnh đẹp, giá rẻ, nhưng gọi tới thì phòng đã “vừa có người cọc”.',
  },
  {
    id: 'verified',
    title: 'Lọc nhanh, chỉ thấy tin đã xác minh',
    body: 'Trên Homeji, An chọn khu vực gần trường và mức giá. Tin hiện ra đều có huy hiệu chủ nhà đã xác minh, ảnh thật, giá rõ.',
  },
  {
    id: 'match',
    title: 'Ghép được bạn cùng phòng hợp nhịp sống',
    body: 'An muốn chia tiền phòng. Homeji gợi ý những bạn có giờ giấc, thói quen và ngân sách gần giống, rồi để hai người tự trò chuyện.',
  },
  {
    id: 'home',
    title: 'Dọn vào ở, nhận chìa khóa',
    body: 'Hẹn xem phòng, hỏi đủ các khoản phí, rồi nhận chìa khóa. Căn phòng sáng đèn đầu tiên ở thành phố mới là của An.',
  },
]

export const HOW_IT_WORKS: Record<'seeker' | 'poster', HowStep[]> = {
  seeker: [
    { title: 'Chọn khu vực và ngân sách', body: 'Chọn quận gần nơi bạn học hoặc làm, rồi chọn khoảng giá và loại phòng.' },
    { title: 'Xem tin đã xác minh', body: 'So sánh ảnh thật, diện tích, chi phí và khoảng cách trước khi liên hệ.' },
    { title: 'Nhắn tin và hẹn xem phòng', body: 'Trao đổi với chủ trọ hoặc bạn ở ghép ngay trên Homeji, rồi hẹn lịch xem.' },
  ],
  poster: [
    { title: 'Tạo tài khoản và xác minh', body: 'Xác minh chính chủ để tin của bạn có huy hiệu đáng tin.' },
    { title: 'Đăng tin với ảnh thật', body: 'Thêm ảnh, giá, diện tích và các khoản phí. Tin được duyệt trước khi hiển thị.' },
    { title: 'Nhận tin nhắn và lịch hẹn', body: 'Người thuê nhắn tin và đặt lịch xem phòng ở cùng một nơi.' },
  ],
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Sản phẩm',
    links: [
      { label: 'Tìm phòng trọ', to: '#tin-noi-bat' },
      { label: 'Tìm bạn ở ghép', to: '#tin-noi-bat' },
      { label: 'Đăng tin cho thuê', to: '/posts/new' },
    ],
  },
  {
    title: 'Công ty',
    links: [
      { label: 'Về Homeji', to: '#vi-sao' },
      { label: 'Hành trình tìm tổ ấm', to: '#hanh-trinh' },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Cách Homeji hoạt động', to: '#cach-hoat-dong' },
      { label: 'Đăng nhập', to: '/login' },
      { label: 'Quên mật khẩu', to: '/forgot-password' },
    ],
  },
  {
    title: 'Pháp lý',
    links: [
      { label: 'Điều khoản sử dụng', to: '/terms' },
      { label: 'Chính sách bảo mật', to: '/privacy' },
    ],
  },
]

export const CONTACT = {
  area: 'TP. Hồ Chí Minh',
} as const
