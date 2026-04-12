/**
 * Compare store — lưu danh sách phòng so sánh vào localStorage
 * Xuất hook useCompare để dùng trong toàn app
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'

const MAX_COMPARE = 3

export const useCompareStore = create(
  persist(
    (set, get) => ({
      rooms: [], // Array<{ _id, title, images }>

      addRoom: (room) => {
        const rooms = get().rooms
        if (rooms.some((r) => r._id === room._id)) {
          toast.info('Phòng này đã có trong danh sách so sánh')
          return
        }
        if (rooms.length >= MAX_COMPARE) {
          toast.error(`Chỉ được so sánh tối đa ${MAX_COMPARE} phòng`)
          return
        }
        set({ rooms: [...rooms, { _id: room._id, title: room.title, images: room.images, slug: room.slug }] })
        toast.success('Đã thêm vào danh sách so sánh ⚖️')
      },

      removeRoom: (roomId) => {
        set({ rooms: get().rooms.filter((r) => r._id !== roomId) })
      },

      clearRooms: () => set({ rooms: [] }),

      isInCompare: (roomId) => get().rooms.some((r) => r._id === roomId),
    }),
    {
      name: 'compare-rooms',
    }
  )
)
