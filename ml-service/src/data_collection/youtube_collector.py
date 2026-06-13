from googleapiclient.discovery import build

youtube = build('youtube', 'v3', developerKey='YOUR_API_KEY')


request = youtube.search().list(
    q='tsunami warning OR coastal flooding',
    part='snippet',
    maxResults=50,
    type='video'
)
response = request.execute()