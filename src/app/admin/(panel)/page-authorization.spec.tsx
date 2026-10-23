import { describe, expect, it, vi } from 'vitest'

import { authService } from '@/server/modules/auth/services/auth.service'
import { postService } from '@/server/modules/posts/services/post.service'
import { profileService } from '@/server/modules/profile/services/profile.service'

import AccountPage from './account/page'
import EditPostPage from './posts/[id]/page'
import PreviewPostPage from './posts/[id]/preview/page'
import NewPostPage from './posts/new/page'
import ProfilePage from './profile/page'

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined }),
}))

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  },
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

const PAGE_REQUESTS = [
  { name: 'account', render: () => AccountPage() },
  { name: 'new post', render: () => NewPostPage() },
  {
    name: 'edit post',
    render: () => EditPostPage({ params: Promise.resolve({ id: 'AbCdEfGh12' }) }),
  },
  {
    name: 'post preview',
    render: () => PreviewPostPage({ params: Promise.resolve({ id: 'AbCdEfGh12' }) }),
  },
  { name: 'profile', render: () => ProfilePage() },
]

describe('Admin page authorization', () => {
  it.each(PAGE_REQUESTS)(
    'BH-1: Given no session at $name, should redirect before reading data',
    async ({ render }) => {
      vi.spyOn(authService, 'findUser').mockResolvedValue(null)
      const getPost = vi.spyOn(postService, 'getPost')
      const getProfile = vi.spyOn(profileService, 'getProfile')
      const getSettings = vi.spyOn(profileService, 'getSettings')

      await expect(render()).rejects.toThrow('NEXT_REDIRECT:/sign-in')

      expect(getPost).not.toHaveBeenCalled()
      expect(getProfile).not.toHaveBeenCalled()
      expect(getSettings).not.toHaveBeenCalled()
    },
  )
})
