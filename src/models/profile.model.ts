import { Type, type Static } from 'typebox'
import { Value } from 'typebox/value'

export const PROFILE_NAME_MAX = 80
export const PROFILE_DESCRIPTION_MAX = 280
export const PROFILE_PHOTO_PATH = '/api/profile/photo'

export const ProfileBundle = Type.Object({
  name: Type.String({ minLength: 1, maxLength: PROFILE_NAME_MAX, pattern: '\\S' }),
  description: Type.String({ maxLength: PROFILE_DESCRIPTION_MAX }),
})
export type ProfileBundle = Static<typeof ProfileBundle>

export const Profile = Type.Object({
  name: Type.String({ minLength: 1, maxLength: PROFILE_NAME_MAX }),
  description: Type.String({ maxLength: PROFILE_DESCRIPTION_MAX }),
  hasPhoto: Type.Boolean(),
})
export type Profile = Static<typeof Profile>

export const isProfileBundle = (value: unknown): value is ProfileBundle =>
  Value.Check(ProfileBundle, value)

export const isProfile = (value: unknown): value is Profile => Value.Check(Profile, value)
