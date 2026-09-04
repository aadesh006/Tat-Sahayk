import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  AlertTriangle, TrendingUp, Users, Activity, 
  MapPin, Radio, Brain, RefreshCw, Clock,
  AlertCircle, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import { axiosInstance } from '../lib/axios';

// Risk score color coding
const getRiskColor = (score) => {
  if (score >= 75) return { bg: 'bg-red-500', text: 'text-red-500', label: 'CRITICAL' };
  if (score >= 50) return { bg: 'bg-orange-500', text: 'text-orange-500', label: 'HIGH' };
  if (score >= 25) return { bg: 'bg-yellow-500', text: 'text-yellow-500', label: 'MEDIUM' };
  return { bg: 'bg-green-500', text: 'text-green-500', label: 'LOW' };
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

function RiskScoreGauge({ score, level }) {
  const riskInfo = getRiskColor(score);
  const percentage = Math.min(100, Math.max(0, score));
  
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Overall Risk Assessment</h3>
        <Activity className="w-5 h-5 text-gray-400" />
      </div>
      
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-48 h-48">
          {/* Circular gauge */}
          <svg className="transform -rotate-90 w-48 h-48">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              className="text-gray-700"
            />
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={`${percentage * 5.53} 553`}
              className={riskInfo.text}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-white">{score.toFixed(1)}</div>
            <div className={`text-sm font-semibold ${riskInfo.text} mt-1`}>{riskInfo.label}</div>
          </div>
        </div>
      </div>
      
      <div className="text-sm text-gray-400 text-center">
        Score range: 0 (Safe) - 100 (Critical Emergency)
      </div>
    </div>
  );
}

function AIAnalysisCard({ summary }) {
  if (!summary || summary.error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">AI Executive Summary</h3>
        </div>
        <div className="text-gray-400">AI analysis temporarily unavailable</div>
      </div>
    );
  }
  
  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-gray-800 rounded-lg p-6 border border-purple-700/50">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">AI Executive Summary</h3>
        <span className="ml-auto text-xs text-gray-400">{summary.model}</span>
      </div>
      
      <div className="prose prose-invert max-w-none">
        <div className="text-gray-200 whitespace-pre-wrap leading-relaxed">
          {summary.analysis}
        </div>
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        Generated: {new Date(summary.generated_at).toLocaleString()}
      </div>
    </div>
  );
}

