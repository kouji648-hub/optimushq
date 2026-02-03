# Blog Migration from Sanity CMS

This document describes the blog migration from Sanity CMS to the local database.

## Migration Summary

- **Posts Migrated**: 50
- **Featured Posts**: 24
- **Database Location**: `/root/claude-chat/chat.db`
- **Table**: `blog_posts`
- **Image Storage**: `/root/claude-chat/public/blog/`

## Database Schema

The `blog_posts` table contains the following columns:

```sql
CREATE TABLE blog_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  body TEXT NOT NULL,          -- HTML content converted from Portable Text
  excerpt TEXT DEFAULT NULL,   -- First 150 characters of body text
  cover_image_path TEXT DEFAULT NULL,     -- Path to locally stored image
  cover_image_caption TEXT DEFAULT NULL,  -- Image caption from Sanity
  is_featured INTEGER NOT NULL DEFAULT 0, -- 1 if featured, 0 otherwise
  published_at TEXT NOT NULL,  -- ISO 8601 timestamp
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## Migration Script

The migration script is located at `/root/claude-chat/server/src/scripts/migrate-blog-from-sanity.ts`

### Running the Migration

```bash
npx tsx server/src/scripts/migrate-blog-from-sanity.ts
```

### What the Script Does

1. Initializes the database schema if it doesn't exist
2. Connects to the Sanity public API (project: `7hqmbech`, dataset: `production`)
3. Fetches all blog posts from Sanity
4. Converts Portable Text content to HTML
5. Extracts excerpts from the body content
6. Attempts to download cover images from Sanity CDN to `/public/blog/`
7. Inserts/updates posts into the `blog_posts` table

### Content Conversion

The migration converts Sanity's Portable Text format to HTML:

- **Text Blocks**: `<p>`, `<h1>` - `<h4>`, `<blockquote>`, `<pre>`
- **Inline Marks**: `<strong>`, `<em>`, `<code>`
- **Annotations**: Links converted to `<a href="">` tags
- **Images**: Embedded as `<figure>` elements (image URLs replaced with local paths)

### Image Handling

- Images are downloaded to `/root/claude-chat/public/blog/`
- Each image is renamed with a unique UUID to avoid conflicts
- Image paths stored in database as `/blog/{uuid}.jpg`
- Images are served via Express static middleware on the `/blog/` route

**Note**: Current Sanity CDN returns HTTP 400 errors for direct image downloads. To re-enable image migration:

1. Obtain Sanity API token with image read permissions
2. Use authenticated requests to Sanity CDN
3. Or configure direct image URL generation in Sanity

## Querying the Database

### Get all posts

```sql
SELECT id, title, slug, published_at, is_featured FROM blog_posts ORDER BY published_at DESC;
```

### Get featured posts

```sql
SELECT * FROM blog_posts WHERE is_featured = 1 ORDER BY published_at DESC;
```

### Search by title

```sql
SELECT * FROM blog_posts WHERE title LIKE ? ORDER BY published_at DESC;
```

## Server Changes

### Added to `/server/src/index.ts`

Static middleware to serve public files including blog images:

```typescript
// Serve blog images and other public files
const publicDir = path.join(__dirname, '..', '..', 'public');
app.use(express.static(publicDir));
```

### Added to `/server/src/db/schema.ts`

New `blog_posts` table creation in the schema initialization.

## Future Enhancements

1. **Image Download**: Implement authenticated Sanity image requests
2. **Author Data**: Migrate author information from Sanity
3. **Categories**: Create category table and map posts to categories
4. **Tags**: Migrate tags from Sanity posts
5. **Admin API**: Create endpoints to manage blog posts via API
6. **Cloudinary Integration**: New blog posts added via admin panel use Cloudinary for images

## Notes

- All timestamps are stored as ISO 8601 strings in SQLite
- The script uses `INSERT OR REPLACE` to allow re-running without duplicates
- Featured status is preserved from the Sanity configuration
- Sanity project ID and dataset are hardcoded; can be moved to environment variables if needed
