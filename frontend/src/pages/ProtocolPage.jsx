import React, { useState } from 'react';
import { Info } from "lucide-react";
import { protocols } from '../services/storage.js';

const ProtocolPage = () => {
  const [activeTab, setActiveTab] = useState('cyclone');

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">

      <main className="max-w-4xl mx-auto px-6 py-16">
        <header className="mb-12 border-l-4 border-slate-900 pl-6">
          <h1 className="text-4xl font-light text-slate-950 mb-2 tracking-tight">
            Safety <span className="font-bold">Protocol</span>
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-2xl">
           Important steps to follow during a disaster to reduce damage and keep people safe </p>
        </header>

        <div className="flex border-b border-slate-100 mb-12 overflow-x-auto">
          {Object.keys(protocols).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-3 px-8 py-5 text-xs font-bold uppercase tracking-[0.2em] transition-all relative ${
                activeTab === key ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {protocols[key].title}
              {activeTab === key && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600" />
              )}
            </button>
          ))}
        </div>

        <div className="space-y-16 animate-in fade-in duration-500">
          

          {protocols[activeTab].sections.map((section, sIdx) => (
            <section key={sIdx} className="space-y-8">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-600 flex items-center gap-4">
                {section.label}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                {section.items.map((item, iIdx) => (
                  <div key={iIdx} className="flex gap-4 group items-start">
                    <div className="mt-2 h-1 w-1 rounded-full bg-slate-300 group-hover:bg-blue-600 transition-colors shrink-0" />
                    <p className="text-slate-600 leading-relaxed text-[15px] group-hover:text-slate-900 transition-colors">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
          <div className="mt-20 p-8 border border-slate-100 bg-slate-50/50 rounded-lg">
            <div className="flex items-center gap-3 text-slate-900 mb-4">
              <Info size={18} className="text-blue-600" />
              <span className="text-xs font-black uppercase tracking-widest">Compliance & Safety</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              The procedures listed above are for immediate risk reduction. These are standard operating procedures and do not replace live instructions from local field officers. If you are instructed to evacuate by local authorities, do so immediately using designated routes.
            </p>
          </div>
        </div>
      </main>

    </div>
  );
};

export default ProtocolPage;