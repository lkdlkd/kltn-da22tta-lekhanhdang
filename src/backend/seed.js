/**
 * seed.js — Tạo dữ liệu mẫu 25 phòng trọ tại Vĩnh Long
 *
 * Cách chạy:
 *   node seed.js
 *
 * Yêu cầu:
 *   - MONGODB_URI đã được set trong .env của backend
 *   - File chạy từ thư mục src/backend/
 */

require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const slugify = require('slugify')
const crypto = require('crypto')
const Room = require('./models/Room')
const User = require('./models/User')

// ── Kết nối MongoDB ───────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/phongtrovinhlong'

// ── Hình ảnh mẫu (Unsplash) ───────────────────────────────────────────────────
const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
  'https://images.unsplash.com/photo-1614119068408-fb338d48d05d?w=800',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
  'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800',
]

const pickImages = (n = 2) => {
  const shuffled = [...SAMPLE_IMAGES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

// ── Toạ độ Trung tâm Vĩnh Long ───────────────────────────────────────────────
// Lat: 10.2397, Lng: 105.9656 — TP. Vĩnh Long
const spreadCoord = (baseLat, baseLng, rangeKm = 5) => {
  const toLatDeg = rangeKm / 111.0
  const toLngDeg = rangeKm / (111.0 * Math.cos((baseLat * Math.PI) / 180))
  return {
    lat: baseLat + (Math.random() * 2 - 1) * toLatDeg,
    lng: baseLng + (Math.random() * 2 - 1) * toLngDeg,
  }
}

const BASE_LAT = 10.2397
const BASE_LNG = 105.9656

// ── Dữ liệu các phường/xã ở Vĩnh Long ───────────────────────────────────────
const WARDS = [
  'Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5',
  'Phường 8', 'Phường 9', 'Xã Trường An', 'Xã Tân Ngãi',
]
const STREETS = [
  'Đường 3/2', 'Đường Hùng Vương', 'Đường Lê Lợi', 'Đường Trần Phú',
  'Đường Phạm Thái Bường', 'Đường Nguyễn Văn Linh', 'Đường 30/4',
  'Hẻm 10 đường Nguyễn Huệ', 'Đường Ngô Quyền', 'Đường Hoàng Thái Hiếu',
]

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

// ── Dữ liệu 25 phòng ─────────────────────────────────────────────────────────
const ROOM_TEMPLATES = [
  // Phòng trọ
  { type: 'phòng_trọ', priceRange: [800_000, 1_500_000], areaRange: [12, 20], capacityRange: [1, 2] },
  { type: 'phòng_trọ', priceRange: [1_200_000, 2_000_000], areaRange: [18, 28], capacityRange: [1, 2] },
  { type: 'phòng_trọ', priceRange: [600_000, 1_000_000], areaRange: [10, 15], capacityRange: [1, 1] },
  // Chung cư mini
  { type: 'chung_cư_mini', priceRange: [2_000_000, 3_500_000], areaRange: [25, 40], capacityRange: [1, 3] },
  { type: 'chung_cư_mini', priceRange: [3_000_000, 5_000_000], areaRange: [35, 55], capacityRange: [2, 4] },
  // Nhà nguyên căn
  { type: 'nhà_nguyên_căn', priceRange: [4_000_000, 8_000_000], areaRange: [60, 120], capacityRange: [4, 8] },
  // Ký túc xá
  { type: 'ký_túc_xá', priceRange: [300_000, 700_000], areaRange: [6, 12], capacityRange: [2, 6] },
]

const AMENITY_POOL = [
  'wifi', 'điều_hòa', 'nóng_lạnh', 'tủ_lạnh', 'máy_giặt',
  'bếp', 'chỗ_để_xe', 'an_ninh', 'camera', 'thang_máy',
  'ban_công', 'nội_thất', 'vệ_sinh_riêng', 'điện_nước_riêng',
]
const pickAmenities = (min = 2, max = 8) => {
  const shuffled = [...AMENITY_POOL].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, randInt(min, max))
}

const DESCRIPTIONS = [
  (type, area, price) => `Phòng ${type.replace('_', ' ')} ${area}m² sạch sẽ, yên tĩnh, phù hợp sinh viên hoặc người đi làm. Giá chỉ ${price.toLocaleString('vi-VN')}đ/tháng đã bao gồm điện nước. Chủ nhà nhiệt tình, thân thiện, sẵn sàng hỗ trợ khi cần.`,
  (type, area, price) => `Cho thuê phòng ${area}m² loại ${type.replace('_', ' ')}, thoáng mát, có cửa sổ hướng đường. Khu vực an ninh tốt, gần trường học, chợ, siêu thị. Liên hệ ngay để được tư vấn chi tiết. Giá: ${price.toLocaleString('vi-VN')}đ/tháng.`,
  (type, area, price) => `Phòng trống cần cho thuê ngay. Diện tích ${area}m² thoải mái, phù hợp cho ${type === 'ký_túc_xá' ? 'sinh viên' : 'cặp đôi hoặc gia đình nhỏ'}. Giá thuê ${price.toLocaleString('vi-VN')}đ/tháng. Có thể thương lượng nếu thuê dài hạn.`,
  (type, area, price) => `Cần tìm người thuê phòng loại ${type.replace('_', ' ')}, diện tích ${area}m², nội thất cơ bản đầy đủ. Vị trí đẹp, gần trung tâm thành phố Vĩnh Long. Giá ưu đãi: ${price.toLocaleString('vi-VN')}đ/tháng.`,
]

const TITLES = [
  (ward) => `Phòng trọ đẹp gần trung tâm ${ward}`,
  (ward) => `Cho thuê phòng sạch sẽ, tiện nghi đầy đủ tại ${ward}`,
  (ward) => `Phòng trọ giá rẻ sinh viên ${ward}`,
  (ward) => `Chung cư mini hiện đại tại ${ward} Vĩnh Long`,
  (ward) => `Nhà nguyên căn rộng rãi, hẻm yên tĩnh ${ward}`,
  (ward) => `Phòng ký túc xá có máy lạnh ${ward}`,
  (ward) => `Phòng trọ cao cấp, đầy đủ nội thất ${ward}`,
  (ward) => `Cho thuê phòng giá hợp lý tại ${ward} TP. Vĩnh Long`,
]

// ── Hàm tạo seed ─────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(MONGODB_URI)
  console.log('✅ Connected to MongoDB:', MONGODB_URI)

  // 1. Tạo hoặc tìm landlord seed
  let landlord = await User.findOne({ email: 'seed.landlord@phongtro.vl' })
  if (!landlord) {
    const hashed = await bcrypt.hash('Seed@1234', 12)
    landlord = await User.create({
      name: 'Chủ Trọ Minh Demo',
      username: 'minhdemo.landlord',
      email: 'seed.landlord@phongtro.vl',
      password: hashed,
      role: 'landlord',
      isEmailVerified: true,
      phone: '0909123456',
    })
    console.log('👤 Created seed landlord:', landlord.email)
  } else {
    console.log('👤 Reusing existing landlord:', landlord.email)
  }

  // 2. Xoá phòng cũ của seed landlord (để chạy lại được sạch)
  const deleted = await Room.deleteMany({ landlord: landlord._id })
  console.log(`🗑️  Deleted ${deleted.deletedCount} old seed rooms`)

  // 3. Tạo 25 phòng (dùng create() từng phòng để trigger pre-save slug)
  const createdRooms = []
  for (let i = 0; i < 25; i++) {
    const tpl = TEMPLATE_LIST[i % TEMPLATE_LIST_LEN]
    const price = randInt(...tpl.priceRange)
    const area = randInt(...tpl.areaRange)
    const capacity = randInt(...tpl.capacityRange)
    const ward = pick(WARDS)
    const street = pick(STREETS)
    const coords = spreadCoord(BASE_LAT, BASE_LNG, 6)
    const amenities = pickAmenities(tpl.type === 'ký_túc_xá' ? 1 : 3, tpl.type === 'nhà_nguyên_căn' ? 10 : 7)
    const titleFn = pick(TITLES)
    const descFn = pick(DESCRIPTIONS)
    const title = titleFn(ward)

    // Tự sinh slug (giống model Room) để tránh duplicate null
    const baseSlug = slugify(title, { lower: true, strict: true, locale: 'vi' })
    const shortId = crypto.randomBytes(4).toString('hex')
    const slug = `${baseSlug}-${shortId}`

    const room = await Room.create({
      title,
      slug,
      description: descFn(tpl.type, area, price),
      price,
      area,
      capacity,
      roomType: tpl.type,
      amenities,
      images: pickImages(randInt(2, 4)),
      address: `${randInt(1, 200)} ${street}, ${ward}, TP. Vĩnh Long, Vĩnh Long`,
      location: {
        type: 'Point',
        coordinates: [coords.lng, coords.lat],
      },
      landlord: landlord._id,
      status: 'approved',
      isAvailable: Math.random() > 0.15,
      viewCount: randInt(0, 500),
      averageRating: Number((Math.random() * 2 + 3).toFixed(1)),
      reviewCount: randInt(0, 30),
    })
    createdRooms.push(room)
    process.stdout.write(`\r  Đã tạo: ${createdRooms.length}/25`)
  }
  console.log(`\n🏠 Created ${createdRooms.length} seed rooms successfully!`)

  // 4. In ra slug để test
  const slugList = await Room.find({ landlord: landlord._id }).select('slug title price roomType').lean()
  console.log('\n📋 Room list:')
  slugList.forEach((r, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. [${r.roomType}] ${r.title.substring(0, 50)} — ${r.price.toLocaleString('vi-VN')}đ`)
    console.log(`      slug: ${r.slug}`)
  })

  await mongoose.disconnect()
  console.log('\n🎉 Seed hoàn tất! Kết nối đã đóng.')
  process.exit(0)
}

// ── Inline expand TEMPLATE_LIST ───────────────────────────────────────────────
const TEMPLATE_LIST = [
  ...Array(10).fill(null).map(() => ROOM_TEMPLATES[randInt(0, 2)]),  // 10 phòng trọ
  ...Array(6).fill(null).map(() => ROOM_TEMPLATES[randInt(3, 4)]),   // 6 chung cư mini
  ...Array(4).fill(null).map(() => ROOM_TEMPLATES[5]),               // 4 nhà nguyên căn
  ...Array(5).fill(null).map(() => ROOM_TEMPLATES[6]),               // 5 ký túc xá
]
const TEMPLATE_LIST_LEN = TEMPLATE_LIST.length

seed().catch((err) => {
  console.error('❌ Seed error:', err)
  process.exit(1)
})
