import { fetchProfile } from '../api/user.js'
import { load } from '../utils/storage.js'

export function useUser() {
    const cached = load('profile')
    let profile = cached

    async function refresh() {
        profile = await fetchProfile()
        return profile
    }

    return { get: () => profile, refresh }
}
