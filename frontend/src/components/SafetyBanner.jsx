import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, Shield } from 'lucide-react';

const SafetyBanner = ({ safetyStatus }) => {
  if (!safetyStatus) return null;

  const { level, message, action, color } = safetyStatus;

  // Color and icon mapping
  const config = {
    critical: {
      bg: 'bg-red-600',
      text: 'text-white',
      border: 'border-red-700',
      icon: AlertTriangle,
      iconColor: 'text-white'
    },
    high: {
      bg: 'bg-orange-500',
      text: 'text-white',
      border: 'border-orange-600',
      icon: AlertCircle,
      iconColor: 'text-white'
    },
    medium: {
      bg: 'bg-yellow-400',
      text: 'text-gray-900',
      border: 'border-yellow-500',
      icon: AlertCircle,
      iconColor: 'text-gray-900'
    },
    low: {
      bg: 'bg-blue-500',
      text: 'text-white',
      border: 'border-blue-600',
      icon: Info,
      iconColor: 'text-white'
    },
    safe: {
      bg: 'bg-green-500',
      text: 'text-white',
      border: 'border-green-600',
      icon: CheckCircle,
      iconColor: 'text-white'
    }
  };

  const currentConfig = config[level] || config.safe;
  const IconComponent = currentConfig.icon;

  return (
    <div className={`${currentConfig.bg} ${currentConfig.text} border-b-4 ${currentConfig.border} shadow-lg`}>
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="flex items-center flex-1">
            <span className="flex p-2 rounded-lg bg-white bg-opacity-20">
              <IconComponent className={`h-6 w-6 ${currentConfig.iconColor}`} />
            </span>
            <div className="ml-3 flex-1">
              <p className="font-semibold text-sm sm:text-base">
                {message}
              </p>
              {action && (
                <p className="mt-1 text-xs sm:text-sm opacity-90 font-medium">
                  Action: {action}
                </p>
              )}
              {safetyStatus.zone_name && (
                <p className="mt-1 text-xs opacity-80">
                  Zone: {safetyStatus.zone_name}
                  {safetyStatus.distance_km !== undefined && ` (${safetyStatus.distance_km.toFixed(1)}km away)`}
                </p>
              )}
            </div>
          </div>
          
          {level === 'critical' && (
            <div className="mt-2 sm:mt-0 sm:ml-4">
              <a
                href="tel:112"
                className="inline-flex items-center px-4 py-2 border-2 border-white text-sm font-bold rounded-lg hover:bg-white hover:text-red-600 transition-colors"
              >
                <Shield className="h-4 w-4 mr-2" />
                CALL 112
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SafetyBanner;
