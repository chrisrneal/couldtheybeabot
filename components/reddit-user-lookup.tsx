import { useState } from 'react';
import { fetchRedditComments } from '../services/redditService';

interface BotAnalysisResult {
  username: string;
  botProbability: number;
  accountAge: number; // in days
  postFrequency: number; // posts per day
  commentFrequency: number; // comments per day
  similarityScore: number; // 0-100%
  flags: string[];
}

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

export default function RedditUserLookup() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BotAnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [comments, setComments] = useState<RedditComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [showingMockData, setShowingMockData] = useState(false);

  const analyzeUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setIsLoading(true);
    setError('');
    setComments([]);
    setCommentError('');
    setShowingMockData(false);
    
    try {
      // Fetch comments first so we can use them for analysis
      await fetchUserComments();
      
      // In production, this would call your actual API
      // For now, we'll simulate a response with mock data
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
      
      // Mock analysis result - in production this would come from your backend
      if (username.toLowerCase() === 'automoderator') {
        setResult({
          username,
          botProbability: 99,
          accountAge: 3650, // ~10 years
          postFrequency: 0,
          commentFrequency: 458.3,
          similarityScore: 92,
          flags: ['Known bot', 'High comment repetition', 'Consistent posting pattern']
        });
      } else {
        // Generate random-ish result for demo purposes
        const botProb = Math.floor(Math.random() * 100);
        setResult({
          username,
          botProbability: botProb,
          accountAge: Math.floor(Math.random() * 1000) + 30,
          postFrequency: Math.random() * 5,
          commentFrequency: Math.random() * 20,
          similarityScore: Math.floor(Math.random() * 100),
          flags: botProb > 70 
            ? ['Suspicious posting pattern', 'High comment similarity', 'Low engagement ratio'] 
            : ['Normal user activity', 'Varied content', 'Organic engagement']
        });
      }
    } catch (err) {
      setError('Error analyzing user. Please try again later.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate mock data as a fallback
  const getMockComments = (username: string): RedditComment[] => {
    return Array(5).fill(null).map((_, i) => ({
      id: `mock_${i}`,
      body: `This is a sample comment for u/${username}. Reddit API data could not be fetched at this time.`,
      subreddit: 'SampleSubreddit',
      parent_id: 't3_mock123',
      link_id: 't3_mock123',
      link_title: 'Sample Post Title',
      created_utc: Date.now() / 1000 - i * 3600
    }));
  };

  const fetchUserComments = async () => {
    if (!username.trim()) return;
    
    setIsLoadingComments(true);
    setCommentError('');
    
    try {
      // Try using our API endpoint
      try {
        const userComments = await fetchRedditComments(username);
        if (userComments && userComments.length > 0) {
          setComments(userComments);
          return;
        }
      } catch (apiError) {
        console.error('API method failed:', apiError);
        // Continue to fallback
      }
      
      // If the API call failed, immediately use mock data
      console.log('Using mock data as fallback for', username);
      const mockData = getMockComments(username);
      setComments(mockData);
      setShowingMockData(true);
      
    } catch (err: any) {
      setCommentError(`Error fetching user comments: ${err.message}`);
      console.error('Error fetching comments:', err);
      
      // Even if everything fails, still show mock data
      const mockData = getMockComments(username);
      setComments(mockData);
      setShowingMockData(true);
    } finally {
      setIsLoadingComments(false);
    }
  };

  // Helper function to truncate long text
  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Helper function to format parent content
  const formatParentContent = (comment: RedditComment) => {
    if (comment.parent_body) {
      return truncateText(comment.parent_body);
    }
    if (comment.link_title) {
      return `[Post] ${truncateText(comment.link_title)}`;
    }
    return comment.parent_id;
  };

  return (
    <div className="w-full max-w-xl mx-auto p-4">
      <form onSubmit={analyzeUser} className="mb-6">
        <div className="flex items-center border-b border-gray-300 dark:border-gray-700 py-2">
          <input
            className="appearance-none bg-transparent border-none w-full text-gray-700 dark:text-gray-200 mr-3 py-1 px-2 leading-tight focus:outline-none"
            type="text"
            placeholder="Reddit username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button
            className={`flex-shrink-0 bg-blue-500 hover:bg-blue-700 border-blue-500 hover:border-blue-700 text-sm border-4 text-white py-1 px-2 rounded ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </form>

      {error && <p className="text-red-500">{error}</p>}

      {result && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">u/{result.username}</h3>
            <div className={`px-3 py-1 rounded-full text-white ${
              result.botProbability > 70 
                ? 'bg-red-500' 
                : result.botProbability > 40 
                ? 'bg-yellow-500' 
                : 'bg-green-500'
            }`}>
              {result.botProbability > 70 
                ? 'Likely Bot' 
                : result.botProbability > 40 
                ? 'Possibly Bot' 
                : 'Likely Human'}
            </div>
          </div>
          
          <div className="mb-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${result.botProbability}%` }}
              ></div>
            </div>
            <p className="text-sm text-center mt-1">Bot Probability: {result.botProbability}%</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Account Age</p>
              <p>{result.accountAge} days</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Posts per Day</p>
              <p>{result.postFrequency.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Comments per Day</p>
              <p>{result.commentFrequency.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Content Similarity</p>
              <p>{result.similarityScore}%</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Flags</p>
            <ul className="list-disc list-inside">
              {result.flags.map((flag, index) => (
                <li key={index} className="text-sm">{flag}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Recent Comments Table */}
      {username && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 overflow-hidden">
          <h3 className="text-xl font-bold mb-4">Recent Comments</h3>
          
          {isLoadingComments && <p className="text-center">Loading comments...</p>}
          {commentError && <p className="text-red-500">{commentError}</p>}
          {showingMockData && 
            <div className="bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300 p-2 mb-4">
              <p className="text-sm">
                Note: Unable to fetch actual Reddit comments. Displaying sample data instead.
              </p>
            </div>
          }
          
          {comments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subreddit</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Comment</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Parent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {comments.map((comment) => (
                    <tr key={comment.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">{comment.subreddit}</td>
                      <td className="px-4 py-2 text-sm">{truncateText(comment.body, 150)}</td>
                      <td className="px-4 py-2 text-sm">{formatParentContent(comment)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !isLoadingComments && !commentError ? (
            <p className="text-center text-gray-500 dark:text-gray-400">No comments found for this user.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}