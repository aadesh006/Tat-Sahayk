import { useState, useEffect } from 'react';
import { MapPin, X, Loader2, AlertCircle } from 'lucide-react';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';

const LocationPrompt = ({ user, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [location, setLocation] = useState({ district: '', state: '' });
  const [error, setError] = useState('');

  // Try to fetch location automatically on mount
  useEffect(() => {
    // Skip if user already has location or is admin
    if (user?.district || user?.role === 'admin') {
      onClose();
      return;
    }

    fetchLocation();
  }, []);

  const fetchLocation = async () => {
    setLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setManualMode(true);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocode using Nominatim (OpenStreetMap)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const data = await response.json();

          if (data.address) {
            const district = data.address.state_district || data.address.county || data.address.city || '';
            const state = data.address.state || '';

            if (district && state) {
              // Update user location in backend
              await axiosInstance.patch(`/auth/update-location?district=${encodeURIComponent(district)}&state=${encodeURIComponent(state)}`);
              toast.success(`Location set to ${district}, ${state}`);
              onClose();
            } else {
              setError('Could not determine your district. Please enter manually.');
              setManualMode(true);
            }
          }
        } catch (err) {
          console.error('Geocoding error:', err);
          setError('Failed to determine location. Please enter manually.');
          setManualMode(true);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Location access denied. Please enter manually or skip.');
        setManualMode(true);
        setLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!location.district || !location.state) {
      toast.error('Please enter both district and state');
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.patch(`/auth/update-location?district=${encodeURIComponent(location.district)}&state=${encodeURIComponent(location.state)}`);
      toast.success(`Location set to ${location.district}, ${location.state}`);
      onClose();
    } catch (err) {
      toast.error('Failed to update location');
    } finally {
      setLoading(false);
    }
  };

  // Don't show for admins or users who already have location
  if (user?.district || user?.role === 'admin') {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin size={20} className="text-white" />
            <h2 className="text-white font-black text-lg">Set Your Location</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white transition-colors"
            title="Skip for now"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Info message */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>
                We need your location to show you relevant disaster alerts and notifications for your area.
                Your location is only used for alerts and is not shared publicly.
              </span>
            </p>
          </div>

          {/* Loading state */}
          {loading && !manualMode && (
            <div className="text-center py-8">
              <Loader2 className="animate-spin text-blue-600 mx-auto mb-3" size={32} />
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                Detecting your location...
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Manual input form */}
          {manualMode && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1 block">
                  District
                </label>
                <input
                  type="text"
                  placeholder="e.g., Mumbai, Chennai, Kolkata"
                  value={location.district}
                  onChange={(e) => setLocation({ ...location, district: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1 block">
                  State
                </label>
                <input
                  type="text"
                  placeholder="e.g., Maharashtra, Tamil Nadu, West Bengal"
                  value={location.state}
                  onChange={(e) => setLocation({ ...location, state: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Skip for Now
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <MapPin size={16} />
                      Save Location
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Retry button */}
          {!loading && !manualMode && error && (
            <div className="flex gap-3">
              <button
                onClick={fetchLocation}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => setManualMode(true)}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Enter Manually
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationPrompt;
