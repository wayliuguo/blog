import { request } from '../utils/http.js'

export function login(account, password) {
    return request('/api/login', { method: 'POST', body: JSON.stringify({ account, password }) })
}

export function fetchProfile() {
    return request('/api/profile')
}
