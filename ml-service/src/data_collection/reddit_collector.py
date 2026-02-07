import praw

reddit = praw.Reddit(
    client_id="YOUR_CLIENT_ID",
    client_secret="YOUR_CLIENT_SECRET",
    user_agent="OceanHazardBot/1.0"
)

subreddit = reddit.subreddit("oceanography+weather+coastal")
for post in subreddit.search("tsunami OR storm surge", limit=100):
    print(post.title, post.selftext)