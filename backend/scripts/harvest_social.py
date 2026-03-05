import feedparser
import sys
import os
from datetime import datetime
from time import mktime

sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.social import SocialPost

# --- CONFIGURATION ---
# Only fetch disaster-related news specifically about India's coastal regions
RSS_FEEDS = [
    # Google News: "Cyclone India coast" (Last 24 hours)
    {"url": "https://news.google.com/rss/search?q=cyclone+india+coast+when:1d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    # Google News: "Flood India coastal" (Last 24 hours)
    {"url": "https://news.google.com/rss/search?q=flood+india+coastal+when:1d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    # Google News: "Tsunami India" (Last 24 hours)
    {"url": "https://news.google.com/rss/search?q=tsunami+india+when:1d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    # Google News: "Storm India Bay of Bengal" (Last 24 hours)
    {"url": "https://news.google.com/rss/search?q=storm+india+bay+bengal+when:1d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    # Google News: "Oil spill India coast" (Last 24 hours)
    {"url": "https://news.google.com/rss/search?q=oil+spill+india+coast+when:1d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    # Google News: "Earthquake India" (Last 24 hours)
    {"url": "https://news.google.com/rss/search?q=earthquake+india+when:1d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    # GDACS (Global Disaster Alert System) - Real-time official alerts
    {"url": "https://www.gdacs.org/xml/rss.xml", "source": "GDACS"}
]

# Keywords to filter out irrelevant news
EXCLUDE_KEYWORDS = [
    'cricket', 'football', 'politics', 'election', 'minister', 'parliament',
    'africa', 'europe', 'america', 'china', 'pakistan', 'bangladesh',
    'movie', 'film', 'actor', 'actress', 'celebrity', 'entertainment',
    'stock', 'market', 'economy', 'business', 'company', 'startup',
    'forest fire', 'wildfire', 'bushfire'  # Exclude forest fires unless in India
]

# Keywords that must be present for relevance
INCLUDE_KEYWORDS = [
    'india', 'indian', 'mumbai', 'chennai', 'kolkata', 'delhi', 'bangalore',
    'hyderabad', 'kerala', 'tamil nadu', 'maharashtra', 'gujarat', 'odisha',
    'west bengal', 'andhra pradesh', 'karnataka', 'goa', 'bay of bengal',
    'arabian sea', 'indian ocean', 'coast guard', 'ndrf', 'imd'
]

def is_relevant_content(title, summary):
    """Check if the content is relevant to Indian coastal disasters"""
    content = (title + " " + summary).lower()
    
    # Exclude if contains any exclude keywords
    for keyword in EXCLUDE_KEYWORDS:
        if keyword in content:
            return False
    
    # For GDACS, check if it mentions India
    if 'gdacs' in content or 'disaster alert' in content:
        # Only include if it mentions India or Indian regions
        for keyword in INCLUDE_KEYWORDS:
            if keyword in content:
                return True
        return False
    
    # For other sources, must contain at least one include keyword
    for keyword in INCLUDE_KEYWORDS:
        if keyword in content:
            return True
    
    return False

def harvest():
    db = SessionLocal()
    print("Starting Social Harvest...")

    count = 0
    filtered_count = 0
    
    for feed_info in RSS_FEEDS:
        print(f"   Reading feed: {feed_info['source']}...")
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
            summary = ""
            if hasattr(entry, "summary"):
                summary = entry.summary
                content_text += f"\n\n{summary}"

            # 4. Filter irrelevant content
            if not is_relevant_content(entry.title, summary):
                filtered_count += 1
                continue

            # 5. Save to DB
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
    print(f"Harvest Complete. Added {count} new posts. Filtered out {filtered_count} irrelevant posts.")

if __name__ == "__main__":
    harvest()