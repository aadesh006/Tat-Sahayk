import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  AlertTriangle, TrendingUp, Users, Activity, 
  MapPin, Radio, Brain, RefreshCw, Clock,
  AlertCircle, CheckCircle, XCircle, Loader2,
  Shield, FileText, Zap
} from 'lucide-react';
import { axiosInstance } from '../lib/axios';

// Risk score color coding
const getRiskColor = (score) => {
  if (score >= 75) return { bg: 'bg-red-500', text: 'text-red-500', ring: 'ring-red-500', label: 'CRITICAL' };
  if (score >= 50) return { bg: 'bg-orange-500', text: 'text-orange-500', ring: 'ring-orange-500', label: 'HIGH' };
  if (score >= 25) return { bg: 'bg-yellow-500', text: 'text-yellow-500', ring: 'ring-yellow-500', label: 'MEDIUM' };
  return { bg: 'bg-green-500', text: 'text-green-500', ring: 'ring-green-500', label: 'LOW' };
};

// Fetch consolidated report
const fetchConsolidatedReport = async () => {
  const res = await axiosInstance.get('/admin/analytics/consolidated-report');
  return res.data.report;
};

// Fetch real-time stats
const fetchRealTimeStats = async () => {
  const res = await axiosInstance.get('/admin/analytics/real-time-stats?hours=24');
  return res.data;
};

