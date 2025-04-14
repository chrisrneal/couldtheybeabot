import { useState } from 'react';

interface BotAnalysisResult {
  username: string;
  botProbability: number;
  accountAge: number; // in days
  postFrequency: number; // posts per day
  commentFrequency: number; // comments per day
  similarityScore: number; // 0-100%
  flags: string[];
}

export default function RedditUserLookup() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BotAnalysisResult | null>(null);
  const [error, setError] = useState('');

  const analyzeUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
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

  return (
    <div className="w-full max-w-md mx-auto p-4">
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
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
    </div>
  );
}