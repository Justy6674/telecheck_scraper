import { useState } from 'react';
import { Search, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';
import { verifyPostcode, type VerificationResult } from '@/services/disasterService';

export function PostcodeChecker() {
  const [postcode, setPostcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState('');

  const checkPostcode = async () => {
    if (!postcode || !/^\d{4}$/.test(postcode)) {
      setError('Please enter a valid 4-digit postcode');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await verifyPostcode(postcode);
      setResult(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify postcode';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search Box */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-2">
              Enter Australian Postcode
            </label>
            <input
              id="postcode"
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onKeyPress={(e) => e.key === 'Enter' && checkPostcode()}
              placeholder="e.g. 4000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              maxLength={4}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={checkPostcode}
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              {loading ? 'Checking...' : 'Check Status'}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className={`bg-white rounded-xl shadow-lg p-8 ${result.inDisasterZone ? 'border-2 border-orange-500' : ''}`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${result.inDisasterZone ? 'bg-orange-100' : 'bg-green-100'}`}>
              {result.inDisasterZone ? (
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              ) : (
                <CheckCircle className="w-8 h-8 text-green-600" />
              )}
            </div>
            
            <div className="flex-1">
              <h2 className={`text-2xl font-bold mb-2 ${result.inDisasterZone ? 'text-orange-700' : 'text-green-700'}`}>
                {result.inDisasterZone ? 'Disaster Zone Confirmed' : 'Not in Disaster Zone'}
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-5 h-5" />
                  <span className="font-medium">
                    {result.suburb}, {result.postcode}
                  </span>
                </div>
                
                {result.lga && (
                  <div className="text-gray-600">
                    <span className="font-medium">LGA:</span> {result.lga.name} ({result.lga.code})
                  </div>
                )}
                
                {result.inDisasterZone && result.disasters && result.disasters.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="font-semibold text-gray-700 mb-3">Active Disasters:</h3>
                    <div className="space-y-3">
                      {result.disasters.map((disaster, index) => (
                        <div key={index} className="bg-orange-50 p-4 rounded-lg">
                          <div className="font-medium text-orange-900 capitalize">
                            {disaster.type}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {disaster.description}
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            Declared by {disaster.authority} • Severity: {disaster.severity}/5
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">
                    {result.inDisasterZone 
                      ? '✅ Medicare telehealth exemption applies - patients in this area can access telehealth without the 12-month relationship requirement.'
                      : 'ℹ️ Standard Medicare telehealth rules apply - 12-month relationship requirement unless another exemption applies.'}
                  </p>
                </div>
                
                <div className="text-xs text-gray-500 mt-2">
                  Verified at {new Date(result.verifiedAt).toLocaleString('en-AU')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}