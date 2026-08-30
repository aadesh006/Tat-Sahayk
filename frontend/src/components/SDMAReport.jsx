import React from 'react';
import { Loader2, Printer, FileText, AlertCircle, CheckCircle, Activity, MapPin, Download } from 'lucide-react';
import { downloadSDMAPdf } from '../lib/api.js';
import toast from 'react-hot-toast';

export default function SDMAReportTab({ summary, loading, stats }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">SDMA Executive Report</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            State Disaster Management Authority — Risk Assessment & Resource Planning
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            <Printer size={16} />
            Print
          </button>
          <button
            onClick={async () => {
              try {
                await downloadSDMAPdf()
                toast.success("PDF downloaded")
              } catch {
                toast.error("PDF export failed")
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            <Download size={16} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Risk Level Banner */}
      <div className={`p-6 rounded-2xl border-2 ${
        summary?.risk_level === 'CRITICAL' ? 'bg-red-50 dark:bg-red-500/10 border-red-500' :
        summary?.risk_level === 'HIGH' ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-500' :
        summary?.risk_level === 'MEDIUM' ? 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-500' :
        'bg-green-50 dark:bg-green-500/10 border-green-500'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
              District Risk Classification
            </div>
            <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {summary?.risk_level || 'MEDIUM'}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Assessment Date: {new Date().toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Next Review: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
              })}
            </div>
          </div>
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white/50 dark:bg-black/20">
            <AlertCircle size={40} className={
              summary?.risk_level === 'CRITICAL' ? 'text-red-600' :
              summary?.risk_level === 'HIGH' ? 'text-orange-600' :
              summary?.risk_level === 'MEDIUM' ? 'text-yellow-600' :
              'text-green-600'
            } />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Executive Summary */}
        <div className="lg:col-span-2 bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText size={16} className="text-gray-400" />
              Executive Summary
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">Classification: Official</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line mb-4">
            {summary?.executive_summary || 'This district has been assessed for disaster risk and relocation planning. The assessment considers hazard exposure, population vulnerability, infrastructure capacity, and historical incident data. This report provides actionable recommendations for disaster preparedness and mitigation measures.'}
          </p>
          <div className="border-t border-gray-200 dark:border-[rgb(47,51,54)] pt-4 mt-4">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
              Data Sources & References
            </div>
            <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <a href="https://ndma.gov.in/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 hover:underline">
                  National Disaster Management Authority (NDMA) — National Disaster Management Plans
                </a>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <a href="https://incois.gov.in/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 hover:underline">
                  Indian National Centre for Ocean Information Services (INCOIS) — Coastal Hazard Assessment
                </a>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <a href="https://bhuvan.nrsc.gov.in/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 hover:underline">
                  ISRO Bhuvan — Geospatial Data and Hazard Mapping
                </a>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <a href="https://www.census2011.co.in/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 hover:underline">
                  Census of India 2011 — Population and Demographic Data
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Priority Distribution Chart */}
        <div className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Relocation Priority Analysis</h3>
          
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="20" className="text-gray-100 dark:text-[rgb(38,38,38)]" />
                {(() => {
                  const immediate = stats?.immediate_priority_count || 0;
                  const shortTerm = stats?.short_term_priority_count || 0;
                  const mediumTerm = stats?.medium_term_priority_count || 0;
                  const safe = stats?.safe_count || 0;
                  const total = immediate + shortTerm + mediumTerm + safe || 1;
                  
                  let offset = 0;
                  const segments = [
                    { count: immediate, color: 'rgb(239, 68, 68)' },
                    { count: shortTerm, color: 'rgb(249, 115, 22)' },
                    { count: mediumTerm, color: 'rgb(234, 179, 8)' },
                    { count: safe, color: 'rgb(34, 197, 94)' }
                  ];
                  
                  return segments.map((seg, idx) => {
                    const percentage = (seg.count / total) * 100;
                    const strokeDasharray = `${percentage * 2.51} ${251 - percentage * 2.51}`;
                    const strokeDashoffset = -offset * 2.51;
                    offset += percentage;
                    
                    return (
                      <circle key={idx} cx="50" cy="50" r="40" fill="none" stroke={seg.color} strokeWidth="20"
                        strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total_habitations || 0}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Settlements</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">{stats?.immediate_priority_count || 0}</div>
                <div className="text-gray-500 dark:text-gray-400">Immediate</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">{stats?.short_term_priority_count || 0}</div>
                <div className="text-gray-500 dark:text-gray-400">Short Term</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">{stats?.medium_term_priority_count || 0}</div>
                <div className="text-gray-500 dark:text-gray-400">Medium Term</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">{stats?.safe_count || 0}</div>
                <div className="text-gray-500 dark:text-gray-400">Safe</div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Risk Indicators */}
        <div className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Key Risk Indicators (KRI)</h3>
          <div className="space-y-4">
            <RiskIndicator 
              label="Population Exposure Index" 
              value={stats?.total_population_at_risk || 0}
              suffix="persons"
              severity={stats?.total_population_at_risk > 5000 ? 'high' : 'medium'}
              benchmark="National Avg: 3,500"
            />
            <RiskIndicator 
              label="Active Hazard Zones" 
              value={stats?.active_red_zones || 0}
              suffix="zones"
              severity={stats?.active_red_zones > 3 ? 'high' : 'low'}
              benchmark="State Avg: 2.3"
            />
            <RiskIndicator 
              label="Immediate Action Required" 
              value={stats?.immediate_priority_count || 0}
              suffix="settlements"
              severity={stats?.immediate_priority_count > 2 ? 'critical' : 'medium'}
              benchmark="Threshold: 1"
            />
            <RiskIndicator 
              label="Relocation Capacity Gap" 
              value={Math.max(0, Math.round(((stats?.total_population_at_risk || 0) / 4) - (stats?.total_relocation_capacity || 0)))}
              suffix="households"
              severity={((stats?.total_population_at_risk || 0) / 4) > (stats?.total_relocation_capacity || 0) ? 'high' : 'low'}
              benchmark="Target: 0"
            />
          </div>
        </div>

        {/* Immediate Actions */}
        <div className="lg:col-span-2 bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Immediate Actions Required</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {summary?.immediate_actions?.slice(0, 3).map((action, idx) => (
              <div key={idx} className="p-4 bg-gray-50 dark:bg-[rgb(38,38,38)] rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-red-600 dark:text-red-400">{idx + 1}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">ACTION {idx + 1}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{action}</p>
              </div>
            )) || (
              <div className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                No immediate actions required at this time
              </div>
            )}
          </div>
        </div>

        {/* Resource Requirements */}
        <div className="lg:col-span-2 bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Resource Requirements & Budget Allocation</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-[rgb(38,38,38)] rounded-xl">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estimated Budget</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">₹{summary?.resource_requirements?.estimated_cost_crore || 0}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Crores (INR)</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-[rgb(38,38,38)] rounded-xl">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Transport Fleet</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary?.resource_requirements?.transport_vehicles || 0}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Vehicles Required</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-[rgb(38,38,38)] rounded-xl">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Temp Shelters</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary?.resource_requirements?.temporary_shelters_needed || 0}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Units Needed</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-[rgb(38,38,38)] rounded-xl">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Implementation</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary?.resource_requirements?.timeline_months || 6}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Months Timeline</div>
            </div>
          </div>

          {/* Funding Sources */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-[rgb(47,51,54)]">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
              Potential Funding Sources
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                <span>State Disaster Response Fund (SDRF)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                <span>National Disaster Response Fund (NDRF)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                <span>Finance Commission Grants</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                <span>World Bank/ADB Development Funds</span>
              </div>
            </div>
          </div>
        </div>

        {/* District-wise Breakdown */}
        <div className="lg:col-span-2 bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Geographical Risk Distribution</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[rgb(38,38,38)] border-b border-gray-200 dark:border-[rgb(47,51,54)]">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">District</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Hazard Zones</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">At-Risk Population</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[rgb(47,51,54)]">
                {summary?.district_breakdown?.map((district, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)]">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{district.name}</td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{district.zones || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{district.at_risk?.toLocaleString() || 0}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                        district.status === 'critical' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' :
                        district.status === 'high' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400' :
                        'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                      }`}>
                        {district.status || 'Monitored'}
                      </span>
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan="4" className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                      No district-level data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="lg:col-span-2 bg-gray-50 dark:bg-[rgb(38,38,38)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl p-4">
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p><strong className="font-semibold">Disclaimer:</strong> This report is generated using AI-assisted analysis combined with official data sources. All recommendations should be validated by qualified disaster management professionals before implementation.</p>
            <p><strong className="font-semibold">Report Validity:</strong> 30 days from date of generation. Regular reassessments recommended.</p>
            <p><strong className="font-semibold">Classification:</strong> For Official Use — SDMA/District Administration</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskIndicator({ label, value, suffix, severity, benchmark }) {
  const severityColors = {
    critical: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',
    high: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20',
    medium: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20',
    low: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20'
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-gray-600 dark:text-gray-400">{label}</div>
        <div className={`px-2 py-1 rounded-lg text-xs font-semibold border ${severityColors[severity]}`}>
          {typeof value === 'number' ? value.toLocaleString() : value} {suffix}
        </div>
      </div>
      {benchmark && (
        <div className="text-xs text-gray-500 dark:text-gray-400">{benchmark}</div>
      )}
    </div>
  );
}
