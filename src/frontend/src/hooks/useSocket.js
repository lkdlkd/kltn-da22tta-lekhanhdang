import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'


const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}`;
};

const BACKEND_URL = `${getApiBaseUrl()}/api`;
let socketInstance = null

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(BACKEND_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
    })
  }
  return socketInstance
}

/**
 * Hook: kết nối socket khi có userId, tự disconnect khi unmount
 */
export function useSocket(userId) {
  const socket = getSocket()

  useEffect(() => {
    if (!userId) return

    if (!socket.connected) socket.connect()

    socket.emit('join_user', userId)

    return () => {
      // Không disconnect toàn bộ vì socket là singleton — chỉ rời room
    }
  }, [userId, socket])

  return socket
}