function CitizenReportsCard({ data }) {
  const total = data.total_reports || 0;
  const verified = data.by_status?.verified || 0;
  const pending = data.by_status?.pending || 0;
  const critical = data.by_severity?.critical || 0;
  
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Citizen Reports</h3>
        <span className="ml-auto text-xs text-gray-400">{data.time_window_hours}h</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-3xl font-bold text-white">{total}</div>
          <div className="text-sm text-gray-400">Total Reports</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-green-400">{verified}</div>
          <div className="text-sm text-gray-400">Verified</div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Pending Verification</span>
          <span className="text-yellow-400 font-semibold">{pending}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Critical Severity</span>
          <span className="text-red-400 font-semibold">{critical}</span>
        </div>
      </div>
      
      {data.by_hazard_type && Object.keys(data.by_hazard_type).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-2">By Hazard Type:</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.by_hazard_type).map(([type, count]) => (
              <span key={type} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
                {type}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SocialMediaCard({ data }) {
  const urgent = data.urgent_count || 0;
  const total = data.total_posts || 0;
  
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Radio className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-semibold text-white">Social Media Analysis</h3>
        <span className="ml-auto text-xs text-gray-400">{data.time_window_hours}h</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-3xl font-bold text-white">{total}</div>
          <div className="text-sm text-gray-400">Posts Analyzed</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-red-400">{urgent}</div>
          <div className="text-sm text-gray-400">Urgent Signals</div>
        </div>
      </div>
      
      {data.sentiment_distribution && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Negative/Warning</span>
            <span className="text-orange-400">{data.sentiment_distribution.negative || 0}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Positive/Safe</span>
            <span className="text-green-400">{data.sentiment_distribution.positive || 0}</span>
          </div>
        </div>
      )}
      
      {data.trending_keywords && Object.keys(data.trending_keywords).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-2">Trending Keywords:</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.trending_keywords)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([keyword, count]) => (
                <span key={keyword} className="px-2 py-1 bg-cyan-900/30 border border-cyan-700 rounded text-xs text-cyan-300">
                  #{keyword} ({count})
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RedZoneCard({ data }) {
  const immediate = data.immediate_evacuation_needed || 0;
  const population = data.immediate_population || 0;
  const activeZones = data.active_red_zones || 0;
  
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-red-400" />
        <h3 className="text-lg font-semibold text-white">Red Zone Status</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-3xl font-bold text-red-400">{immediate}</div>
          <div className="text-sm text-gray-400">Immediate Evacuations</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-orange-400">{population}</div>
          <div className="text-sm text-gray-400">People at Risk</div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Active Red Zones</span>
          <span className="text-red-400 font-semibold">{activeZones}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Vulnerable Habitations</span>
          <span className="text-yellow-400 font-semibold">{data.vulnerable_habitations || 0}</span>
        </div>
      </div>
      
      {data.priority_distribution && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-2">Priority Breakdown:</div>
          <div className="space-y-1">
            {Object.entries(data.priority_distribution).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{priority}</span>
                <span className="text-gray-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ActiveAlertsCard({ data }) {
  const total = data.total_active || 0;
  const critical = data.by_severity?.critical || 0;
  const high = data.by_severity?.high || 0;
  
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-yellow-400" />
        <h3 className="text-lg font-semibold text-white">Active Alerts</h3>
      </div>
      
      <div className="mb-4">
        <div className="text-3xl font-bold text-white">{total}</div>
        <div className="text-sm text-gray-400">Currently Active</div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Critical Severity</span>
          <span className="text-red-400 font-semibold">{critical}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">High Severity</span>
          <span className="text-orange-400 font-semibold">{high}</span>
        </div>
      </div>
      
      {data.alerts && data.alerts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
          {data.alerts.slice(0, 3).map((alert) => (
            <div key={alert.id} className="text-xs">
              <div className="text-gray-300 font-medium">{alert.title}</div>
              <div className="text-gray-500">{alert.district}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExternalDataCard({ data }) {
  const earthquakes = data.seismic?.earthquakes || [];
  const earthquakeCount = data.seismic?.count || 0;
  
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">External Data Sources</h3>
      </div>
      
      <div className="space-y-4">
        {/* Seismic Activity */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Seismic Activity (USGS)</span>
            <span className="text-xs text-gray-500">Last 7 days</span>
          </div>
          <div className="text-2xl font-bold text-purple-400 mb-2">{earthquakeCount}</div>
          <div className="text-xs text-gray-400">Earthquakes (M4.0+) in India region</div>
          
          {earthquakes.length > 0 && (
            <div className="mt-3 space-y-2">
              {earthquakes.slice(0, 3).map((eq, idx) => (
                <div key={idx} className="text-xs bg-gray-900/50 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-purple-300">M{eq.magnitude}</span>
                    <span className="text-gray-500">{new Date(eq.time).toLocaleDateString()}</span>
                  </div>
                  <div className="text-gray-400">{eq.location}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Weather Data (IMD) */}
        <div className="pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Weather Warnings (IMD)</span>
            <span className="text-xs text-gray-500 bg-yellow-900/30 px-2 py-1 rounded">Pending Integration</span>
          </div>
          <div className="text-xs text-gray-500">
            India Meteorological Department API integration ready when credentials available
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Main consolidated report (refreshes every 5 minutes)
  const { 
    data: report, 
    isLoading: reportLoading, 
    error: reportError,
    refetch: refetchReport 
  } = useQuery({
    queryKey: ['admin-consolidated-report'],
    queryFn: fetchConsolidatedReport,
    refetchInterval: autoRefresh ? 5 * 60 * 1000 : false, // 5 minutes
    retry: 2
  });
  
  // Real-time stats (refreshes every 60 seconds)
  const { 
    data: stats, 
    isLoading: statsLoading 
  } = useQuery({
    queryKey: ['admin-real-time-stats'],
    queryFn: fetchRealTimeStats,
    refetchInterval: autoRefresh ? 60 * 1000 : false, // 1 minute
    retry: 2
  });
  
  if (reportLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <div className="text-white text-lg">Loading consolidated report...</div>
          <div className="text-gray-400 text-sm mt-2">Aggregating data from multiple sources</div>
        </div>
      </div>
    );
  }
  
  if (reportError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <div className="text-white text-lg mb-2">Failed to load analytics</div>
          <div className="text-gray-400 text-sm mb-4">{reportError.message}</div>
          <button
            onClick={() => refetchReport()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 pb-20 lg:pb-0">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Brain className="w-7 h-7 text-purple-400" />
                AI Analytics Dashboard
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Real-time consolidated intelligence • District: {report?.district || 'National'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  autoRefresh 
                    ? 'bg-green-900/30 border border-green-700 text-green-400' 
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                <Clock className="w-4 h-4" />
                Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
              </button>
              
              <button
                onClick={() => refetchReport()}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Now
              </button>
            </div>
          </div>
          
          {report?.generated_at && (
            <div className="mt-2 text-xs text-gray-500">
              Last updated: {new Date(report.generated_at).toLocaleString()}
            </div>
          )}
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Risk Assessment - Full Width */}
        {report?.risk_assessment && (
          <RiskScoreGauge 
            score={report.risk_assessment.overall_risk_score} 
            level={report.risk_assessment.risk_level}
          />
        )}
        
        {/* AI Executive Summary - Full Width */}
        {report?.ai_executive_summary && (
          <AIAnalysisCard summary={report.ai_executive_summary} />
        )}
        
        {/* Data Sources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {report?.citizen_reports && (
            <CitizenReportsCard data={report.citizen_reports} />
          )}
          
          {report?.social_media_analysis && (
            <SocialMediaCard data={report.social_media_analysis} />
          )}
          
          {report?.red_zone_status && (
            <RedZoneCard data={report.red_zone_status} />
          )}
          
          {report?.active_alerts && (
            <ActiveAlertsCard data={report.active_alerts} />
          )}
          
          {report?.external_data && (
            <ExternalDataCard data={report.external_data} />
          )}
        </div>
        
        {/* Quick Stats Banner (from lightweight endpoint) */}
        {stats && stats.needs_attention && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <div>
                <div className="font-semibold text-yellow-300">Attention Required</div>
                <div className="text-sm text-yellow-200/80">
                  {stats.reports.pending} pending reports • {stats.alerts.critical} critical alerts • {stats.evacuations.immediate_needed} immediate evacuations needed
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
