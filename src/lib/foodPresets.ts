export type FoodPreset = {
  id: string
  title: string
  description: string
  price: number
  category: string
  unit: string
  preparationMinutes: number
  imageUrl: string
  imageSource: string
  imageAuthor: string
}

/** Demo helpers only. Real sellers must replace these with photos of their actual portions. */
export const FOOD_PRESETS: readonly FoodPreset[] = [
  {
    id: 'banh-mi',
    title: 'Bánh mì trứng nhà làm',
    description: 'Bánh mì làm trong ngày, rau và sốt để riêng. Ảnh mẫu — vui lòng thay bằng ảnh món thật.',
    price: 25_000,
    category: 'Ăn sáng',
    unit: 'ổ',
    preparationMinutes: 15,
    imageUrl: '/images/food-presets/banh-mi.jpg',
    imageSource: 'https://www.pexels.com/photo/delicious-baguette-sandwiches-on-picnic-table-34100503/',
    imageAuthor: 'Fatmanur Koçak / Pexels',
  },
  {
    id: 'com-ga',
    title: 'Cơm gà sốt nhà làm',
    description: 'Một phần cơm gà kèm rau, chế biến trong ngày. Ảnh mẫu — vui lòng thay bằng ảnh món thật.',
    price: 35_000,
    category: 'Cơm nhà',
    unit: 'phần',
    preparationMinutes: 25,
    imageUrl: '/images/food-presets/com-nha.jpg',
    imageSource: 'https://unsplash.com/photos/person-holding-rice-bowl--Uca3SGlOag',
    imageAuthor: 'Khloe Arledge / Unsplash',
  },
  {
    id: 'com-chien',
    title: 'Cơm chiên trứng',
    description: 'Cơm chiên trứng và rau củ, nhận nóng theo khung giờ. Ảnh mẫu — vui lòng thay bằng ảnh món thật.',
    price: 32_000,
    category: 'Cơm nhà',
    unit: 'phần',
    preparationMinutes: 20,
    imageUrl: '/images/food-presets/com-chien.jpg',
    imageSource: 'https://www.pexels.com/photo/food-plate-wood-restaurant-12481168/',
    imageAuthor: 'Markus Winkler / Pexels',
  },
  {
    id: 'mi-tron',
    title: 'Mì trộn rau thịt',
    description: 'Mì trộn làm mới theo đơn, sốt vừa vị sinh viên. Ảnh mẫu — vui lòng thay bằng ảnh món thật.',
    price: 30_000,
    category: 'Mì / bún',
    unit: 'phần',
    preparationMinutes: 20,
    imageUrl: '/images/food-presets/mi-tron.jpg',
    imageSource: 'https://www.pexels.com/photo/top-view-of-noodles-in-bowl-4223914/',
    imageAuthor: 'Alleksana / Pexels',
  },
  {
    id: 'bun-tron',
    title: 'Bún trộn nhà làm',
    description: 'Bún trộn rau và topping theo ngày. Ảnh mẫu — vui lòng thay bằng ảnh món thật.',
    price: 35_000,
    category: 'Mì / bún',
    unit: 'phần',
    preparationMinutes: 20,
    imageUrl: '/images/food-presets/com-ga.jpg',
    imageSource: 'https://unsplash.com/photos/chicken-rice-bowl-with-toppings-looks-delicious--X4tkvjVSco',
    imageAuthor: 'Chee Kee / Unsplash',
  },
  {
    id: 'tra-sua',
    title: 'Trà sữa trân châu',
    description: 'Trà sữa pha trong ngày, có thể tùy chỉnh lượng đường. Ảnh mẫu — vui lòng thay bằng ảnh món thật.',
    price: 18_000,
    category: 'Đồ uống',
    unit: 'ly',
    preparationMinutes: 10,
    imageUrl: '/images/food-presets/tra-sua.jpg',
    imageSource: 'https://www.pexels.com/photo/bubble-tea-on-glass-cup-11160122/',
    imageAuthor: 'Shameel Mukkath / Pexels',
  },
] as const
