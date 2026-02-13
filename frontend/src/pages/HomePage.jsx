import { reports,newsFeeds } from "../services/storage";


const HomePage = () => {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <section className="flex-1 min-w-0">
        <h2 className="text-xl font-bold text-blue-900 mb-4">Reports</h2>
        <div className="space-y-4">
          {reports.map((report) => (
            <article
              key={report.id}
              className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-4 flex items-center gap-3 border-b border-blue-50">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold shrink-0">
                  {report.username.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-blue-900 truncate">{report.username}</p>
                  <p className="text-sm text-blue-500 truncate">{report.location}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 shrink-0">
                  {report.disasterType}
                </span>
              </div>
              <div className="aspect-[16/10] bg-blue-50">
                <img
                  src={report.image}
                  alt={report.disasterType}
                  className="w-full h-full object-cover"
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* News feeds section */}
      <aside className="lg:w-80 shrink-0">
        <h2 className="text-xl font-bold text-blue-900 mb-4">News Feed</h2>
        <div className="space-y-3">
          {newsFeeds.map((news) => (
            <article
              key={news.id}
              className="bg-white rounded-xl border border-blue-100 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="text-sm text-blue-400 mb-1">{news.source} · {news.time}</p>
              <h3 className="font-semibold text-blue-900 mb-2 line-clamp-2">{news.title}</h3>
              <p className="text-sm text-blue-600 line-clamp-2">{news.summary}</p>
            </article>
          ))}
        </div>
      </aside>
    </div>
  );
};

export default HomePage;
