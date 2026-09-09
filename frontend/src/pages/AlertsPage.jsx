import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { AlertOctagon, MapPin, Calendar, Shield, Bell, Filter, Loader2, Home, Users, Navigation, Phone, Clock, PlusCircle, X, FileText, RefreshCw, Info, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAlerts, getLocationBasedAlerts, getCirculars, createCircular, deleteAlert } from '../lib/api.js';
import useAuthUser from '../hooks/useAuthUser.js';
import { Toaster, toast } from 'react-hot-toast';

const SEVERITY_FILTERS = [
  { label: "All", value: "" },
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const AlertsPage = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState("");
  const [showCircularModal, setShowCircularModal] = useState(false);
  const [showSafetyPopup, setShowSafetyPopup] = useState(false);
  const [locationAlerts, setLocationAlerts] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState("alerts"); // Mobile tabs

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: fetchAlerts,
    refetchInterval: 60000,
  });

  const { data: circulars } = useQuery({
    queryKey: ['circulars'],
    queryFn: () => getCirculars(true),
    refetchInterval: 60000,
  });

  // Delete alert/circular mutation
  const deleteMutation = useMutation({
    mutationFn: deleteAlert,
    onSuccess: () => {
      queryClient.invalidateQueries(['alerts']);
      queryClient.invalidateQueries(['circulars']);
      toast.success('Deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    }
  });

  const handleDelete = (alertId) => {
    if (window.confirm('Are you sure you want to delete this alert/circular? This action cannot be undone.')) {
      deleteMutation.mutate(alertId);
    }
  };

  // Auto-show safety popup for regular users on first visit
  useEffect(() => {
    if (authUser && authUser.role !== 'admin') {
      const hasSeenPopup = sessionStorage.getItem('safetyPopupSeen');
      if (!hasSeenPopup) {
        setShowSafetyPopup(true);
        sessionStorage.setItem('safetyPopupSeen', 'true');
      }
    }
  }, [authUser]);

  // Auto-load location data on mount
  useEffect(() => {
    loadLocationBasedData();
  }, []);

  const loadLocationBasedData = async () => {
    if ('geolocation' in navigator) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const data = await getLocationBasedAlerts(
              position.coords.latitude,
              position.coords.longitude
            );
            setLocationAlerts(data);
          } catch (err) {
            console.error('Failed to load location data:', err);
          } finally {
            setLocationLoading(false);
          }
        },
        (err) => {
          console.error('Geolocation error:', err);
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  };

  const filteredAlerts = alerts?.filter(alert => 
    alert.hazard_type !== 'info' && // Exclude circulars from alerts
    (!severityFilter || alert.severity === severityFilter)
  );

  const severityConfig = {
    critical: { 
      bg: "bg-red-50 dark:bg-red-500/10", 
      border: "border-red-200 dark:border-red-500/20",
      text: "text-red-600 dark:text-red-400",
      icon: "text-red-500",
      badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"
    },
    high: { 
      bg: "bg-orange-50 dark:bg-orange-500/10", 
      border: "border-orange-200 dark:border-orange-500/20",
      text: "text-orange-600 dark:text-orange-400",
      icon: "text-orange-500",
      badge: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700"
    },
    medium: { 
      bg: "bg-yellow-50 dark:bg-yellow-500/10", 
      border: "border-yellow-200 dark:border-yellow-500/20",
      text: "text-yellow-600 dark:text-yellow-400",
      icon: "text-yellow-500",
      badge: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"
    },
    low: { 
      bg: "bg-sky-50 dark:bg-sky-500/10", 
      border: "border-sky-200 dark:border-sky-500/20",
      text: "text-sky-600 dark:text-sky-400",
      icon: "text-sky-500",
      badge: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700"
    },
    safe: {
      bg: 'bg-green-50 dark:bg-green-500/10',
      border: 'border-green-200 dark:border-green-500/20',
      text: 'text-green-600 dark:text-green-400',
      badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    }
  };

  const getLocationText = (alert) => {
    if (alert.district && alert.state) {
      return `${alert.district}, ${alert.state}`;
    } else if (alert.state) {
      return `${alert.state} (State-wide)`;
    } else {
      return "Nationwide";
    }
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-20 lg:pb-0">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md px-4 lg:px-6 py-3 border-b border-gray-200 dark:border-[rgb(47,51,54)]">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell size={20} className="text-sky-500" />
              {authUser?.role === 'admin' ? 'Alerts & Safety Management' : 'Alerts & Safety Dashboard'}
            </h1>
            {authUser?.district && (
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                <MapPin size={12} />
                {authUser.district}, {authUser.state}
              </p>
            )}
          </div>
          {authUser?.role !== 'admin' && (
            <button
              onClick={() => setShowSafetyPopup(true)}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-medium rounded-full transition"
            >
              Check My Safety
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Tabs */}
        <div className="lg:hidden flex gap-2 mb-4">
          <button
            onClick={() => setMobileTab("alerts")}
            className={`flex-1 py-2.5 rounded-full text-sm font-medium transition ${
              mobileTab === "alerts"
                ? "bg-sky-500 text-white"
                : "bg-white dark:bg-[rgb(22,22,22)] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[rgb(47,51,54)]"
            }`}
          >
            Emergency Alerts
          </button>
          <button
            onClick={() => setMobileTab("information")}
            className={`flex-1 py-2.5 rounded-full text-sm font-medium transition ${
              mobileTab === "information"
                ? "bg-sky-500 text-white"
                : "bg-white dark:bg-[rgb(22,22,22)] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[rgb(47,51,54)]"
            }`}
          >
            Info & Resources
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left 2/3 - Hidden on mobile when showing information */}
          <div className={`lg:col-span-2 space-y-6 ${mobileTab === "information" ? "hidden lg:block" : ""}`}>
            {/* Admin Safe Zones Section */}
            {authUser?.role === 'admin' && (
              <div className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Home size={18} className="text-green-500" />
                    Safe Sites in {authUser.district}
                  </h2>
                  <button
                    onClick={loadLocationBasedData}
                    disabled={locationLoading}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[rgb(22,22,22)] transition disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${locationLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {locationLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="animate-spin h-8 w-8 text-sky-500 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Loading sites...</p>
                  </div>
                ) : locationAlerts?.nearest_safe_sites?.length > 0 ? (
                  <div className="space-y-3">
                    {locationAlerts.nearest_safe_sites
                      .filter(site => site.district === authUser.district) // Filter by admin's district
                      .slice(0, 5)
                      .map((site) => (
                        <div key={site.id} className="bg-gray-50 dark:bg-black border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{site.name}</h3>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{site.district}</p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-gray-700 dark:text-gray-300">
                                <Users className="h-3.5 w-3.5" />
                                <span>
                                  {site.available_capacity} / {site.carrying_capacity} available
                                </span>
                              </div>
                            </div>
                            {site.distance_km !== undefined && (
                              <div className="text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
                                {site.distance_km.toFixed(1)} km
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    {locationAlerts.nearest_safe_sites.filter(site => site.district === authUser.district).length === 0 && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No safe sites found in {authUser.district}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No safe sites found nearby</p>
                  </div>
                )}
              </div>
            )}

            {/* Info Banner */}
            <div className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Shield size={18} className="text-sky-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    Official Communications
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Verified alerts from government administrators
                    {authUser?.district && ` for ${authUser.district} and nationwide`}.
                  </p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <Filter size={16} className="text-gray-400 dark:text-gray-500 shrink-0" />
              {SEVERITY_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setSeverityFilter(f.value)}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all
                    ${severityFilter === f.value
                      ? "bg-sky-500 text-white shadow-sm"
                      : "bg-white dark:bg-[rgb(22,22,22)] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[rgb(47,51,54)] hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)]"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Alerts List */}
            {isLoading ? (
              <div className="flex flex-col items-center py-12 bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl">
                <Loader2 className="animate-spin text-sky-500 mb-3" size={28} />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
              </div>
            ) : filteredAlerts?.length > 0 ? (
              <div className="space-y-4">
                {filteredAlerts.map((alert) => {
                  const config = severityConfig[alert.severity] || severityConfig.low;
                  
                  return (
                    <article
                      key={alert.id}
                      className={`${config.bg} border ${config.border} rounded-2xl p-4 transition-all`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-white dark:bg-[rgb(22,22,22)] border ${config.border} flex items-center justify-center shrink-0`}>
                          <AlertOctagon size={18} className={config.icon} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.badge}`}>
                              {alert.severity.toUpperCase()}
                            </span>
                            {alert.hazard_type && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white dark:bg-[rgb(22,22,22)] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[rgb(47,51,54)]">
                                {alert.hazard_type}
                              </span>
                            )}
                          </div>
                          <h2 className={`text-base font-semibold ${config.text} mb-2`}>
                            {alert.title}
                          </h2>
                          <p className={`text-sm ${config.text} opacity-90`}>
                            {alert.message}
                          </p>
                        </div>
                        {authUser?.role === 'admin' && authUser?.id === alert.admin_id && (
                          <button
                            onClick={() => handleDelete(alert.id)}
                            disabled={deleteMutation.isPending}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition disabled:opacity-50"
                            title="Delete alert"
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-[rgb(47,51,54)] text-[11px] text-gray-600 dark:text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Shield size={11} />
                          {alert.admin_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={11} />
                          {getLocationText(alert)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(alert.created_at).toLocaleString("en-IN", { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl">
                <Bell className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={36} />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {severityFilter ? "No alerts match this filter" : "No alerts"}
                </p>
              </div>
            )}
          </div>

          {/* Right Sidebar - 1/3 - Hidden on mobile when showing alerts */}
          <div className={`lg:col-span-1 ${mobileTab === "alerts" ? "hidden lg:block" : ""}`}>
            <div className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-4 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Information
                </h2>
                {authUser?.role === 'admin' && (
                  <button
                    onClick={() => setShowCircularModal(true)}
                    className="p-1.5 rounded-full bg-sky-500 hover:bg-sky-600 text-white transition"
                    title="Add"
                  >
                    <PlusCircle size={16} />
                  </button>
                )}
              </div>
              
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {circulars && circulars.length > 0 ? (
                  circulars.slice(0, 10).map((circular) => {
                    const config = severityConfig[circular.severity] || severityConfig.low;
                    return (
                      <div key={circular.id} className={`${config.bg} border ${config.border} rounded-xl p-3`}>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-xs flex-1">
                            {circular.title}
                          </h3>
                          <div className="flex items-center gap-1">
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${config.badge}`}>
                              {circular.severity}
                            </span>
                            {authUser?.role === 'admin' && authUser?.id === circular.admin_id && (
                              <button
                                onClick={() => handleDelete(circular.id)}
                                disabled={deleteMutation.isPending}
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition disabled:opacity-50"
                                title="Delete circular"
                              >
                                <Trash2 size={12} className="text-red-500" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
                          {circular.message}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDate(circular.created_at)}
                          {circular.district && (
                            <>
                              <span>•</span>
                              <span>{circular.district}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Info className="h-7 w-7 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No updates</p>
                  </div>
                )}
              </div>

              {/* Emergency Contacts */}
              <div className="mt-5 pt-4 border-t border-gray-200 dark:border-[rgb(47,51,54)]">
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-2.5">
                  Emergency Contacts
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { number: '112', label: 'Emergency' },
                    { number: '1078', label: 'Disaster' },
                    { number: '108', label: 'Ambulance' }
                  ].map(contact => (
                    <a
                      key={contact.number}
                      href={`tel:${contact.number}`}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-black border border-gray-200 dark:border-[rgb(47,51,54)] hover:bg-gray-100 dark:hover:bg-[rgb(22,22,22)] transition"
                    >
                      <span className="text-xs text-gray-700 dark:text-gray-300">{contact.label}</span>
                      <span className="text-base font-bold text-gray-900 dark:text-white">{contact.number}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Popup Modal */}
      {showSafetyPopup && (
        <SafetyPopupModal
          onClose={() => setShowSafetyPopup(false)}
          severityConfig={severityConfig}
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

// Safety Popup Modal for Regular Users
const SafetyPopupModal = ({ onClose, severityConfig }) => {
  const [location, setLocation] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });

          try {
            const data = await getLocationBasedAlerts(latitude, longitude);
            setAlerts(data);
          } catch (err) {
            setError('Failed to fetch safety information');
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          setError('Unable to access location. Please enable location services.');
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setError('Geolocation not supported');
      setLoading(false);
    }
  }, []);

  const handleNavigate = (site) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${site.latitude},${site.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 text-white px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6" />
                <h2 className="text-xl font-bold">Your Safety Status</h2>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="animate-spin h-12 w-12 text-sky-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Checking your area...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                <button
                  onClick={onClose}
                  className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-6 rounded-full transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Safety Status */}
                {alerts?.safety_status && (() => {
                  const config = severityConfig[alerts.safety_status.level] || severityConfig.safe;
                  return (
                    <div className={`${config.bg} border ${config.border} rounded-xl p-4`}>
                      <h3 className={`text-lg font-bold ${config.text} mb-2`}>
                        {alerts.safety_status.level.toUpperCase()} LEVEL
                      </h3>
                      <p className={`text-sm ${config.text}`}>
                        {alerts.safety_status.message}
                      </p>
                      {alerts.safety_status.level === 'critical' && (
                        <a
                          href="tel:112"
                          className="mt-3 inline-flex items-center gap-2 bg-white dark:bg-black px-4 py-2 rounded-full font-semibold text-sm text-red-600 dark:text-red-400"
                        >
                          <Phone className="h-4 w-4" />
                          Call 112 Emergency
                        </a>
                      )}
                    </div>
                  );
                })()}

                {/* Nearby Safe Sites */}
                {alerts?.nearest_safe_sites?.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                      Nearest Safe Sites
                    </h3>
                    <div className="space-y-2">
                      {alerts.nearest_safe_sites.slice(0, 3).map((site) => (
                        <div key={site.id} className="bg-gray-50 dark:bg-black border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{site.name}</h4>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {site.distance_km?.toFixed(1)} km away • {site.available_capacity} slots
                              </p>
                            </div>
                            <button
                              onClick={() => handleNavigate(site)}
                              className="text-xs bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 rounded-full font-medium transition flex items-center gap-1"
                            >
                              <Navigation className="h-3 w-3" />
                              Navigate
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={onClose}
                  className="w-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold py-3 rounded-full transition"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Create Circular Modal
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
      toast.success('Information published');
      queryClient.invalidateQueries(['circulars']);
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to publish');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Title and message required');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl shadow-2xl max-w-2xl w-full">
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 text-white px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Add Information</h2>
              <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Message *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-[rgb(47,51,54)] rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Provide detailed information..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  District
                </label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[rgb(47,51,54)] rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Optional"
                />
              </div>
            </div>

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
                  'Publish'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AlertsPage;
