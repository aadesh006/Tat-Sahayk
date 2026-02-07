import feedparser
import sys
import os
from datetime import datetime
from time import mktime

sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.social import SocialPost

# --- CONFIGURATION ---
RSS_FEEDS = [
    # Google News: "Cyclone India" (Last 24 hours)
    {"url": "https://news.google.com/rss/search?q=cyclone+india+when:1d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    # Google News: "Flood India" (Last 24 hours)
    {"url": "https://news.google.com/rss/search?q=flood+india+when:1d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    # Google News: "Tsunami India" (Last 24 hours)
    {"url": "https://news.google.com/rss/search?q=tsunami+india+when:1d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    # GDACS (Global Disaster Alert System) - Real-time official alerts
    {"url": "https://www.gdacs.org/xml/rss.xml", "source": "GDACS"}
]

def harvest():
    db = SessionLocal()
    print("Starting Social Harvest...")

    count = 0
    for feed_info in RSS_FEEDS:
        print(f"   Reading feed: {feed_info['url']}...")
        feed = feedparser.parse(feed_info["url"])

        for entry in feed.entries:
            # 1. Check if we already have this post (Prevent Duplicates)
            exists = db.query(SocialPost).filter(SocialPost.url == entry.link).first()
            if exists:
                continue

            # 2. Parse Date
            published_time = datetime.now()
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                published_time = datetime.fromtimestamp(mktime(entry.published_parsed))

            # 3. Clean Content
            content_text = entry.title
            if hasattr(entry, "summary"):
                content_text += f"\n\n{entry.summary}"

            # 4. Save to DB
            post = SocialPost(
                source=feed_info["source"],
                author=entry.get("source", {}).get("title", "Unknown"),
                content=content_text,
                url=entry.link,
                published_at=published_time
            )
            db.add(post)
            count += 1
    
    db.commit()
    db.close()
    print(f"Harvest Complete. Added {count} new posts.")

if __name__ == "__main__":
    harvest()