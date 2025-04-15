/**
 * Reddit API Service
 * Handles fetching comment data from Reddit using RSS feeds to avoid API restrictions
 */
import { XMLParser } from 'fast-xml-parser';

// Reddit comment interface
interface RedditComment {
  id: string;
  body: string;
  subreddit: string;
  parent_id: string;
  link_id: string;
  link_title?: string;
  parent_body?: string;
  created_utc: number;
}

// Logging options
interface LoggingOptions {
  enabled: boolean;
  verbose: boolean;
}

export class RedditService {
  // Use a selection of realistic browser User-Agents
  private userAgents: string[] = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];
  private lastRequestTime: number = 0;
  private requestDelay: number = 2000; // Reasonable delay between requests
  private xmlParser: XMLParser;
  private logging: LoggingOptions = {
    enabled: true,
    verbose: false // Set verbose to false by default for cleaner logs
  };
  
  constructor(loggingOptions?: Partial<LoggingOptions>) {
    if (loggingOptions) {
      this.logging = { ...this.logging, ...loggingOptions };
    }
    
    // Initialize XML parser with options for RSS feed handling
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text'
    });
  }

  /**
   * Sleep function to add delay between requests
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Logger function
   */
  private log(...args: any[]): void {
    if (this.logging.enabled) {
      console.log('[RedditService]', ...args);
    }
  }

  /**
   * Detailed logger function for verbose output
   */
  private logVerbose(...args: any[]): void {
    if (this.logging.enabled && this.logging.verbose) {
      console.log('[RedditService:VERBOSE]', ...args);
    }
  }

  /**
   * Get a random User-Agent from the list
   */
  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Make fetch requests with browser-like headers
   */
  private async browserLikeFetch(url: string, retries = 3): Promise<Response> {
    // Add delay between requests to avoid rate limiting
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.requestDelay) {
      await this.sleep(this.requestDelay - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();
    
    // Set up browser-like headers
    const headers = {
      'User-Agent': this.getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Referer': 'https://www.reddit.com/',
      'Cache-Control': 'max-age=0',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    };

    // Log the request
    this.log(`Making request to: ${url}`);
    this.logVerbose(`Request headers:`, headers);

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        this.log(`Attempt ${attempt + 1}/${retries} for ${url}`);
        const response = await fetch(url, { headers });
        
        // Log the response status
        this.log(`Response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          if (response.status === 403) {
            this.log(`403 Blocked response for URL: ${url}`);
          }
          
          throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }
        
        return response;
        
      } catch (error) {
        this.log(`Attempt ${attempt + 1} failed:`, error);
        
        if (attempt < retries - 1) {
          // Exponential backoff
          const waitTime = Math.pow(2, attempt) * 1000;
          this.log(`Retrying in ${waitTime}ms...`);
          await this.sleep(waitTime);
        } else {
          throw error;
        }
      }
    }

    throw new Error(`Failed after ${retries} attempts`);
  }

  /**
   * Fetch user comments from Reddit's RSS feed
   * RSS feeds tend to be more reliable and less blocked than the JSON API
   */
  private async fetchFromRSS(username: string, limit: number): Promise<RedditComment[]> {
    this.log(`Fetching RSS feed for user: ${username}`);
    const rssUrl = `https://www.reddit.com/user/${encodeURIComponent(username)}/comments/.rss`;
    
    // Fetch the RSS feed
    const response = await this.browserLikeFetch(rssUrl);
    const xmlText = await response.text();
    
    this.logVerbose('RSS response:', xmlText.substring(0, 500) + '...');
    
    // Parse XML
    try {
      const result = this.xmlParser.parse(xmlText);
      
      this.logVerbose('Parsed XML structure:', JSON.stringify(result).substring(0, 300) + '...');
      
      // Check for valid feed structure
      if (!result || !result.feed || !result.feed.entry) {
        this.log('RSS feed has unexpected structure:', result);
        return [];
      }
      
      // Handle both single entry and multiple entries
      const entries = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry];
      
      this.log(`Parsed ${entries.length} entries from RSS feed`);
      
      // Map RSS entries to our comment format
      const comments = entries.slice(0, limit).map((entry: any) => {
        try {
          // Extract subreddit from category
          let subreddit = 'unknown';
          if (entry.category) {
            if (typeof entry.category === 'object') {
              // Handle single category
              subreddit = entry.category['@_label']?.replace('r/', '') || 'unknown';
            } else if (Array.isArray(entry.category)) {
              // Handle multiple categories
              const subRedditCategory = entry.category.find((c: any) => 
                c['@_label'] && c['@_label'].startsWith('r/'));
              
              if (subRedditCategory) {
                subreddit = subRedditCategory['@_label'].replace('r/', '');
              }
            }
          }
          
          // Generate a unique ID if none exists
          const id = (entry.id && typeof entry.id === 'string') 
            ? entry.id.split(':').pop() || entry.id
            : `id_${Math.random().toString(36).substring(2, 9)}`;
          
          // Extract post title from the title field
          let linkTitle = '';
          if (entry.title && typeof entry.title === 'string') {
            // The RSS title format is usually "/u/username on Post Title"
            const titleMatch = entry.title.match(/\/u\/[^/]+\s+on\s+(.+)$/);
            if (titleMatch && titleMatch[1]) {
              linkTitle = titleMatch[1].trim();
            }
          }
          
          // Extract link from the "link" field (contains the permalink to the comment)
          let permalink = '';
          let parentId = '';
          let linkId = '';
          
          if (entry.link && entry.link['@_href']) {
            permalink = entry.link['@_href'];
            
            // Try to extract the parent ID and link ID from the permalink
            const linkParts = permalink.split('/');
            if (linkParts.length >= 2) {
              const lastPart = linkParts[linkParts.length - 1];
              if (lastPart) {
                // The last part is usually the comment ID
                parentId = `t1_${lastPart}`; // Assuming it's a reply to another comment
                
                // The second-to-last part is usually the submission ID
                const postId = linkParts[linkParts.length - 3];
                if (postId) {
                  linkId = `t3_${postId}`;
                }
              }
            }
          }
          
          // Convert publication date to UTC timestamp
          let createdUtc = Date.now() / 1000;
          if (entry.updated && typeof entry.updated === 'string') {
            try {
              createdUtc = new Date(entry.updated).getTime() / 1000;
            } catch (e) {
              this.log('Error parsing date:', e);
            }
          }
          
          return {
            id,
            // Clean up content from HTML/XML entities
            body: this.extractContentFromEntry(entry),
            subreddit,
            parent_id: parentId,
            link_id: linkId,
            link_title: linkTitle,
            created_utc: createdUtc
          };
        } catch (entryError) {
          this.log('Error processing RSS entry:', entryError, entry);
          return null;
        }
      }).filter(Boolean) as RedditComment[];
      
      this.log(`Successfully extracted ${comments.length} comments from RSS feed`);
      return comments;
      
    } catch (error) {
      this.log('Error parsing RSS XML:', error);
      throw new Error(`RSS parsing error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Clean HTML content from RSS feed
   */
  private cleanHtmlContent(html: string): string {
    if (!html) return '';
    
    // Log the raw HTML content for debugging
    this.logVerbose('Raw HTML content:', html);
    
    // First, extract the actual content from the HTML comment structure
    // Reddit RSS feed wraps content in <!-- SC_OFF --><div class="md">actual content</div><!-- SC_ON -->
    const contentMatch = html.match(/<!-- SC_OFF --><div class="md">([\s\S]*?)<\/div><!-- SC_ON -->/);
    const contentHtml = contentMatch ? contentMatch[1] : html;
    
    this.logVerbose('Extracted HTML content:', contentHtml);
    
    // Basic HTML tag removal - preserve paragraph breaks by replacing with newlines first
    let text = contentHtml
      .replace(/<p>/g, '\n\n')
      .replace(/<\/p>/g, '')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]*>/g, ' ');
    
    // Fix common HTML entities
    text = text.replace(/&quot;/g, '"')
               .replace(/&apos;/g, "'")
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&amp;/g, '&')
               .replace(/&nbsp;/g, ' ')
               .replace(/&#39;/g, "'")
               .replace(/&#x200B;/g, ''); // Zero-width space
    
    // Clean up whitespace (preserve paragraph breaks)
    text = text.replace(/\s+/g, ' ').trim();
    
    this.logVerbose('Cleaned text content:', text);
    return text;
  }

  /**
   * Extract the comment content from an RSS entry
   * Handles different content structures from the RSS feed
   */
  private extractContentFromEntry(entry: any): string {
    this.logVerbose('Extracting content from entry:', entry);
    
    if (!entry || !entry.content) {
      this.log('No content field found in entry');
      return '[No content]';
    }
    
    // Handle content as an object with @_type and #text properties
    if (typeof entry.content === 'object') {
      // If content has HTML type and inner text
      if (entry.content['@_type'] === 'html' && entry.content['#text']) {
        return this.cleanHtmlContent(entry.content['#text']);
      }
      
      // If content has just the text directly
      if (entry.content['#text']) {
        return this.cleanHtmlContent(entry.content['#text']);
      }
      
      // Try accessing content directly without the textNodeName
      if (typeof entry.content === 'string') {
        return this.cleanHtmlContent(entry.content);
      }
      
      // No recognized structure, dump the object for debugging
      this.log('Unrecognized content structure:', entry.content);
      return '[Content format not recognized]';
    }
    
    // Simple string content
    if (typeof entry.content === 'string') {
      return this.cleanHtmlContent(entry.content);
    }
    
    this.log('Unknown content type:', typeof entry.content);
    return '[Unknown content format]';
  }

  /**
   * Try multiple different Reddit approaches to find one that works
   */
  private async tryMultipleApproaches(username: string, limit: number): Promise<RedditComment[]> {
    // First try RSS feed
    try {
      this.log(`Trying RSS feed approach for ${username}`);
      return await this.fetchFromRSS(username, limit);
    } catch (rssError) {
      this.log('RSS approach failed:', rssError);
      
      // Wait before trying the JSON approach
      await this.sleep(1000);
      
      try {
        // Fallback to JSON API if RSS fails
        this.log(`Trying JSON API approach for ${username}`);
        
        // Try old.reddit.com first as it's often less restrictive
        const jsonUrl = `https://old.reddit.com/user/${encodeURIComponent(username)}/comments.json?limit=${limit}&raw_json=1`;
        
        const response = await this.browserLikeFetch(jsonUrl);
        const data = await response.json();
        
        if (!data || !data.data || !data.data.children || !Array.isArray(data.data.children)) {
          this.log('Unusual response structure from Reddit JSON API:', data);
          return [];
        }
        
        return data.data.children
          .filter((child: any) => child && child.data)
          .map((child: any) => ({
            id: child.data.id || `id_${Math.random().toString(36).substring(2, 9)}`,
            body: child.data.body || '[No content]',
            subreddit: child.data.subreddit || 'unknown',
            parent_id: child.data.parent_id || '',
            link_id: child.data.link_id || '',
            created_utc: child.data.created_utc || (Date.now() / 1000)
          }));
      } catch (jsonError) {
        this.log('JSON API approach also failed:', jsonError);
        throw new Error(`All Reddit approaches failed for ${username}`);
      }
    }
  }

  /**
   * Fetch the most recent comments for a given username
   */
  async getUserComments(username: string, limit: number = 40): Promise<RedditComment[]> {
    this.log(`Fetching comments for user: ${username}, limit: ${limit}`);
    
    try {
      const comments = await this.tryMultipleApproaches(username, limit);
      
      // For simplicity, we'll just use the comment's parent_id as the "Parent" column
      // Getting actual parent content requires additional API calls which might get blocked
      const enhancedComments = comments.map(comment => {
        // Extract readable info from parent/link IDs
        if (comment.parent_id && comment.parent_id.startsWith('t3_')) {
          comment.link_title = comment.link_title || `Post: ${comment.parent_id.substring(3)}`;
        } else if (comment.parent_id && comment.parent_id.startsWith('t1_')) {
          comment.parent_body = `Comment: ${comment.parent_id.substring(3)}`;
        }
        return comment;
      });

      this.log(`Successfully processed ${enhancedComments.length} comments for ${username}`);
      return enhancedComments;
    } catch (error) {
      this.log('Failed to get user comments:', error);
      throw new Error(`Could not fetch comments for ${username}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Toggle logging on/off
   */
  setLogging(options: Partial<LoggingOptions>): void {
    this.logging = { ...this.logging, ...options };
    this.log(`Logging settings updated:`, this.logging);
  }
}

// Client-side service for interacting with our API endpoint
export async function fetchRedditComments(username: string): Promise<RedditComment[]> {
  try {
    console.log(`[Client] Fetching comments for ${username} from API endpoint`);
    const response = await fetch(`/api/reddit-comments?username=${encodeURIComponent(username)}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[Client] API error:`, errorData);
      throw new Error(errorData.message || 'Failed to fetch comments');
    }
    
    const data = await response.json();
    console.log(`[Client] Received ${data.comments?.length || 0} comments from API`);
    return data.comments || [];
  } catch (error: any) {
    console.error('[Client] Error fetching Reddit comments:', error);
    throw error;
  }
}

// For server-side use only
export function getRedditService(): RedditService {
  return new RedditService();
}