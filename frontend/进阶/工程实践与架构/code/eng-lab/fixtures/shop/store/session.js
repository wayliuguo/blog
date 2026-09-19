import { login, fetchProfile } from '../api/user.js'
import { save } from '../utils/storage.js'
import { required } from '../utils/validate.js'

let state = { token: null, profile: null }

export function currentUser() {
    return state.profile ?? { role: 'guest' }
}

export async function signIn(account, password) {
    required(account, '账号')
    const { token } = await login(account, password)
    state.token = token
    save('token', token)
    state.profile = await fetchProfile()
    return state.profile
}
