import { fetchProfile } from '../../api/user.js'
import { currentUser } from '../../store/session.js'

export async function UserProfile() {
    const me = currentUser()
    const profile = await fetchProfile()
    return { me, profile }
}
