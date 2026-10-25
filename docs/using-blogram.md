# Using Blogram

How the owner publishes and how visitors read. To install it, see [Self-hosting](self-hosting.md).

## Owner pages

Save a draft, preview it, then publish. Drafts and their files are visible only to the owner; unpublishing hides a post and its files from public routes.

| Route                       | Purpose                                                |
| --------------------------- | ------------------------------------------------------ |
| `/admin`                    | Installer before setup; owner administration afterward |
| `/sign-in`                  | Email or username and password sign-in                 |
| `/admin/posts`              | Posts with type, status, date and likes                |
| `/admin/posts/new`          | Type-specific creation form                            |
| `/admin/posts/<id>`         | Edit or replace media                                  |
| `/admin/posts/<id>/preview` | Preview, publish, unpublish or delete                  |
| `/admin/profile`            | Public name, description, photo and default language   |
| `/admin/account`            | Password change, Google linking and sign out           |

First run: open `/admin`, enter the installer password, set your public profile, choose the owner's email or username and password, then finish. If interrupted, unlock again with the same installer password; the saved profile persists. Once finished, the wizard never reopens.

On mobile, the bottom bar has **Feed**, **New**, **Profile** and **Account**. Sign out is under **Account → Session**.

## Post types

| Type           | Inputs and behavior                                                                          |
| -------------- | -------------------------------------------------------------------------------------------- |
| Photo          | One JPEG, PNG or WebP image, editable alternative text, optional caption                     |
| Uploaded video | MP4 or WebM plus a separate poster and optional caption; vertical video allowed              |
| YouTube        | Watch, short, embed, live and `youtu.be` URLs become a click-to-play embed; no file download |
| Link           | HTTP(S) URL, title, optional description, source, cover and personal caption                 |
| News           | Like a link, with a visible news label and the original source                               |

For links and news you can fetch the page metadata and edit it. A failed fetch never blocks publishing, covers are uploaded by hand and the article text is not copied.

## Places

Every post can have an optional place. In the editor choose **Add a place** and enter a city, venue or any name. It shows below the media in previews and published posts, and **Remove place** clears it on save.

**Find on OpenStreetMap** opens a search in a new tab. For an exact spot, use OpenStreetMap's Share control and paste the `https://www.openstreetmap.org/...` link into the map-link field. Without a link, the label opens an OpenStreetMap search for the name. No API key, location access or map tiles are involved, and place labels are public once the post is published.

## Feed, likes and sharing

- The public feed is newest first with pagination. Filter with `/?type=photo`, `/?type=video` (includes YouTube), `/?type=link` or `/?type=news`. Each post has a permanent URL at `/posts/<id>`.
- Likes increment on the server and `post:<id>:liked` in localStorage remembers the vote in that browser. They are anonymous: clearing storage or using another device can vote again, and there is no unlike.
- Visitors can copy the link or use native share where the device supports it. Story cards (1080×1920) and Open Graph images (1200×630) are static, even for videos. There is no direct publishing to other apps' stories or statuses.

## Languages

The interface is available in English and Spanish. The language comes from the visitor's locale cookie, then `Accept-Language`, then the owner's default, then English. Only the interface is translated, not your posts.

## Limits

- One owner. No public signup, comments, followers or messaging.
- One image per photo post, and a video needs a poster. There is no transcoding or adaptive streaming.
- Saved cover and profile images can be replaced but not removed.
- The admin status filter works in the API only; there is no selector for it yet.
- Link metadata is bounded text extraction, and third-party sites or YouTube may be unavailable.
- No outgoing email, so there is no email password reset. Recovery needs server access; see [Recover owner access](self-hosting.md#recover-owner-access).
- Single-server deployment. Large-scale streaming, horizontal scaling and public CDN media caching are not validated.
