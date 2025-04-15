import { NextApiRequest, NextApiResponse } from 'next';
import { RedditService } from '../../services/redditService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.query;
  
  if (!username || Array.isArray(username)) {
    return res.status(400).json({ error: 'Invalid username parameter' });
  }

  // Add CORS headers to help with potential CORS issues
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Add caching headers to reduce load on both our server and Reddit
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
  
  try {
    // Use our browser-like Reddit service
    const redditService = new RedditService();
    
    // Fetch user comments with a reasonable timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out after 15 seconds')), 15000);
    });
    
    const commentsPromise = redditService.getUserComments(username);
    const comments = await Promise.race([commentsPromise, timeoutPromise]) as Awaited<typeof commentsPromise>;
    
    return res.status(200).json({ comments });
  } catch (error: any) {
    console.error('API error fetching Reddit comments:', error);
    
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Send appropriate error response with fallback empty comments array
    return res.status(500).json({ 
      error: 'Failed to fetch Reddit data',
      message: errorMessage,
      comments: [] // Return empty array for graceful degradation
    });
  }
}