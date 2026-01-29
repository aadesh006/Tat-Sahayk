import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
import json
import os
from pathlib import Path
import sys


sys.path.append(str(Path(__file__).parent.parent))
from config.settings import settings
random.seed(settings.RANDOM_SEED)
np.random.seed(settings.RANDOM_SEED)


HAZARD_TYPES = {
    'tsunami': {
        'keywords': ['tsunami', 'tidal wave', 'sea surge', 'ocean wall', 'water wall'],
        'weight': 0.15
    },
    'storm_surge': {
        'keywords': ['storm surge', 'high tide', 'flooding', 'coastal flood', 'sea flood'],
        'weight': 0.25
    },
    'high_waves': {
        'keywords': ['high waves', 'rough sea', 'dangerous waves', 'big waves', 'choppy waters'],
        'weight': 0.30
    },
    'cyclone': {
        'keywords': ['cyclone', 'hurricane', 'storm', 'typhoon', 'tropical storm'],
        'weight': 0.20
    },
    'coastal_erosion': {
        'keywords': ['erosion', 'beach loss', 'coastal damage', 'land loss', 'shoreline retreat'],
        'weight': 0.10
    }
}


COASTAL_LOCATIONS = [
    {'name': 'Mumbai, Maharashtra', 'lat': 19.0760, 'lon': 72.8777, 'population': 'high'},
    {'name': 'Chennai, Tamil Nadu', 'lat': 13.0827, 'lon': 80.2707, 'population': 'high'},
    {'name': 'Visakhapatnam, Andhra Pradesh', 'lat': 17.6868, 'lon': 83.2185, 'population': 'medium'},
    {'name': 'Kochi, Kerala', 'lat': 9.9312, 'lon': 76.2673, 'population': 'medium'},
    {'name': 'Goa', 'lat': 15.2993, 'lon': 74.1240, 'population': 'medium'},
    {'name': 'Puducherry', 'lat': 11.9416, 'lon': 79.8083, 'population': 'low'},
    {'name': 'Kolkata, West Bengal', 'lat': 22.5726, 'lon': 88.3639, 'population': 'high'},
    {'name': 'Mangalore, Karnataka', 'lat': 12.9141, 'lon': 74.8560, 'population': 'medium'},
    {'name': 'Puri, Odisha', 'lat': 19.8135, 'lon': 85.8312, 'population': 'low'},
    {'name': 'Port Blair, Andaman', 'lat': 11.6234, 'lon': 92.7265, 'population': 'low'},
    {'name': 'Surat, Gujarat', 'lat': 21.1702, 'lon': 72.8311, 'population': 'high'},
    {'name': 'Calicut, Kerala', 'lat': 11.2588, 'lon': 75.7804, 'population': 'medium'},
]


HAZARD_TEMPLATES = [
    "URGENT: {hazard} reported at {location}! {detail}",
    "Breaking: {hazard} hitting {location} coast. {detail}",
    "ALERT: {hazard} warning for {location}. {detail}",
    "{hazard} spotted near {location}. {detail}",
    "Emergency situation at {location} - {hazard}. {detail}",
    "Witnessing {hazard} at {location}. {detail}",
    "Severe {hazard} affecting {location} area. {detail}",
    "{location} residents report {hazard}. {detail}",
    "Critical: {hazard} emergency at {location}. {detail}",
    "Massive {hazard} observed at {location}. {detail}",
]

HAZARD_DETAILS = {
    'tsunami': [
        'Water receding rapidly from shore',
        'Unusual wave patterns observed',
        'Sea level rising fast',
        'Multiple large waves approaching',
        'Coastal areas at risk'
    ],
    'storm_surge': [
        'Water levels rising above normal',
        'Coastal flooding reported',
        'Storm pushing water inland',
        'Low-lying areas being inundated',
        'Strong winds and high tides'
    ],
    'high_waves': [
        'Waves reaching dangerous heights',
        'Rough sea conditions',
        'Fishermen advised to stay ashore',
        'Beach areas unsafe',
        'Strong currents present'
    ],
    'cyclone': [
        'Strong winds and heavy rain',
        'Cyclonic storm approaching',
        'Severe weather warning',
        'Evacuation advised',
        'Storm intensifying'
    ],
    'coastal_erosion': [
        'Significant beach loss observed',
        'Shoreline retreating',
        'Coastal structures at risk',
        'Sand erosion accelerating',
        'Long-term coastal damage'
    ]
}

