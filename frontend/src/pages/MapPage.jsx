import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Marker, useMapEvents, Tooltip } from 'react-leaflet';
import { fetchReports } from '../lib/api';
import { axiosInstance } from '../lib/axios';
import useAuthUser from '../hooks/useAuthUser';
import { AlertTriangle, MapPin, Clock, Shield, Home, Filter, X, Loader2, Plus, Target } from 'lucide-react';
import { DeploymentModal, ShelterModal } from '../components/MapResourceModals';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for deployments and shelters
const deploymentIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="blue" stroke-width="2">
      <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
      <circle cx="12" cy="10" r="3" fill="blue"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const shelterIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2">
      <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" transform="translate(0, 2) scale(0.6)" transform-origin="12 12" fill="green"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Component to set map bounds
const MapBounds = () => {
  const map = useMap();
  
  useEffect(() => {
    // India bounds: [southWest, northEast]
    const indiaBounds = L.latLngBounds(
      [6.5, 68.0],  // Southwest corner (southernmost, westernmost)
      [35.5, 97.5]  // Northeast corner (northernmost, easternmost)
    );
    
    // Set bounds immediately without animation
    map.setMaxBounds(indiaBounds);
    map.fitBounds(indiaBounds, { animate: false, duration: 0 });
    
    // Set min/max zoom
    map.setMinZoom(5);
    map.setMaxZoom(18);
  }, [map]);
  
  return null;
};

// Component to handle map clicks for picking locations
const MapClickHandler = ({ pickingMode, onLocationPicked }) => {
  const map = useMapEvents({
    click: (e) => {
      if (pickingMode) {
        const { lat, lng } = e.latlng;
        onLocationPicked(lat, lng);
        toast.success(`Location selected: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`);
      }
    },
  });

  // Change cursor when in picking mode
  useEffect(() => {
    if (pickingMode) {
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.getContainer().style.cursor = '';
    }
  }, [pickingMode, map]);

  return null;
};

