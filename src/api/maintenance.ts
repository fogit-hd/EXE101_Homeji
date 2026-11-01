import { apiRequest } from './client'

export type MaintenanceAnnouncement = {
  id: string
  title: string
  message: string
  scheduledStartAt: string | null
  scheduledEndAt: string | null
  createdAt: string
  expiresAt: string
}

export const getMaintenanceAnnouncements = () =>
  apiRequest<MaintenanceAnnouncement[]>('/api/maintenance-announcements', { auth: false })