NON_HAZARD_TEMPLATES = [
    "Beautiful {time} at {location} beach today! {emoji}",
    "Enjoying the calm sea at {location}. Perfect weather!",
    "{location} coastline looks amazing today.",
    "Great day for swimming at {location} beach.",
    "Sunset view from {location} is breathtaking.",
    "Beach cleanup event at {location} was successful!",
    "Dolphins spotted near {location} coast! {emoji}",
    "Family vacation at {location}. Having a great time!",
    "The {location} lighthouse looks beautiful at {time}.",
    "Morning walk along {location} beach. So peaceful.",
]

EMOJIS = ['', '', '', '', '', '', '', '', '', '']
TIMES = ['morning', 'afternoon', 'evening', 'sunset', 'sunrise']

PANIC_WORDS = {
    'critical': ['emergency', 'urgent', 'evacuate', 'help', 'sos', 'critical', 'disaster'],
    'high': ['warning', 'alert', 'danger', 'severe', 'serious'],
    'medium': ['concern', 'watch', 'caution', 'advisory'],
    'low': ['notice', 'update', 'information']
}

class DataGenerator:
    """Generate simulated ocean hazard data"""
    
    def __init__(self):
        self.output_dir = settings.RAW_DATA_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def generate_social_media_posts(self, num_posts=1000):
        """Generate simulated social media posts"""
        print(f"\n{'='*80}")
        print("GENERATING SOCIAL MEDIA POSTS")
        print(f"{'='*80}\n")
        
        posts = []
        start_date = datetime.now() - timedelta(days=30)
        

        num_hazard = int(num_posts * 0.3)
        num_non_hazard = num_posts - num_hazard
        

        print(f"Generating {num_hazard} hazard posts...")
        for i in range(num_hazard):

            hazard_type = random.choices(
                list(HAZARD_TYPES.keys()),
                weights=[v['weight'] for v in HAZARD_TYPES.values()]
            )[0]
            
            location_data = random.choice(COASTAL_LOCATIONS)
            template = random.choice(HAZARD_TEMPLATES)
            detail = random.choice(HAZARD_DETAILS[hazard_type])
            keyword = random.choice(HAZARD_TYPES[hazard_type]['keywords'])
            
            text = template.format(
                hazard=keyword,
                location=location_data['name'],
                detail=detail
            )
            

            hashtags = [f"#{hazard_type}", "#alert", "#coastal"]
            if random.random() > 0.5:
                hashtags.append(f"#{location_data['name'].split(',')[0].lower()}")
            
            text += " " + " ".join(random.sample(hashtags, k=min(3, len(hashtags))))
            

            text_lower = text.lower()
            if any(word in text_lower for word in PANIC_WORDS['critical']):
                panic_level = 'critical'
            elif any(word in text_lower for word in PANIC_WORDS['high']):
                panic_level = 'high'
            elif any(word in text_lower for word in PANIC_WORDS['medium']):
                panic_level = 'medium'
            else:
                panic_level = 'low'
            

            post_time = start_date + timedelta(
                days=random.randint(0, 30),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59)
            )
            

            base_engagement = random.randint(50, 500)
            likes = int(base_engagement * random.uniform(0.8, 1.5))
            shares = int(base_engagement * random.uniform(0.2, 0.6))
            comments = int(base_engagement * random.uniform(0.1, 0.3))
            
            post = {
                'id': f'post_{i+1:06d}',
                'platform': random.choice(['twitter', 'facebook', 'instagram']),
                'text': text,
                'location': location_data['name'],
                'latitude': location_data['lat'] + random.uniform(-0.1, 0.1),
                'longitude': location_data['lon'] + random.uniform(-0.1, 0.1),
                'timestamp': post_time.isoformat(),
                'author_id': f'user_{random.randint(1, 500)}',
                'author_username': f'user{random.randint(1000, 9999)}',
                'author_followers': random.randint(100, 50000),
                'likes': likes,
                'shares': shares,
                'comments': comments,
                'has_media': random.choice([True, False]),
                'media_type': random.choice(['image', 'video', None]),
                'hashtags': hashtags,
                'mentions': [f'@user{random.randint(100, 999)}' for _ in range(random.randint(0, 3))],
                'is_hazard': True,
                'hazard_type': hazard_type,
                'panic_level': panic_level,
                'is_verified_account': random.random() > 0.9,
            }
            
            posts.append(post)
        

        print(f"Generating {num_non_hazard} non-hazard posts...")
        for i in range(num_non_hazard):
            location_data = random.choice(COASTAL_LOCATIONS)
            template = random.choice(NON_HAZARD_TEMPLATES)
            
            text = template.format(
                location=location_data['name'],
                time=random.choice(TIMES),
                emoji=random.choice(EMOJIS)
            )
            

            hashtags = random.sample(['#beach', '#ocean', '#travel', '#vacation', '#india'], 
                                    k=random.randint(1, 3))
            text += " " + " ".join(hashtags)
            
            post_time = start_date + timedelta(
                days=random.randint(0, 30),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59)
            )
            

            base_engagement = random.randint(10, 200)
            likes = int(base_engagement * random.uniform(0.5, 1.2))
            shares = int(base_engagement * random.uniform(0.1, 0.3))
            comments = int(base_engagement * random.uniform(0.05, 0.2))
            
            post = {
                'id': f'post_{num_hazard + i + 1:06d}',
                'platform': random.choice(['twitter', 'facebook', 'instagram']),
                'text': text,
                'location': location_data['name'],
                'latitude': location_data['lat'] + random.uniform(-0.1, 0.1),
                'longitude': location_data['lon'] + random.uniform(-0.1, 0.1),
                'timestamp': post_time.isoformat(),
                'author_id': f'user_{random.randint(1, 500)}',
                'author_username': f'user{random.randint(1000, 9999)}',
                'author_followers': random.randint(50, 10000),
                'likes': likes,
                'shares': shares,
                'comments': comments,
                'has_media': random.choice([True, False]),
                'media_type': random.choice(['image', 'video', None]),
                'hashtags': hashtags,
                'mentions': [f'@user{random.randint(100, 999)}' for _ in range(random.randint(0, 2))],
                'is_hazard': False,
                'hazard_type': None,
                'panic_level': 'low',
                'is_verified_account': random.random() > 0.95,
            }
            
            posts.append(post)
        

        random.shuffle(posts)
        

        df = pd.DataFrame(posts)
        
        csv_path = self.output_dir / 'simulated_social_media_posts.csv'
        df.to_csv(csv_path, index=False)
        print(f"\n Saved {len(df)} posts to {csv_path}")
        
        json_path = self.output_dir / 'simulated_social_media_posts.json'
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(posts, f, indent=2, ensure_ascii=False)
        print(f" Saved {len(posts)} posts to {json_path}")
        
        self._print_statistics(df, "Social Media Posts")
        
        return df
    
    def generate_citizen_reports(self, num_reports=200):
        """Generate simulated citizen reports"""
        print(f"\n{'='*80}")
        print("GENERATING CITIZEN REPORTS")
        print(f"{'='*80}\n")
        
        reports = []
        
        for i in range(num_reports):
            hazard_type = random.choices(
                list(HAZARD_TYPES.keys()),
                weights=[v['weight'] for v in HAZARD_TYPES.values()]
            )[0]
            
            location_data = random.choice(COASTAL_LOCATIONS)
            keyword = random.choice(HAZARD_TYPES[hazard_type]['keywords'])
            detail = random.choice(HAZARD_DETAILS[hazard_type])
            
            descriptions = [
                f"I am reporting {keyword} at {location_data['name']}. {detail}. Please take immediate action.",
                f"Observed {keyword} near {location_data['name']} coast. {detail}. Situation appears serious.",
                f"Emergency: {keyword} affecting {location_data['name']} area. {detail}. Requesting assistance.",
                f"Witnessing dangerous {keyword} at {location_data['name']}. {detail}.",
                f"{keyword.title()} detected at {location_data['name']}. {detail}. Local authorities notified.",
            ]
            
            description = random.choice(descriptions)
            
            if any(word in description.lower() for word in ['emergency', 'urgent', 'dangerous']):
                severity = random.choice(['high', 'critical'])
            else:
                severity = random.choice(['low', 'medium', 'high'])
            
            report_time = datetime.now() - timedelta(
                days=random.randint(0, 30),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59)
            )
            
            report = {
                'id': f'report_{i+1:06d}',
                'user_id': f'citizen_{random.randint(1, 200)}',
                'hazard_type': hazard_type,
                'description': description,
                'location': location_data['name'],
                'latitude': location_data['lat'] + random.uniform(-0.05, 0.05),
                'longitude': location_data['lon'] + random.uniform(-0.05, 0.05),
                'severity': severity,
                'has_media': random.choice([True, False]),
                'media_count': random.randint(1, 5) if random.random() > 0.5 else 0,
                'timestamp': report_time.isoformat(),
                'is_verified': random.choice([True, False]),
                'verified_by': f'admin_{random.randint(1, 10)}' if random.random() > 0.7 else None,
                'status': random.choice(['pending', 'verified', 'investigating', 'resolved']),
            }
            
            reports.append(report)
        
        df = pd.DataFrame(reports)
        
        csv_path = self.output_dir / 'simulated_citizen_reports.csv'
        df.to_csv(csv_path, index=False)
        print(f"\n Saved {len(df)} reports to {csv_path}")
        
        json_path = self.output_dir / 'simulated_citizen_reports.json'
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(reports, f, indent=2, ensure_ascii=False)
        print(f" Saved {len(reports)} reports to {json_path}")
        
        self._print_statistics(df, "Citizen Reports")
        
        return df
    
    def _print_statistics(self, df, dataset_name):
        """Print dataset statistics"""
        print(f"\n {dataset_name} Statistics:")
        print(f"{'─'*80}")
        print(f"Total records: {len(df)}")
        
        if 'is_hazard' in df.columns:
            hazard_count = df['is_hazard'].sum()
            print(f"Hazard records: {hazard_count} ({hazard_count/len(df)*100:.1f}%)")
            print(f"Non-hazard records: {len(df) - hazard_count} ({(1-hazard_count/len(df))*100:.1f}%)")
        
        if 'platform' in df.columns:
            print(f"\nPlatform distribution:")
            for platform, count in df['platform'].value_counts().items():
                print(f"  {platform}: {count} ({count/len(df)*100:.1f}%)")
        
        if 'hazard_type' in df.columns:
            print(f"\nHazard type distribution:")
            hazard_df = df[df['hazard_type'].notna()]
            for hazard, count in hazard_df['hazard_type'].value_counts().items():
                print(f"  {hazard}: {count} ({count/len(hazard_df)*100:.1f}%)")
        
        if 'severity' in df.columns:
            print(f"\nSeverity distribution:")
            for severity, count in df['severity'].value_counts().items():
                print(f"  {severity}: {count} ({count/len(df)*100:.1f}%)")
        
        print(f"{'─'*80}")

def main():
    """Main execution"""
    print(f"\n{'='*80}")
    print("TAT-SAHAYK DATA GENERATION")
    print(f"{'='*80}")
    print(f"Output directory: {settings.RAW_DATA_DIR}")
    print(f"{'='*80}\n")
    
    generator = DataGenerator()
    

    social_df = generator.generate_social_media_posts(num_posts=1000)
    reports_df = generator.generate_citizen_reports(num_reports=200)
    
    print(f"\n{'='*80}")
    print(" DATA GENERATION COMPLETE!")
    print(f"{'='*80}")
    print(f"\nGenerated files:")
    print(f"  1. {settings.RAW_DATA_DIR / 'simulated_social_media_posts.csv'}")
    print(f"  2. {settings.RAW_DATA_DIR / 'simulated_social_media_posts.json'}")
    print(f"  3. {settings.RAW_DATA_DIR / 'simulated_citizen_reports.csv'}")
    print(f"  4. {settings.RAW_DATA_DIR / 'simulated_citizen_reports.json'}")
    print(f"\nYou can now proceed with data preprocessing and model training!")
    print(f"{'='*80}\n")

if __name__ == "__main__":
    main()