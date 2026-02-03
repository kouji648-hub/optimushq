import fs from 'fs';
import path from 'path';
import https from 'https';
import { getDb } from '../db/connection.js';
import { createSchema } from '../db/schema.js';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface SanityPost {
  _id: string;
  title: string;
  slug: { current: string };
  body?: Array<any>;
  mainImage?: {
    asset: { _ref: string };
    caption?: string;
  };
  isFeatured?: boolean;
  publishedAt: string;
}

interface SanityImage {
  _id: string;
  url: string;
}

const SANITY_PROJECT_ID = '7hqmbech';
const SANITY_DATASET = 'production';
const SANITY_API_VERSION = '2021-10-21';

const BLOG_PUBLIC_DIR = path.join(__dirname, '../../public/blog');

// Ensure public/blog directory exists
function ensureBlogDir() {
  if (!fs.existsSync(BLOG_PUBLIC_DIR)) {
    fs.mkdirSync(BLOG_PUBLIC_DIR, { recursive: true });
    console.log(`Created directory: ${BLOG_PUBLIC_DIR}`);
  }
}

// Convert Sanity Portable Text to HTML
function portableTextToHtml(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks)) return '';

  let html = '';

  for (const block of blocks) {
    if (block._type === 'block') {
      const style = block.style || 'normal';
      const text = block.children?.map((child: any) => {
        let content = child.text || '';

        if (child.marks && child.marks.length > 0) {
          for (const mark of child.marks) {
            if (mark === 'strong') {
              content = `<strong>${content}</strong>`;
            } else if (mark === 'em') {
              content = `<em>${content}</em>`;
            } else if (mark === 'code') {
              content = `<code>${content}</code>`;
            }
          }
        }

        if (child.markDefs && child.markDefs.length > 0) {
          for (const markDef of child.markDefs) {
            if (markDef._type === 'link' && markDef.href) {
              const linkText = child.text || '';
              content = `<a href="${markDef.href}">${linkText}</a>`;
            }
          }
        }

        return content;
      }).join('') || '';

      if (style === 'h1') {
        html += `<h1>${text}</h1>\n`;
      } else if (style === 'h2') {
        html += `<h2>${text}</h2>\n`;
      } else if (style === 'h3') {
        html += `<h3>${text}</h3>\n`;
      } else if (style === 'h4') {
        html += `<h4>${text}</h4>\n`;
      } else if (style === 'blockquote') {
        html += `<blockquote>${text}</blockquote>\n`;
      } else if (style === 'pre') {
        html += `<pre>${text}</pre>\n`;
      } else {
        if (text.trim()) {
          html += `<p>${text}</p>\n`;
        }
      }

      // Handle lists
      if (block.listItem === 'bullet') {
        html = html.replace(/<p>(.*?)<\/p>/, '<li>$1</li>');
      }
    } else if (block._type === 'image') {
      const caption = block.caption || 'Image';
      html += `<figure><img src="" alt="${caption}" /><figcaption>${caption}</figcaption></figure>\n`;
    }
  }

  return html;
}

// Download image from Sanity and save locally
async function downloadImage(assetRef: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      // Build Sanity image URL with query parameters for resizing
      const imageUrl = `https://cdn.sanity.io/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}/${assetRef}?w=800&h=600&fit=crop&auto=format`;

      const filename = `${uuidv4()}.jpg`;
      const filepath = path.join(BLOG_PUBLIC_DIR, filename);

      const req = https.get(imageUrl, { timeout: 5000 }, (response) => {
        if (response.statusCode !== 200) {
          console.warn(`Failed to download image (status: ${response.statusCode})`);
          resolve(null);
          return;
        }

        const fileStream = fs.createWriteStream(filepath);
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`Downloaded image: ${filename}`);
          resolve(`/blog/${filename}`);
        });

        fileStream.on('error', (err) => {
          console.error(`Error saving image: ${err.message}`);
          fs.unlink(filepath, () => {}); // Delete partially written file
          resolve(null);
        });
      });

      req.on('error', (err) => {
        console.warn(`Failed to fetch image: ${err.message}`);
        resolve(null);
      });

      req.on('timeout', () => {
        req.destroy();
        console.warn(`Image download timeout`);
        resolve(null);
      });
    } catch (err) {
      console.warn(`Error downloading image: ${err}`);
      resolve(null);
    }
  });
}

// Fetch posts from Sanity
async function fetchSanityPosts(): Promise<SanityPost[]> {
  return new Promise((resolve, reject) => {
    const query = encodeURIComponent('*[_type == "post"] | order(publishedAt desc)');
    const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?query=${query}`;

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch from Sanity: ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', (chunk) => (data += chunk));
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.result || []);
        } catch (err) {
          reject(new Error(`Failed to parse Sanity response: ${err}`));
        }
      });
    }).on('error', reject);
  });
}

// Main migration function
async function migrate() {
  try {
    console.log('Starting Sanity blog migration...\n');

    // Initialize database schema
    console.log('Initializing database schema...');
    createSchema();

    ensureBlogDir();

    console.log('Fetching posts from Sanity...');
    const posts = await fetchSanityPosts();
    console.log(`Found ${posts.length} posts\n`);

    if (posts.length === 0) {
      console.log('No posts found to migrate.');
      return;
    }

    const db = getDb();

    // Prepare database statement
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO blog_posts (
        id, title, slug, body, excerpt, cover_image_path, cover_image_caption, is_featured, published_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let migrated = 0;
    let failed = 0;

    for (const post of posts) {
      try {
        const id = post._id;
        const slug = post.slug?.current || post.title?.toLowerCase().replace(/\s+/g, '-');

        // Convert body to HTML
        let bodyHtml = '';
        if (post.body) {
          bodyHtml = portableTextToHtml(post.body);
        }

        // Create excerpt from first 150 chars of body text
        const bodyText = bodyHtml.replace(/<[^>]*>/g, '');
        const excerpt = bodyText.substring(0, 150).trim() + (bodyText.length > 150 ? '...' : '');

        // Download cover image if available
        let coverImagePath: string | null = null;
        let coverImageCaption: string | null = null;

        if (post.mainImage?.asset?._ref) {
          console.log(`  - Downloading image for: ${post.title}`);
          coverImagePath = await downloadImage(post.mainImage.asset._ref);
          coverImageCaption = post.mainImage.caption || null;
        }

        const isFeatured = post.isFeatured ? 1 : 0;
        const publishedAt = post.publishedAt || new Date().toISOString();
        const now = new Date().toISOString();

        stmt.run(id, post.title, slug, bodyHtml, excerpt, coverImagePath, coverImageCaption, isFeatured, publishedAt, now, now);

        console.log(`✓ Migrated: ${post.title}`);
        migrated++;
      } catch (err) {
        console.error(`✗ Failed to migrate post: ${post.title} - ${err}`);
        failed++;
      }
    }

    console.log(`\nMigration complete!`);
    console.log(`  - Successful: ${migrated}`);
    console.log(`  - Failed: ${failed}`);
    console.log(`  - Images saved to: ${BLOG_PUBLIC_DIR}`);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

// Run migration
migrate();
