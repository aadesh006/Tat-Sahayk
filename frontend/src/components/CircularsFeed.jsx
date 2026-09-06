import React, { useState, useEffect } from 'react';
import { Info, AlertCircle, AlertTriangle, XCircle, Clock, User } from 'lucide-react';
import { getCirculars } from '../lib/api';

const CircularsFeed = () => {
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, critical, high, medium, low

  useEffect(() => {
    fetchCirculars();
  }, []);

  const fetchCirculars = async () => {
    try {
      setLoading(true);
      const data = await getCirculars(true);
      setCirculars(data);
    } catch (error) {
      console.error('Error fetching circulars:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityConfig = (severity) => {
    const configs = {
      critical: {
        bg: 'bg-red-50',
        border: 'border-red-300',
        icon: AlertTriangle,
        iconColor: 'text-red-600',
        badge: 'bg-red-100 text-red-800'
      },
      high: {
        bg: 'bg-orange-50',
        border: 'border-orange-300',
        icon: AlertCircle,
        iconColor: 'text-orange-600',
        badge: 'bg-orange-100 text-orange-800'
      },
      medium: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-300',
        icon: AlertCircle,
        iconColor: 'text-yellow-600',
        badge: 'bg-yellow-100 text-yellow-800'
      },
      low: {
        bg: 'bg-blue-50',
        border: 'border-blue-300',
        icon: Info,
        iconColor: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-800'
      }
    };
    return configs[severity] || configs.low;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  const filteredCirculars = filter === 'all' 
    ? circulars 
    : circulars.filter(c => c.severity === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Info className="h-5 w-5 mr-2 text-blue-600" />
            Information & Updates
          </h2>
          <span className="text-sm text-gray-500">{circulars.length} active</span>
        </div>

        {/* Severity Filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
              filter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({circulars.length})
          </button>
          {['critical', 'high', 'medium', 'low'].map(sev => {
            const count = circulars.filter(c => c.severity === sev).length;
            if (count === 0) return null;
            return (
              <button
                key={sev}
                onClick={() => setFilter(sev)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  filter === sev
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {sev.charAt(0).toUpperCase() + sev.slice(1)} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Circulars List */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {filteredCirculars.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <Info className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No {filter !== 'all' ? filter : ''} circulars at the moment</p>
          </div>
        ) : (
          filteredCirculars.map((circular) => {
            const config = getSeverityConfig(circular.severity);
            const IconComponent = config.icon;

            return (
              <div key={circular.id} className={`p-4 hover:bg-gray-50 transition`}>
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`flex-shrink-0 p-2 rounded-lg ${config.bg} border ${config.border}`}>
                    <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                        {circular.title}
                      </h3>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${config.badge}`}>
                        {circular.severity}
                      </span>
                    </div>

                    <p className="text-gray-700 text-sm mb-2 whitespace-pre-wrap">
                      {circular.message}
                    </p>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(circular.created_at)}
                      </span>
                      
                      {circular.admin_name && (
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {circular.admin_name}
                        </span>
                      )}

                      {circular.district && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded-full">
                          {circular.district}
                        </span>
                      )}

                      {circular.expires_at && (
                        <span className="text-orange-600">
                          Expires: {new Date(circular.expires_at).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Refresh Button */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <button
          onClick={fetchCirculars}
          className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium transition"
        >
          Refresh Updates
        </button>
      </div>
    </div>
  );
};

export default CircularsFeed;
