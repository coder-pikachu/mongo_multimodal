/**
 * Web Scraping Utilities
 * Handles fetching and cleaning web content
 */

import * as cheerio from 'cheerio';

export interface ScrapedContent {
  url: string;
  title: string;
  text: string;
  metadata: {
    description?: string;
    author?: string;
    publishDate?: string;
    scrapedAt: Date;
  };
  success: boolean;
  error?: string;
}

/**
 * Scrape a website and extract clean text content
 */
export async function scrapeWebsite(url: string): Promise<ScrapedContent> {
  const now = new Date();

  try {
    // Validate URL format
    const urlObj = new URL(url);

    // Fetch the website with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MongoMultimodal/1.0)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        url,
        title: '',
        text: '',
        metadata: { scrapedAt: now },
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const html = await response.text();

    // Parse and clean HTML
    const { title, text, description, author, publishDate } = cleanHTML(html);

    return {
      url,
      title,
      text,
      metadata: {
        description,
        author,
        publishDate,
        scrapedAt: now,
      },
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      url,
      title: '',
      text: '',
      metadata: { scrapedAt: now },
      success: false,
      error: `Failed to scrape: ${errorMessage}`,
    };
  }
}

/**
 * Clean HTML and extract text content
 */
export function cleanHTML(html: string): {
  title: string;
  text: string;
  description?: string;
  author?: string;
  publishDate?: string;
} {
  const $ = cheerio.load(html);

  // Extract title
  let title = $('head > title').text().trim();
  if (!title) {
    title = $('h1').first().text().trim();
  }

  // Extract meta description
  const description = $('meta[name="description"]').attr('content')?.trim() || '';

  // Extract author
  const author =
    $('meta[name="author"]').attr('content')?.trim() ||
    $('meta[property="article:author"]').attr('content')?.trim() ||
    '';

  // Extract publish date
  const publishDate =
    $('meta[property="article:published_time"]').attr('content')?.trim() ||
    $('meta[name="publish_date"]').attr('content')?.trim() ||
    '';

  // Remove script, style, nav, footer, and other non-content elements
  $(
    'script, style, nav, footer, noscript, [role="navigation"], .sidebar, .nav, .advertisement, .ad'
  ).remove();

  // Extract main content
  let text = '';

  // Try to find main content area
  const mainSelectors = ['main', 'article', '[role="main"]', '.content', '.post-content', '.entry-content'];
  let $content = null;

  for (const selector of mainSelectors) {
    const $found = $(selector);
    if ($found.length > 0 && $found.text().length > 100) {
      $content = $found;
      break;
    }
  }

  // If no main content found, use body
  if (!$content) {
    $content = $('body');
  }

  // Extract paragraphs and headings
  const contentParts: string[] = [];

  // Add headings and paragraphs
  $content.find('h1, h2, h3, h4, h5, h6, p, li, td, th').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text && text.length > 3) {
      contentParts.push(text);
    }
  });

  // Join with newlines and clean up whitespace
  text = contentParts.join('\n\n');

  // Remove excessive whitespace
  text = text
    .replace(/\n\n\n+/g, '\n\n') // Multiple newlines to double newline
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/\n /g, '\n') // Remove spaces after newlines
    .trim();

  // Limit text length (10000 characters = ~2500 tokens)
  if (text.length > 10000) {
    text = text.substring(0, 10000) + '...';
  }

  return {
    title,
    text,
    description: description || undefined,
    author: author || undefined,
    publishDate: publishDate || undefined,
  };
}

/**
 * Validate URL format
 */
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize URL (add http:// if missing)
 */
export function normalizeURL(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
}