export default function AdminAnalytics() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Main consolidated report (refreshes every 5 minutes)
  const { 
    data: report, 
    isLoading: reportLoading, 
    error: reportError,
    refetch: refetchReport,
    isFetching: reportFetching
  } = useQuery({
    queryKey: ['admin-consolidated-report'],
    queryFn: fetchConsolidatedReport,
    refetchInterval: autoRefresh ? 5 * 60 * 1000 : false,
    retry: 2
  });
  
  // Real-time stats (refreshes every 60 seconds)
  const { 
    data: stats, 
    isLoading: statsLoading 
  } = useQuery({
    queryKey: ['admin-real-time-stats'],
    queryFn: fetchRealTimeStats,
    refetchInterval: autoRefresh ? 60 * 1000 : false,
    retry: 2
  });
  
  // Handle manual refresh with animation
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchReport();
    // Keep spinning for at least 1 second for visual feedback
    setTimeout(() => setIsRefreshing(false), 1000);
  };
  
  if (reportLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
          <div className="text-white text-lg font-semibold">Loading analytics...</div>
          <div className="text-gray-400 text-sm mt-2">Aggregating real-time data</div>
        </div>
      </div>
    );
  }
  
  if (reportError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <div className="text-white text-lg font-semibold mb-2">Failed to load analytics</div>
          <div className="text-gray-400 text-sm mb-4">{reportError.message}</div>
          <button
            onClick={() => refetchReport()}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  const riskScore = report?.risk_assessment?.overall_risk_score || 0;
  const riskLevel = report?.risk_assessment?.risk_level || 'LOW';
  const riskInfo = getRiskColor(riskScore);
  
  return (
    <div className="min-h-screen bg-black pb-20 lg:pb-0">
      {/* Header */}
      <div className="bg-black border-b border-[rgb(47,51,54)] sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Shield className="w-7 h-7 text-sky-500" />
                Real-Time Intelligence Dashboard
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                District: {report?.district || 'National'} • Last updated: {report?.generated_at ? new Date(report.generated_at).toLocaleTimeString() : 'N/A'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  autoRefresh 
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
                    : 'bg-gray-800 border border-[rgb(47,51,54)] text-gray-400'
                }`}
              >
                <Clock className="w-4 h-4" />
                Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
              </button>
              
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || reportFetching}
                className={`flex items-center gap-2 px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-all ${
                  isRefreshing || reportFetching ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing || reportFetching ? 'animate-spin' : ''}`} />
                {isRefreshing || reportFetching ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {/* Risk Score Banner */}
        <div className={`bg-[rgb(22,22,22)] border-2 ${riskInfo.ring} rounded-xl p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className={`w-24 h-24 rounded-full ${riskInfo.bg} flex items-center justify-center`}>
                  <div className="text-white text-3xl font-bold">{riskScore.toFixed(0)}</div>
                </div>
              </div>
              <div>
                <div className={`text-3xl font-bold ${riskInfo.text} mb-1`}>{riskLevel} RISK</div>
                <div className="text-gray-400 text-sm">Composite Score: {riskScore.toFixed(1)} / 100</div>
              </div>
            </div>
            
            {stats?.needs_attention && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-yellow-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">Attention Required</span>
                </div>
                <div className="text-xs text-yellow-300/80 mt-1">
                  {stats.reports.pending} pending • {stats.alerts.critical} critical alerts
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Citizen Reports */}
          <div className="bg-[rgb(22,22,22)] border border-[rgb(47,51,54)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <FileText className="w-5 h-5 text-gray-400" />
              <span className="text-xs text-gray-500">{report?.citizen_reports?.time_window_hours}h</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-3xl font-bold text-white">{report?.citizen_reports?.total_reports || 0}</div>
                <div className="text-xs text-gray-400">Citizen Reports</div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Verified</span>
                <span className="text-green-400 font-semibold">{report?.citizen_reports?.by_status?.verified || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Pending</span>
                <span className="text-yellow-400 font-semibold">{report?.citizen_reports?.by_status?.pending || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Critical</span>
                <span className="text-red-400 font-semibold">{report?.citizen_reports?.by_severity?.critical || 0}</span>
              </div>
            </div>
          </div>
          
          {/* Social Media */}
          <div className="bg-[rgb(22,22,22)] border border-[rgb(47,51,54)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <Radio className="w-5 h-5 text-gray-400" />
              <span className="text-xs text-gray-500">{report?.social_media_analysis?.time_window_hours}h</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-3xl font-bold text-white">{report?.social_media_analysis?.total_posts || 0}</div>
                <div className="text-xs text-gray-400">Social Media Posts</div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Urgent Signals</span>
                <span className="text-red-400 font-semibold">{report?.social_media_analysis?.urgent_count || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Negative</span>
                <span className="text-orange-400 font-semibold">{report?.social_media_analysis?.sentiment_distribution?.negative || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Positive</span>
                <span className="text-green-400 font-semibold">{report?.social_media_analysis?.sentiment_distribution?.positive || 0}</span>
              </div>
            </div>
          </div>
          
          {/* Red Zones */}
          <div className="bg-[rgb(22,22,22)] border border-[rgb(47,51,54)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <MapPin className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-3xl font-bold text-red-400">{report?.red_zone_status?.immediate_evacuation_needed || 0}</div>
                <div className="text-xs text-gray-400">Immediate Evacuations</div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Population at Risk</span>
                <span className="text-orange-400 font-semibold">{report?.red_zone_status?.immediate_population || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Active Zones</span>
                <span className="text-yellow-400 font-semibold">{report?.red_zone_status?.active_red_zones || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Habitations</span>
                <span className="text-gray-300 font-semibold">{report?.red_zone_status?.vulnerable_habitations || 0}</span>
              </div>
            </div>
          </div>
          
          {/* Active Alerts */}
          <div className="bg-[rgb(22,22,22)] border border-[rgb(47,51,54)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <AlertCircle className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-3xl font-bold text-white">{report?.active_alerts?.total_active || 0}</div>
                <div className="text-xs text-gray-400">Active Alerts</div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Critical</span>
                <span className="text-red-400 font-semibold">{report?.active_alerts?.by_severity?.critical || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">High</span>
                <span className="text-orange-400 font-semibold">{report?.active_alerts?.by_severity?.high || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Medium</span>
                <span className="text-yellow-400 font-semibold">{report?.active_alerts?.by_severity?.medium || 0}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* AI Analysis & External Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Analysis */}
          <div className="bg-[rgb(22,22,22)] border border-[rgb(47,51,54)] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-sky-500" />
              <h3 className="text-lg font-semibold text-white">AI Analysis</h3>
              {report?.ai_executive_summary?.model && (
                <span className="ml-auto text-[10px] text-gray-500 bg-gray-800 px-2 py-1 rounded">
                  {report.ai_executive_summary.model}
                </span>
              )}
            </div>
            
            {report?.ai_executive_summary?.analysis ? (
              <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line max-h-[400px] overflow-y-auto">
                {report.ai_executive_summary.analysis}
              </div>
            ) : (
              <div className="text-sm text-gray-500">AI analysis temporarily unavailable</div>
            )}
            
            {report?.ai_executive_summary?.error && (
              <div className="mt-3 text-[10px] text-yellow-500/80">
                ⚠ Using fallback analysis
              </div>
            )}
          </div>
          
          {/* Seismic Activity */}
          <div className="bg-[rgb(22,22,22)] border border-[rgb(47,51,54)] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-sky-500" />
              <h3 className="text-lg font-semibold text-white">Seismic Activity</h3>
              <span className="ml-auto text-xs text-gray-500">Last 7 days</span>
            </div>
            
            {report?.external_data?.seismic?.status === 'success' ? (
              <>
                <div className="flex items-baseline gap-2 mb-4">
                  <div className="text-4xl font-bold text-white">{report.external_data.seismic.count || 0}</div>
                  <div className="text-sm text-gray-400">earthquakes detected (M4.0+)</div>
                </div>
                
                {report.external_data.seismic.earthquakes?.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {report.external_data.seismic.earthquakes.slice(0, 5).map((eq, idx) => (
                      <div key={idx} className="bg-gray-900 rounded p-3 border border-[rgb(47,51,54)]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-orange-400">M {eq.magnitude}</span>
                          <span className="text-xs text-gray-500">{eq.time ? new Date(eq.time).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="text-xs text-gray-300">{eq.location || 'Unknown location'}</div>
                        {eq.depth_km && (
                          <div className="text-[10px] text-gray-500 mt-1">Depth: {eq.depth_km} km</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No significant earthquakes detected</div>
                )}
                
                <div className="mt-4 pt-4 border-t border-[rgb(47,51,54)] text-[10px] text-gray-500">
                  Data source: USGS Earthquake Hazards Program
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">
                {report?.external_data?.seismic?.status === 'timeout' && '⏱ API timeout - data unavailable'}
                {report?.external_data?.seismic?.status === 'error' && '⚠ Unable to fetch seismic data'}
                {report?.external_data?.seismic?.status === 'network_error' && '🔌 Network error'}
                {!report?.external_data?.seismic?.status && 'Loading...'}
              </div>
            )}
          </div>
        </div>
        
        {/* Trending Keywords */}
        {report?.social_media_analysis?.trending_keywords && Object.keys(report.social_media_analysis.trending_keywords).length > 0 && (
          <div className="bg-[rgb(22,22,22)] border border-[rgb(47,51,54)] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-sky-500" />
              <h3 className="text-lg font-semibold text-white">Trending Keywords</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(report.social_media_analysis.trending_keywords)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([keyword, count]) => (
                  <span key={keyword} className="px-3 py-1.5 bg-gray-900 border border-[rgb(47,51,54)] rounded-lg text-sm text-gray-300">
                    #{keyword} <span className="text-gray-500">({count})</span>
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