const MapPage = () => {
  const [reports, setReports] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [center] = useState([20.5937, 78.9629]);
  const [showFilters, setShowFilters] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);
  const [showShelterModal, setShowShelterModal] = useState(false);
  const [pickingMode, setPickingMode] = useState(null); // 'deployment' or 'shelter'
  const [pickedCoords, setPickedCoords] = useState(null);
  const [filters, setFilters] = useState({
    reports: true,
    deployments: true,
    shelters: true,
  });
  const { authUser } = useAuthUser();
  const isAdmin = authUser?.role === 'admin';

  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = async () => {
    // Don't block UI - load in background
    try {
      // Load all data in parallel - using optimized map endpoint for reports
      const [reportsData, deploymentsRes, sheltersRes] = await Promise.all([
        axiosInstance.get('/map/map-reports').then(res => res.data).catch(() => []),
        axiosInstance.get('/map/deployments').catch(() => ({ data: [] })),
        axiosInstance.get('/map/shelters').catch(() => ({ data: [] })),
      ]);

      // Cluster nearby reports (within ~5km)
      const clusteredReports = clusterReports(reportsData || []);
      
      setReports(clusteredReports);
      setDeployments(deploymentsRes.data || []);
      setShelters(sheltersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch map data:', error);
    }
  };

  // Cluster reports that are close together
  const clusterReports = (reports) => {
    if (!reports.length) return [];
    
    const clustered = [];
    const processed = new Set();
    const CLUSTER_DISTANCE = 0.05; // ~5km in degrees
    
    reports.forEach((report, index) => {
      if (processed.has(index)) return;
      
      // Find all nearby reports
      const cluster = [report];
      processed.add(index);
      
      reports.forEach((otherReport, otherIndex) => {
        if (processed.has(otherIndex)) return;
        
        const distance = Math.sqrt(
          Math.pow(report.latitude - otherReport.latitude, 2) +
          Math.pow(report.longitude - otherReport.longitude, 2)
        );
        
        if (distance < CLUSTER_DISTANCE) {
          cluster.push(otherReport);
          processed.add(otherIndex);
        }
      });
      
      // Add cluster info to the main report
      clustered.push({
        ...report,
        cluster_count: cluster.length,
        cluster_reports: cluster,
      });
    });
    
    return clustered;
  };

  const openInMaps = (lat, lon, name) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&destination_place_id=${encodeURIComponent(name)}`;
    window.open(url, '_blank');
  };

  const handleLocationPicked = (lat, lng) => {
    setPickedCoords({ latitude: lat, longitude: lng });
    
    // Open the appropriate modal with picked coordinates
    if (pickingMode === 'deployment') {
      setShowDeploymentModal(true);
    } else if (pickingMode === 'shelter') {
      setShowShelterModal(true);
    }
    
    setPickingMode(null);
  };

  const startPickingLocation = (type) => {
    setShowAdminMenu(false);
    setPickingMode(type);
    toast(`📍 Click on the map to set ${type} location`, {
      duration: 4000,
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#f59e0b';
      case 'low': return '#84cc16';
      default: return '#6b7280';
    }
  };

  const getHotspotRadius = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 25;
      case 'high': return 20;
      case 'medium': return 15;
      case 'low': return 10;
      default: return 12;
    }
  };

  // Show map immediately - no loading screen blocking
  return (
    <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Top Bar - Live Incidents */}
      <div className="bg-white dark:bg-[rgb(22,22,22)] border-b border-gray-200 dark:border-[rgb(47,51,54)] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Live Incident Map</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Verified reports, rescue teams & shelters</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-400">
              {reports.length} Reports
            </span>
          </div>
          
          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 sm:p-2.5 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors"
          >
            <Filter size={16} className="text-sky-600 dark:text-sky-400" />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-[rgb(22,22,22)] border-b border-gray-200 dark:border-[rgb(47,51,54)] px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Map Filters</h3>
            <button onClick={() => setShowFilters(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-[rgb(38,38,38)] rounded">
              <X size={16} className="text-gray-500" />
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.reports}
                onChange={(e) => setFilters({ ...filters, reports: e.target.checked })}
                className="w-4 h-4 text-red-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Incident Hotspots ({reports.length})</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.deployments}
                onChange={(e) => setFilters({ ...filters, deployments: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Rescue Teams ({deployments.length})</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.shelters}
                onChange={(e) => setFilters({ ...filters, shelters: e.target.checked })}
                className="w-4 h-4 text-green-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Shelters ({shelters.length})</span>
            </label>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={center}
          zoom={5}
          minZoom={5}
          maxZoom={18}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          scrollWheelZoom={true}
          zoomControl={true}
          zoomAnimation={false}
          fadeAnimation={false}
        >
          <MapBounds />
          <MapClickHandler pickingMode={pickingMode} onLocationPicked={handleLocationPicked} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Hotspot markers for verified reports */}
          {filters.reports && reports.map((report) => (
            <CircleMarker
              key={`report-${report.id}`}
              center={[report.latitude, report.longitude]}
              radius={getHotspotRadius(report.severity)}
              pathOptions={{
                color: getSeverityColor(report.severity),
                fillColor: getSeverityColor(report.severity),
                fillOpacity: 0.6,
                weight: 2,
              }}
            >
              {report.cluster_count > 1 && (
                <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent className="cluster-tooltip">
                  <div className="bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-lg border-2 border-blue-500">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {report.cluster_count}
                    </span>
                  </div>
                </Tooltip>
              )}
              
              <Popup maxWidth={320} className="custom-popup">
                <div className="p-2">
                  {report.cluster_count > 1 && (
                    <div className="mb-3 px-3 py-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg">
                      <p className="text-sm font-bold text-blue-700 dark:text-blue-400">
                        📍 {report.cluster_count} Reports in this area
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-2 mb-2">
                    <MapPin size={16} className="text-red-500 mt-0.5 shrink-0" />
                    <h3 className="font-bold text-base text-gray-900">{report.hazard_type}</h3>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                    {report.description || 'No description provided'}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                      report.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      report.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                      report.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {report.severity?.toUpperCase()}
                    </span>
                    <span className="px-2 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-700">
                      VERIFIED
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
                    <Clock size={12} />
                    <span>{new Date(report.created_at).toLocaleString()}</span>
                  </div>
                  
                  {report.cluster_count > 1 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Other reports nearby:</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {report.cluster_reports.slice(1, 4).map((r) => (
                          <div key={r.id} className="text-xs text-gray-600 flex items-start gap-1">
                            <span className="text-gray-400">•</span>
                            <span className="line-clamp-1">{r.hazard_type}</span>
                          </div>
                        ))}
                        {report.cluster_reports.length > 4 && (
                          <p className="text-xs text-gray-500 italic">
                            +{report.cluster_reports.length - 4} more...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Deployment markers */}
          {filters.deployments && deployments.map((deployment) => (
            <Marker
              key={`deployment-${deployment.id}`}
              position={[deployment.latitude, deployment.longitude]}
              icon={deploymentIcon}
            >
              <Popup maxWidth={280}>
                <div className="p-2">
                  <div className="flex items-start gap-2 mb-2">
                    <Shield size={16} className="text-blue-600 mt-0.5 shrink-0" />
                    <h3 className="font-bold text-base text-gray-900">{deployment.team_name}</h3>
                  </div>
                  
                  <div className="space-y-1.5 mb-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Units:</span> {deployment.unit_count}
                    </p>
                    {deployment.personnel_count && (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Personnel:</span> {deployment.personnel_count}
                      </p>
                    )}
                    {deployment.equipment && (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Equipment:</span> {deployment.equipment}
                      </p>
                    )}
                    <span className={`inline-block px-2 py-1 rounded-md text-xs font-semibold ${
                      deployment.status === 'deployed' ? 'bg-blue-100 text-blue-700' :
                      deployment.status === 'en_route' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {deployment.status?.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                  
                  {deployment.notes && (
                    <p className="text-xs text-gray-600 mb-2">{deployment.notes}</p>
                  )}
                  
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock size={12} />
                    <span>Deployed: {new Date(deployment.deployed_at).toLocaleString()}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Shelter markers */}
          {filters.shelters && shelters.map((shelter) => (
            <Marker
              key={`shelter-${shelter.id}`}
              position={[shelter.latitude, shelter.longitude]}
              icon={shelterIcon}
            >
              <Popup maxWidth={300}>
                <div className="p-2">
                  <div className="flex items-start gap-2 mb-2">
                    <Home size={16} className="text-green-600 mt-0.5 shrink-0" />
                    <h3 className="font-bold text-base text-gray-900">{shelter.name}</h3>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{shelter.address}</p>
                  
                  <div className="space-y-1.5 mb-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Capacity:</span> {shelter.current_occupancy}/{shelter.capacity}
                    </p>
                    {shelter.contact_person && (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Contact:</span> {shelter.contact_person}
                      </p>
                    )}
                    {shelter.contact_phone && (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Phone:</span> {shelter.contact_phone}
                      </p>
                    )}
                    <span className={`inline-block px-2 py-1 rounded-md text-xs font-semibold ${
                      shelter.status === 'active' ? 'bg-green-100 text-green-700' :
                      shelter.status === 'full' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {shelter.status?.toUpperCase()}
                    </span>
                  </div>
                  
                  {shelter.facilities && (
                    <p className="text-xs text-gray-600 mb-3">
                      <span className="font-semibold">Facilities:</span> {shelter.facilities}
                    </p>
                  )}
                  
                  <button
                    onClick={() => openInMaps(shelter.latitude, shelter.longitude, shelter.name)}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Navigate to Shelter
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Picking Mode Overlay */}
        {pickingMode && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1001] pointer-events-none">
            <div className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-200">
              <Target className="animate-pulse" size={20} />
              <div>
                <p className="font-bold text-sm">Click on map to set location</p>
                <p className="text-xs opacity-90">
                  {pickingMode === 'deployment' ? 'Deploying rescue team' : 'Adding shelter'}
                </p>
              </div>
              <button
                onClick={() => setPickingMode(null)}
                className="ml-2 p-1 hover:bg-white/20 rounded pointer-events-auto transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Admin Floating Action Buttons */}
        {isAdmin && (
          <div className="absolute bottom-4 left-4 z-[1000]">
            {showAdminMenu && (
              <div className="mb-3 space-y-2 animate-in slide-in-from-bottom-2 duration-200">
                <button
                  onClick={() => startPickingLocation('deployment')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg transition-all w-full"
                >
                  <Shield size={16} />
                  Deploy Rescue Team
                </button>
                <button
                  onClick={() => startPickingLocation('shelter')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold shadow-lg transition-all w-full"
                >
                  <Home size={16} />
                  Add Shelter
                </button>
              </div>
            )}
            <button
              onClick={() => setShowAdminMenu(!showAdminMenu)}
              className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
                showAdminMenu 
                  ? 'bg-gray-600 hover:bg-gray-700 rotate-45' 
                  : 'bg-sky-600 hover:bg-sky-700'
              } text-white`}
            >
              <Plus size={24} />
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl p-3 shadow-lg z-[1000] text-xs">
          <h4 className="font-bold text-gray-900 dark:text-white mb-2">Legend</h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-600"></div>
              <span className="text-gray-700 dark:text-gray-300">Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-600"></div>
              <span className="text-gray-700 dark:text-gray-300">High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-gray-700 dark:text-gray-300">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-700 dark:text-gray-300">Low</span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-blue-600" />
              <span className="text-gray-700 dark:text-gray-300">Rescue Team</span>
            </div>
            <div className="flex items-center gap-2">
              <Home size={14} className="text-green-600" />
              <span className="text-gray-700 dark:text-gray-300">Shelter</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showDeploymentModal && (
        <DeploymentModal
          initialCoords={pickedCoords}
          onClose={() => {
            setShowDeploymentModal(false);
            setPickedCoords(null);
          }}
          onSuccess={() => {
            loadMapData();
            setShowDeploymentModal(false);
            setPickedCoords(null);
          }}
        />
      )}

      {showShelterModal && (
        <ShelterModal
          initialCoords={pickedCoords}
          onClose={() => {
            setShowShelterModal(false);
            setPickedCoords(null);
          }}
          onSuccess={() => {
            loadMapData();
            setShowShelterModal(false);
            setPickedCoords(null);
          }}
        />
      )}
    </div>
  );
};

export default MapPage;
