import { request } from './client'
import type { UserProfile } from '@/types'

export function fetchProfile() {
    return request<UserProfile>({ url: '/user/profile' })
}

export function updateProfile(data: Partial<UserProfile>) {
    return request<UserProfile>({ url: '/user/profile', method: 'PUT', data })
}
