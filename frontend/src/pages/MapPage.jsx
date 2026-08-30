import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Marker, useMapEvents, Tooltip, Polygon } from 'react-leaflet';
import { fetchReports } from '../lib/api';
import { axiosInstance } from '../lib/axios';
import useAuthUser from '../hooks/useAuthUser';
import { AlertTriangle, MapPin, Clock, Shield, Home, Filter, X, Loader2, Plus, Target, Pentagon, RefreshCw, Map } from 'lucide-react';
import { DeploymentModal, ShelterModal } from '../components/MapResourceModals';
import { HazardZoneModal } from '../components/HazardZoneModal';
import MapPolygonDrawer from '../components/MapPolygonDrawer';
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

// Component to set map bounds and jurisdiction-based centering
const MapBounds = ({ authUser, districtCoordinates }) => {
  const map = useMap();
  
  useEffect(() => {
    // India bounds: [southWest, northEast]
    const indiaBounds = L.latLngBounds(
      [6.5, 68.0],  // Southwest corner (southernmost, westernmost)
      [35.5, 97.5]  // Northeast corner (northernmost, easternmost)
    );
    
    // Set bounds
    map.setMaxBounds(indiaBounds);
    
    // Set min/max zoom
    map.setMinZoom(5);
    map.setMaxZoom(18);

    // Set initial view based on admin's jurisdiction
    if (authUser?.role === 'admin' && authUser?.district) {
      console.log('Admin detected:', authUser);
      console.log('District:', authUser.district);
      console.log('Available districts:', Object.keys(districtCoordinates));
      
      const districtCenter = districtCoordinates[authUser.district];
      console.log('District center:', districtCenter);
      
      if (districtCenter) {
        // Zoom to district with more zoom for better view
        map.setView(districtCenter, 11, { animate: true, duration: 1 });
        console.log(`✓ Map locked to district: ${authUser.district} at ${districtCenter}`);
      } else {
        console.warn(`District "${authUser.district}" not found in coordinates map`);
        // District not in coordinates map, zoom to India
        map.fitBounds(indiaBounds, { animate: false, duration: 0 });
      }
    } else {
      console.log('National admin or regular user - showing full India');
      // National admin or regular user - show full India
      map.fitBounds(indiaBounds, { animate: false, duration: 0 });
    }
  }, [map, authUser?.district, authUser?.role]);
  
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
  const { authUser } = useAuthUser();
  const [reports, setReports] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [redZones, setRedZones] = useState([]);
  const [habitations, setHabitations] = useState([]);
  const [relocationSites, setRelocationSites] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // District coordinates mapping for major Indian districts
  const districtCoordinates = {
    // Maharashtra
    'Mumbai': [19.0760, 72.8777],
    'Mumbai Suburban': [19.0760, 72.8777],
    'Mumbai City': [18.9388, 72.8354],
    'Thane': [19.2183, 72.9781],
    'Pune': [18.5204, 73.8567],
    'Nagpur': [21.1458, 79.0882],
    'Nashik': [19.9975, 73.7898],
    'Aurangabad': [19.8762, 75.3433],
    
    // Kerala
    'Wayanad': [11.6854, 76.1320],
    'Thiruvananthapuram': [8.5241, 76.9366],
    'Kochi': [9.9312, 76.2673],
    'Ernakulam': [9.9312, 76.2673],
    'Kozhikode': [11.2588, 75.7804],
    'Alappuzha': [9.4981, 76.3388],
    'Idukki': [9.9186, 77.1025],
    
    // Uttarakhand
    'Chamoli': [30.4000, 79.3300],
    'Dehradun': [30.3165, 78.0322],
    'Haridwar': [29.9457, 78.1642],
    'Nainital': [29.3803, 79.4636],
    'Uttarkashi': [30.7268, 78.4354],
    
    // Odisha
    'Kendrapara': [20.5020, 86.4221],
    'Khordha': [20.1809, 85.6097],
    'Puri': [19.8135, 85.8312],
    'Cuttack': [20.4625, 85.8830],
    
    // Assam
    'Majuli': [26.9500, 94.1667],
    'Kamrup': [26.1445, 91.7362],
    'Guwahati': [26.1445, 91.7362],
    
    // Bihar
    'Muzaffarpur': [26.1225, 85.3647],
    'Patna': [25.5941, 85.1376],
    
    // West Bengal
    'Kolkata': [22.5726, 88.3639],
    'Darjeeling': [27.0360, 88.2627],
    
    // Tamil Nadu
    'Chennai': [13.0827, 80.2707],
    'Coimbatore': [11.0168, 76.9558],
    
    // Karnataka
    'Bengaluru': [12.9716, 77.5946],
    'Bangalore': [12.9716, 77.5946],
    'Mysuru': [12.2958, 76.6394],
    
    // Gujarat
    'Ahmedabad': [23.0225, 72.5714],
    'Surat': [21.1702, 72.8311],
    
    // Rajasthan
    'Jaipur': [26.9124, 75.7873],
    'Udaipur': [24.5854, 73.7125],
    
    // Himachal Pradesh
    'Shimla': [31.1048, 77.1734],
    'Kullu': [31.9578, 77.1092],
    
    // Jammu & Kashmir
    'Srinagar': [34.0837, 74.7973],
    'Jammu': [32.7266, 74.8570],
  };

  // Determine map center based on admin's district
  const getMapCenter = () => {
    if (authUser?.role === 'admin' && authUser?.district) {
      const districtCenter = districtCoordinates[authUser.district];
      if (districtCenter) {
        return districtCenter;
      }
    }
    // Default to India center
    return [20.5937, 78.9629];
  };

  // Determine initial zoom based on whether viewing district or country
  const getInitialZoom = () => {
    if (authUser?.role === 'admin' && authUser?.district && districtCoordinates[authUser.district]) {
      return 10; // Zoomed in for district view
    }
    return 5; // Country-level view
  };

  const [center] = useState(getMapCenter());
  const [initialZoom] = useState(getInitialZoom());
  const [showFilters, setShowFilters] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);
  const [showShelterModal, setShowShelterModal] = useState(false);
  const [pickingMode, setPickingMode] = useState(null); // 'deployment' or 'shelter'
  const [pickedCoords, setPickedCoords] = useState(null);
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [drawnPolygonCoords, setDrawnPolygonCoords] = useState(null);
  const [showPolygonModal, setShowPolygonModal] = useState(false);
  const [showLegend, setShowLegend] = useState(false); // For mobile legend toggle
  const [filters, setFilters] = useState({
    reports: true,
    deployments: true,
    shelters: true,
    redZones: true,
    habitations: true,
    relocationSites: true,
  });
  const isAdmin = authUser?.role === 'admin';

  useEffect(() => {
    loadMapData();
  }, []);

  // Auto-refresh map data every 5 minutes — no backend cost, just re-fetches cached data
  useEffect(() => {
    const interval = setInterval(() => {
      loadMapData()
    }, 5 * 60 * 1000) // 5 minutes
    return () => clearInterval(interval)
  }, [])

  const loadMapData = async () => {
    // Don't block UI - load in background
    try {
      // Load all data in parallel - using optimized map endpoint for reports
      const [reportsData, deploymentsRes, sheltersRes, redZonesRes, habitationsRes, sitesRes] = await Promise.all([
        axiosInstance.get('/map/map-reports').then(res => res.data).catch(() => []),
        axiosInstance.get('/map/deployments').catch(() => ({ data: [] })),
        axiosInstance.get('/map/shelters').catch(() => ({ data: [] })),
        axiosInstance.get('/red-zones/map/zones').catch(() => ({ data: { features: [] } })),
        axiosInstance.get('/red-zones/map/habitations').catch(() => ({ data: { features: [] } })),
        axiosInstance.get('/red-zones/map/sites').catch(() => ({ data: { features: [] } })),
      ]);

      // Cluster nearby reports (within ~5km)
      const clusteredReports = clusterReports(reportsData || []);
      
      setReports(clusteredReports);
      setDeployments(deploymentsRes.data || []);
      setShelters(sheltersRes.data || []);
      setRedZones(redZonesRes.data?.features || []);
      setHabitations(habitationsRes.data?.features || []);
      setRelocationSites(sitesRes.data?.features || []);
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

  const handlePolygonCreated = (coordinates) => {
    setDrawnPolygonCoords(coordinates);
    setShowPolygonModal(true);
    setIsDrawingPolygon(false);
    toast.success('Polygon drawn! Fill in the details to save.');
  };

  const startDrawingPolygon = () => {
    if (isDrawingPolygon) return; // Prevent duplicate activation
    setShowAdminMenu(false);
    setIsDrawingPolygon(true);
    toast('✏️ Draw a polygon on the map to mark a hazard zone', {
      duration: 4000,
    });
  };

  const cancelPolygonDrawing = () => {
    setIsDrawingPolygon(false);
    setDrawnPolygonCoords(null);
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
          
          {/* Refresh Button */}
          <button
            onClick={(e) => {
              e.currentTarget.querySelector('svg').classList.add('animate-spin');
              loadMapData();
              setTimeout(() => {
                e.currentTarget.querySelector('svg')?.classList.remove('animate-spin');
              }, 1000);
            }}
            className="p-2 sm:p-2.5 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors"
            title="Refresh map data"
          >
            <RefreshCw size={16} className="text-green-600 dark:text-green-400 transition-transform" />
          </button>
          
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
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.redZones}
                onChange={(e) => setFilters({ ...filters, redZones: e.target.checked })}
                className="w-4 h-4 text-red-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Red Zones ({redZones.length})</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.habitations}
                onChange={(e) => setFilters({ ...filters, habitations: e.target.checked })}
                className="w-4 h-4 text-orange-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">At-Risk Habitations ({habitations.length})</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.relocationSites}
                onChange={(e) => setFilters({ ...filters, relocationSites: e.target.checked })}
                className="w-4 h-4 text-green-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Relocation Sites ({relocationSites.length})</span>
            </label>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={center}
          zoom={initialZoom}
          minZoom={5}
          maxZoom={18}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          scrollWheelZoom={true}
          zoomControl={true}
          zoomAnimation={false}
          fadeAnimation={false}
        >
          <MapBounds authUser={authUser} districtCoordinates={districtCoordinates} />
          <MapClickHandler pickingMode={pickingMode} onLocationPicked={handleLocationPicked} />
          <MapPolygonDrawer 
            isDrawing={isDrawingPolygon} 
            onPolygonCreated={handlePolygonCreated}
            onCancelDrawing={cancelPolygonDrawing}
          />
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

          {/* Red Zone polygons */}
          {filters.redZones && redZones.map((zone) => {
            const coords = zone.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
            const intensity = zone.properties.intensity;
            const color = intensity === 'critical' ? '#dc2626' :
                         intensity === 'high' ? '#ea580c' :
                         intensity === 'medium' ? '#f59e0b' : '#84cc16';
            
            return (
              <Polygon
                key={`zone-${zone.properties.id}`}
                positions={coords}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.25,
                  weight: 2,
                }}
              >
                <Popup maxWidth={300}>
                  <div className="p-2">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle size={16} className="text-red-600 mt-0.5 shrink-0" />
                      <h3 className="font-bold text-base text-gray-900">🔴 {zone.properties.name}</h3>
                    </div>
                    
                    <div className="space-y-1.5 mb-2">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">District:</span> {zone.properties.district}, {zone.properties.state}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Intensity:</span> 
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${
                          intensity === 'critical' ? 'bg-red-100 text-red-700' :
                          intensity === 'high' ? 'bg-orange-100 text-orange-700' :
                          intensity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {intensity?.toUpperCase()}
                        </span>
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Population at risk:</span> {zone.properties.population_at_risk?.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Hazards:</span> {zone.properties.hazard_types?.join(', ')}
                      </p>
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      AI confidence: {Math.round((zone.properties.ai_confidence || 0) * 100)}%
                      {zone.properties.source === 'auto_cluster' && ' (Auto-detected)'}
                    </p>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {/* Vulnerable Habitations */}
          {filters.habitations && habitations.map((hab) => {
            const priority = hab.properties.priority;
            const radius = priority === 'IMMEDIATE' ? 14 :
                          priority === 'SHORT_TERM' ? 10 : 7;
            const color = priority === 'IMMEDIATE' ? '#dc2626' :
                         priority === 'SHORT_TERM' ? '#f59e0b' : '#84cc16';
            
            return (
              <CircleMarker
                key={`hab-${hab.properties.id}`}
                center={hab.geometry.coordinates.slice().reverse()}
                radius={radius}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.8,
                  weight: 2,
                }}
              >
                <Popup maxWidth={280}>
                  <div className="p-2">
                    <div className="flex items-start gap-2 mb-2">
                      <Home size={16} className="text-orange-600 mt-0.5 shrink-0" />
                      <h3 className="font-bold text-base text-gray-900">🏘️ {hab.properties.name}</h3>
                    </div>
                    
                    <div className="space-y-1.5 mb-2">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">District:</span> {hab.properties.district}, {hab.properties.state}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Population:</span> {hab.properties.population?.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Priority:</span> 
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${
                          priority === 'IMMEDIATE' ? 'bg-red-100 text-red-700' :
                          priority === 'SHORT_TERM' ? 'bg-orange-100 text-orange-700' :
                          priority === 'MEDIUM_TERM' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {priority}
                        </span>
                      </p>
                    </div>
                    
                    {hab.properties.priority_reason && (
                      <p className="text-xs text-gray-600 mb-2">{hab.properties.priority_reason}</p>
                    )}
                    
                    <p className="text-xs text-gray-500">
                      Vulnerability: {Math.round((hab.properties.vulnerability_score || 0) * 100)}%
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Relocation Sites */}
          {filters.relocationSites && relocationSites.map((site) => (
            <Marker
              key={`site-${site.properties.id}`}
              position={site.geometry.coordinates.slice().reverse()}
              icon={shelterIcon}
            >
              <Popup maxWidth={300}>
                <div className="p-2">
                  <div className="flex items-start gap-2 mb-2">
                    <Shield size={16} className="text-green-600 mt-0.5 shrink-0" />
                    <h3 className="font-bold text-base text-gray-900">✅ {site.properties.name}</h3>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{site.properties.district}, {site.properties.state}</p>
                  
                  <div className="space-y-1.5 mb-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Available capacity:</span> {site.properties.available_capacity} households
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Suitability:</span> {Math.round((site.properties.suitability_score || 0) * 100)}%
                    </p>
                    {site.properties.facilities?.length > 0 && (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Facilities:</span> {site.properties.facilities.join(', ')}
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => openInMaps(site.geometry.coordinates[1], site.geometry.coordinates[0], site.properties.name)}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Navigate to Site
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

        {/* Drawing Polygon Mode Overlay */}
        {isDrawingPolygon && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1001] pointer-events-none">
            <div className="bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-200">
              <Pentagon className="animate-pulse" size={20} />
              <div>
                <p className="font-bold text-sm">Draw polygon on map</p>
                <p className="text-xs opacity-90">
                  Click points to mark hazard zone boundary
                </p>
              </div>
              <button
                onClick={() => cancelPolygonDrawing()}
                className="ml-2 p-1 hover:bg-white/20 rounded pointer-events-auto transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Admin Floating Action Buttons */}
        {isAdmin && !isDrawingPolygon && !pickingMode && (
          <div className="absolute bottom-4 left-4 z-[1000]">
            {showAdminMenu && (
              <div className="mb-3 space-y-2 animate-in slide-in-from-bottom-2 duration-200">
                <button
                  onClick={() => startDrawingPolygon()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-lg transition-all w-full"
                >
                  <Pentagon size={16} />
                  Draw Hazard Zone
                </button>
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

        {/* Legend Button (Mobile) */}
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="lg:hidden absolute bottom-4 right-4 bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl p-3 shadow-lg z-[1000] flex items-center gap-2"
        >
          <Map size={16} className="text-gray-700 dark:text-gray-300" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Legend</span>
        </button>

        {/* Legend Panel (Desktop: Always visible, Mobile: Toggle) */}
        <div className={`absolute bottom-4 right-4 bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl shadow-lg z-[1000] text-xs max-w-[240px] transition-all ${
          showLegend ? 'block' : 'hidden lg:block'
        }`}>
          <div className="p-4">
            {/* Close button (Mobile only) */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-900 dark:text-white text-sm">Map Legend</h4>
              <button
                onClick={() => setShowLegend(false)}
                className="lg:hidden p-1 hover:bg-gray-100 dark:hover:bg-[rgb(38,38,38)] rounded-lg transition-colors"
              >
                <X size={14} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            {/* Incident Hotspots */}
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Incident Hotspots</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-600"></div>
                  <span className="text-gray-700 dark:text-gray-300">Critical Severity</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                  <span className="text-gray-700 dark:text-gray-300">High Severity</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-gray-700 dark:text-gray-300">Medium Severity</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-700 dark:text-gray-300">Low Severity</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 mb-3"></div>

            {/* Admin Designated Zones */}
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Admin Red Zones</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 rounded border-2 border-red-600 bg-red-600/20"></div>
                  <span className="text-gray-700 dark:text-gray-300">Hazard Zone</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={12} className="text-orange-600" />
                  <span className="text-gray-700 dark:text-gray-300">Vulnerable Area</span>
                </div>
                <div className="flex items-center gap-2">
                  <Home size={12} className="text-green-600" />
                  <span className="text-gray-700 dark:text-gray-300">Relocation Site</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 mb-3"></div>

            {/* Resources */}
            <div>
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Resources</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Shield size={12} className="text-blue-600" />
                  <span className="text-gray-700 dark:text-gray-300">Rescue Team</span>
                </div>
                <div className="flex items-center gap-2">
                  <Home size={12} className="text-green-600" />
                  <span className="text-gray-700 dark:text-gray-300">Emergency Shelter</span>
                </div>
              </div>
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

      {showPolygonModal && drawnPolygonCoords && (
        <HazardZoneModal
          polygonCoords={drawnPolygonCoords}
          onClose={() => {
            setShowPolygonModal(false);
            setDrawnPolygonCoords(null);
          }}
          onSuccess={() => {
            loadMapData();
            setShowPolygonModal(false);
            setDrawnPolygonCoords(null);
          }}
        />
      )}
    </div>
  );
};

export default MapPage;
