export type UserProfile = {
    id: number
    name: string
    email: string
}

export function createProfile(name: string): UserProfile {
    return { id: Date.now(), name, email: `${name}@example.com` }
}
