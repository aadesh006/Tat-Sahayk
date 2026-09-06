import React, { useState, useEffect } from 'react';
import { MapPin, RefreshCw, Navigation, Shield, AlertTriangle, Home, Users, Phone, Clock, ArrowRight, Loader2, CheckCircle, Info, AlertCircle, AlertOctagon, FileText, User, Calendar, PlusCircle, X } from 'lucide-react';
import { getLocationBasedAlerts, getCirculars, createCircular } from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Toaster, toast } from 'react-hot-toast';
import useAuthUser from '../hooks/useAuthUser';

const LocationAlertsPage = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEvacuationModal, setShowEvacuationModal] = useState(false);
  const [showCircularModal, setShowCircularModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch circulars separately with React Query
  const { data: circulars } = useQuery({
    queryKey: ['circulars'],
    queryFn: () => getCirculars(true),
    refetchInterval: 60000,
  });

  useEffect(() => {
    getCurrentLocationAndAlerts();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      getCurrentLocationAndAlerts(true);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const getCurrentLocationAndAlerts = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    setError('');

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });

          try {
            const data = await getLocationBasedAlerts(latitude, longitude);
            setAlerts(data);
            
            // Auto-show evacuation modal if critical
            if (data.safety_status?.level === 'critical' && data.evacuation_recommendation && !silent) {
              setShowEvacuationModal(true);
            }
          } catch (err) {
            setError('Failed to fetch location-based alerts');
            console.error(err);
          } finally {
            setLoading(false);
            setRefreshing(false);
          }
        },
        (err) => {
          setError('Unable to access your location. Please enable location services.');
          setLoading(false);
          setRefreshing(false);
          console.error(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleNavigateToSite = (site) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${site.latitude},${site.longitude}`;
    window.open(url, '_blank');
  };

  // Severity configurations matching your app's style
  const getSeverityConfig = (level) => {
    const configs = {
      critical: {
        bg: 'bg-red-50 dark:bg-red-500/10',
        border: 'border-red-200 dark:border-red-500/20',
        text: 'text-red-600 dark:text-red-400',
        badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
        icon: AlertOctagon
      },
      high: {
        bg: 'bg-orange-50 dark:bg-orange-500/10',
        border: 'border-orange-200 dark:border-orange-500/20',
        text: 'text-orange-600 dark:text-orange-400',
        badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
        icon: AlertTriangle
      },
      medium: {
        bg: 'bg-yellow-50 dark:bg-yellow-500/10',
        border: 'border-yellow-200 dark:border-yellow-500/20',
        text: 'text-yellow-600 dark:text-yellow-400',
        badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
        icon: AlertCircle
      },
      low: {
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        border: 'border-blue-200 dark:border-blue-500/20',
        text: 'text-blue-600 dark:text-blue-400',
        badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        icon: Info
      },
      safe: {
        bg: 'bg-green-50 dark:bg-green-500/10',
        border: 'border-green-200 dark:border-green-500/20',
        text: 'text-green-600 dark:text-green-400',
        badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
        icon: CheckCircle
      }
    };
    return configs[level] || configs.safe;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center pb-20 lg:pb-0">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-sky-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Getting your location and safety status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4 pb-20 lg:pb-0">
        <div className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-6 max-w-md w-full">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Location Access Required</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => getCurrentLocationAndAlerts()}
              className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-6 rounded-full transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const safetyConfig = alerts?.safety_status ? getSeverityConfig(alerts.safety_status.level) : null;
  const SafetyIcon = safetyConfig?.icon;

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-20 lg:pb-4">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-200 dark:border-[rgb(47,51,54)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Safety Dashboard</h1>
                {location && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => getCurrentLocationAndAlerts(true)}
              disabled={refreshing}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[rgb(22,22,22)] transition disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Safety Status Card */}
        {alerts?.safety_status && safetyConfig && (
          <div className={`${safetyConfig.bg} border-2 ${safetyConfig.border} rounded-2xl p-6`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${safetyConfig.badge}`}>
                <SafetyIcon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className={`text-lg font-bold ${safetyConfig.text}`}>
                    {alerts.safety_status.level.toUpperCase()} SAFETY LEVEL
                  </h2>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${safetyConfig.badge}`}>
                    {alerts.safety_status.action}
                  </span>
                </div>
                <p className={`text-sm ${safetyConfig.text} mb-3`}>
                  {alerts.safety_status.message}
                </p>
                {alerts.safety_status.zone_name && (
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className={`${safetyConfig.text}`}>
                      <strong>Zone:</strong> {alerts.safety_status.zone_name}
                    </span>
                    {alerts.safety_status.distance_km !== undefined && (
                      <span className={`${safetyConfig.text}`}>
                        <strong>Distance:</strong> {alerts.safety_status.distance_km.toFixed(1)} km
                      </span>
                    )}
                  </div>
                )}
                {alerts.safety_status.level === 'critical' && (
                  <div className="mt-4 flex gap-2">
                    {alerts.evacuation_recommendation && (
                      <button
                        onClick={() => setShowEvacuationModal(true)}
                        className="bg-white dark:bg-black px-4 py-2 rounded-full font-semibold text-sm text-red-600 dark:text-red-400 hover:shadow-lg transition"
                      >
                        View Evacuation Plan
                      </button>
                    )}
                    <a
                      href="tel:112"
                      className="bg-white dark:bg-black px-4 py-2 rounded-full font-semibold text-sm text-red-600 dark:text-red-400 hover:shadow-lg transition flex items-center gap-1"
                    >
                      <Phone className="h-4 w-4" />
                      Call 112
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Zones and Sites (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Inside Red Zone Warning */}
            {alerts?.inside_red_zone && alerts?.red_zone_details && (
              <div className="bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/20 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">
                      ⚠️ YOU ARE INSIDE A RED ZONE
                    </h3>
                    <p className="text-red-600 dark:text-red-400 font-semibold mb-1">
                      {alerts.red_zone_details.name}
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {alerts.red_zone_details.hazard_types.join(', ')} • {alerts.red_zone_details.intensity.toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowEvacuationModal(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full font-bold text-sm transition whitespace-nowrap"
                  >
                    EVACUATE NOW
                  </button>
                </div>
              </div>
            )}

            {/* Nearby Red Zones */}
            {alerts?.nearby_red_zones && alerts.nearby_red_zones.length > 0 && (
              <div className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Nearby Red Zones ({alerts.nearby_red_zones.length})
                </h2>
                <div className="space-y-3">
                  {alerts.nearby_red_zones.slice(0, 5).map((zone) => {
                    const intensityColors = {
                      critical: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
                      high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
                      medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
                      low: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                    };
                    const intensityColor = intensityColors[zone.intensity] || intensityColors.medium;

                    return (
                      <div key={zone.id} className="bg-gray-50 dark:bg-black border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl p-4 hover:shadow-md transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{zone.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {zone.district}, {zone.state}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {zone.hazard_types.map((hazard, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium rounded-full"
                                >
                                  {hazard}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold border ${intensityColor}`}>
                              {zone.intensity.toUpperCase()}
                            </span>
                            {zone.distance_km !== undefined && (
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">
                                {zone.distance_km.toFixed(1)} km
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Nearest Safe Sites */}
            {alerts?.nearest_safe_sites && alerts.nearest_safe_sites.length > 0 && (
              <div className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Home className="h-5 w-5 text-green-500" />
                  Nearest Safe Sites ({alerts.nearest_safe_sites.length})
                </h2>
                <div className="space-y-3">
                  {alerts.nearest_safe_sites.map((site) => (
                    <div key={site.id} className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{site.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{site.district}</p>
                          <div className="flex items-center gap-2 mt-2 text-sm text-green-700 dark:text-green-400">
                            <Users className="h-4 w-4" />
                            <span className="font-medium">
                              {site.available_capacity} / {site.carrying_capacity} slots available
                            </span>
                          </div>
                          {site.facilities && site.facilities.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {site.facilities.slice(0, 4).map((facility, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full"
                                >
                                  {facility}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right space-y-2">
                          {site.distance_km !== undefined && (
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              {site.distance_km.toFixed(1)} km
                            </p>
                          )}
                          <button
                            onClick={() => handleNavigateToSite(site)}
                            className="text-xs bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 rounded-full font-medium transition flex items-center gap-1"
                          >
                            <Navigation className="h-3 w-3" />
                            Navigate
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Circulars (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Information & Updates
                </h2>
                {authUser?.role === 'admin' && (
                  <button
                    onClick={() => setShowCircularModal(true)}
                    className="p-2 rounded-full bg-sky-500 hover:bg-sky-600 text-white transition"
                    title="Add Information"
                  >
                    <PlusCircle className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {circulars && circulars.length > 0 ? (
                  circulars.slice(0, 10).map((circular) => {
                    const config = getSeverityConfig(circular.severity);
                    return (
                      <div key={circular.id} className={`${config.bg} border ${config.border} rounded-xl p-3 hover:shadow-md transition`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex-1">
                            {circular.title}
                          </h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.badge}`}>
                            {circular.severity}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
                          {circular.message}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(circular.created_at)}
                          </span>
                          {circular.district && (
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                              {circular.district}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No updates at the moment</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-6 text-white">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Emergency Contacts
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a href="tel:112" className="bg-white/20 hover:bg-white/30 rounded-xl p-3 text-center transition backdrop-blur-sm">
              <p className="text-2xl font-bold">112</p>
              <p className="text-sm opacity-90">Emergency</p>
            </a>
            <a href="tel:1078" className="bg-white/20 hover:bg-white/30 rounded-xl p-3 text-center transition backdrop-blur-sm">
              <p className="text-2xl font-bold">1078</p>
              <p className="text-sm opacity-90">Disaster Helpline</p>
            </a>
            <a href="tel:9711077372" className="bg-white/20 hover:bg-white/30 rounded-xl p-3 text-center transition backdrop-blur-sm">
              <p className="text-xl font-bold">NDRF</p>
              <p className="text-sm opacity-90">9711077372</p>
            </a>
          </div>
        </div>
      </div>

      {/* Evacuation Modal */}
      {showEvacuationModal && alerts?.evacuation_recommendation && (
        <EvacuationModal
          recommendation={alerts.evacuation_recommendation}
          onClose={() => setShowEvacuationModal(false)}
          onNavigate={handleNavigateToSite}
        />
      )}

      {/* Create Circular Modal */}
      {showCircularModal && (
        <CreateCircularModal
          onClose={() => setShowCircularModal(false)}
          authUser={authUser}
        />
      )}
    </div>
  );
};

// Evacuation Modal Component
const EvacuationModal = ({ recommendation, onClose, onNavigate }) => {
  if (!recommendation) return null;

  const { recommended_site, message, evacuation_steps } = recommendation;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Navigation className="h-6 w-6" />
                <h2 className="text-xl font-bold">Evacuation Recommendation</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/20 rounded-full transition"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Message */}
            <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-4">
              <p className="text-gray-800 dark:text-gray-200 font-medium">{message}</p>
            </div>

            {/* Recommended Site */}
            {recommended_site && (
              <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Home className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Recommended Relocation Site
                </h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-600 dark:text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{recommended_site.name}</p>
                      <p className="text-gray-600 dark:text-gray-400">
                        {recommended_site.latitude.toFixed(4)}°N, {recommended_site.longitude.toFixed(4)}°E
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Navigation className="h-4 w-4" />
                    <span><strong>{recommended_site.distance_km.toFixed(1)} km</strong> away</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Clock className="h-4 w-4" />
                    <span>Estimated travel time: <strong>{recommended_site.estimated_travel_time_minutes} minutes</strong></span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Users className="h-4 w-4" />
                    <span><strong>{recommended_site.available_capacity}</strong> household slots available</span>
                  </div>

                  {recommended_site.facilities && recommended_site.facilities.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-500/20">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Facilities:</p>
                      <div className="flex flex-wrap gap-1">
                        {recommended_site.facilities.map((facility, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full"
                          >
                            {facility}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Evacuation Steps */}
            {evacuation_steps && evacuation_steps.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Evacuation Steps:</h3>
                <ol className="space-y-2">
                  {evacuation_steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-sky-500 text-white rounded-full text-xs font-bold mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={() => recommended_site && onNavigate(recommended_site)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-full transition flex items-center justify-center gap-2"
              >
                <Navigation className="h-5 w-5" />
                Navigate to Site
              </button>
              
              <a
                href="tel:112"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-full transition flex items-center justify-center gap-2"
              >
                <Phone className="h-5 w-5" />
                Call Emergency (112)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Create Circular Modal Component
const CreateCircularModal = ({ onClose, authUser }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    severity: 'low',
    district: authUser?.district || '',
    state: authUser?.state || 'Kerala',
  });

  const createMutation = useMutation({
    mutationFn: createCircular,
    onSuccess: () => {
      toast.success('Information published successfully!');
      queryClient.invalidateQueries(['circulars']);
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to publish information');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Please fill in title and message');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl shadow-2xl max-w-2xl w-full">
          {/* Header */}
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 text-white px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6" />
                <h2 className="text-xl font-bold">Add Information / Circular</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/20 rounded-full transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-[rgb(47,51,54)] rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="e.g., Bridge Closure - NH47"
                maxLength={200}
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Message *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-[rgb(47,51,54)] rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Provide detailed information about the situation, affected areas, and any action required..."
                rows={4}
              />
            </div>

            {/* Severity and District Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Severity */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Severity
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[rgb(47,51,54)] rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* District */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  District (Optional)
                </label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[rgb(47,51,54)] rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="e.g., Wayanad"
                />
              </div>
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-[rgb(47,51,54)] rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="e.g., Kerala"
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                This information will be visible to all citizens in the Safety Dashboard and can help coordinate disaster response efforts.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold py-3 px-4 rounded-full transition"
                disabled={createMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 px-4 rounded-full transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5" />
                    Publish Information
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LocationAlertsPage;
