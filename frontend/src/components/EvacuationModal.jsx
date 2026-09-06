import React from 'react';
import { X, Navigation, Phone, MapPin, Users, Home, Clock } from 'lucide-react';

const EvacuationModal = ({ isOpen, onClose, recommendation, onNavigate }) => {
  if (!isOpen || !recommendation) return null;

  const { urgency, recommended_site, message, evacuation_steps } = recommendation;

  const urgencyColors = {
    high: 'bg-red-600 text-white',
    medium: 'bg-orange-500 text-white',
    low: 'bg-blue-500 text-white'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className={`${urgencyColors[urgency] || urgencyColors.medium} px-6 py-4 rounded-t-lg`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Navigation className="h-6 w-6 mr-3" />
                <h2 className="text-xl font-bold">Evacuation Recommendation</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Message */}
            <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
              <p className="text-gray-800 font-medium">{message}</p>
            </div>

            {/* Recommended Site Details */}
            {recommended_site && (
              <div className="mb-6 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
                  <Home className="h-5 w-5 mr-2 text-green-600" />
                  Recommended Relocation Site
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 mr-3 text-gray-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">{recommended_site.name}</p>
                      <p className="text-sm text-gray-600">
                        {recommended_site.latitude.toFixed(4)}°N, {recommended_site.longitude.toFixed(4)}°E
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Navigation className="h-5 w-5 mr-3 text-gray-600" />
                    <span className="text-gray-700">
                      <span className="font-semibold">{recommended_site.distance_km.toFixed(1)} km</span> away
                    </span>
                  </div>

                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-3 text-gray-600" />
                    <span className="text-gray-700">
                      Estimated travel time: <span className="font-semibold">{recommended_site.estimated_travel_time_minutes} minutes</span>
                    </span>
                  </div>

                  <div className="flex items-center">
                    <Users className="h-5 w-5 mr-3 text-gray-600" />
                    <span className="text-gray-700">
                      <span className="font-semibold">{recommended_site.available_capacity}</span> household slots available
                    </span>
                  </div>

                  {recommended_site.facilities && recommended_site.facilities.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Facilities Available:</p>
                      <div className="flex flex-wrap gap-2">
                        {recommended_site.facilities.map((facility, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full"
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
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Evacuation Steps:</h3>
                <ol className="space-y-2">
                  {evacuation_steps.map((step, index) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full text-xs font-bold mr-3 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onNavigate}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center"
              >
                <Navigation className="h-5 w-5 mr-2" />
                Navigate to Site
              </button>
              
              <a
                href="tel:112"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center"
              >
                <Phone className="h-5 w-5 mr-2" />
                Call Emergency (112)
              </a>
            </div>

            {/* Emergency Contacts */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 font-semibold mb-2">Emergency Contacts:</p>
              <div className="flex flex-wrap gap-2 text-xs text-gray-700">
                <span>Emergency: <a href="tel:112" className="text-blue-600 font-semibold">112</a></span>
                <span>•</span>
                <span>Disaster Helpline: <a href="tel:1078" className="text-blue-600 font-semibold">1078</a></span>
                <span>•</span>
                <span>NDRF: <a href="tel:9711077372" className="text-blue-600 font-semibold">9711077372</a></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvacuationModal;
