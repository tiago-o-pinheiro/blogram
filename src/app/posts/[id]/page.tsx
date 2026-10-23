import { type Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { getMessages } from '@/i18n'
import { getServerLocale } from '@/i18n/server'

import { PostCard } from '@/features/feed/components/post-card'
import { env } from '@/server/config/env'
import { NotFoundError } from '@/server/errors/http-errors'
import { feedService } from '@/server/modules/feed/services/feed.service'
import { profileService } from '@/server/modules/profile/services/profile.service'

export const dynamic = 'force-dynamic'

type PostPageProps = { params: Promise<{ id: string }> }

const getPublishedPost = cache(async (id: string) => {
  try {
    return await feedService.get(id)
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound()
    }
    throw error
  }
})

export const generateMetadata = async ({ params }: PostPageProps): Promise<Metadata> => {
  const { id } = await params
  const post = await getPublishedPost(id)
  const profile = await profileService.getProfile()
  const title = post.link?.title || post.text.slice(0, 100) || profile?.name || 'Blogram'
  const description =
    post.text.slice(0, 300) || post.link?.description || profile?.description || ''
  const origin = new URL(env.BETTER_AUTH_URL).origin
  const url = `${origin}/posts/${id}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      siteName: profile?.name,
      images: [{ url: `${origin}/api/posts/${id}/card?format=og`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${origin}/api/posts/${id}/card?format=og`],
    },
  }
}

const PostPage = async ({ params }: PostPageProps) => {
  const { id } = await params
  const post = await getPublishedPost(id)
  const profile = await profileService.getProfile()
  const locale = await getServerLocale()
  const messages = getMessages(locale)
  return (
    <main className="mx-auto min-h-dvh max-w-2xl space-y-6 px-4 py-8 sm:py-12">
      <h1 className="sr-only">{post.link?.title || post.text || profile?.name || 'Blogram'}</h1>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-full px-4 text-sm text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        ← {messages['feed.home']}
      </Link>
      <PostCard
        post={post}
        owner={profile?.name ?? 'Blogram'}
        origin={new URL(env.BETTER_AUTH_URL).origin}
        locale={locale}
        messages={messages}
      />
    </main>
  )
}

export default PostPage
