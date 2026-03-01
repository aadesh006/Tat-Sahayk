export const reports = [
  {
    id: 1,
    username: "Karthikey Joshi",
    image: "https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=800",
    location: "Mumbai, Maharashtra",
    disasterType: "Flood",
    description: "Heavy rainfall has led to severe waterlogging in the low-lying suburban areas. Local transport is currently disrupted, and emergency services are on standby.",
  },
  {
    id: 2,
    username: "Rahul Verma",
    image: "https://images.unsplash.com/photo-1521220609214-a8552380c7a4?q=80&w=800",
    location: "Chennai, Tamil Nadu",
    disasterType: "Cyclone",
    description: "Strong winds and high tides reported along the coastline. Residents in coastal huts are being evacuated to nearby shelters as a precautionary measure.",
  },
  {
    id: 3,
    username: "Anita Patel",
    image: "https://picsum.photos/400/250?random=3",
    location: "Delhi NCR",
    disasterType: "Cyclone", // Fixed typo here
    description: "Unexpected high-velocity winds causing dust storms and minor structural damage to temporary hoardings. Citizens are advised to remain indoors.",
  },
  {
    id: 4,
    username: "Karthik Reddy",
    image: "https://images.unsplash.com/photo-1468476775582-6bede20f356f?q=80&w=800",
    location: "Hyderabad, Telangana",
    disasterType: "Flood",
    description: "Sudden cloudburst has caused the local drainage system to overflow. Several basements in the IT corridor are reporting water entry.",
  },
];

export const MapData = [
  {
    id: 1,
    name: "Cyclone",
    position: [22.7196, 75.8577], 
    radius: 130000,
    color: "#3b82f6", 
  },
  {
    id: 2,
    name: "Tsunami",
    position: [22.5744, 88.3629],
    radius: 95000,
    color: "#3b82f6",
  },
  {
    id: 3,
    name: "Flood",
    position: [19.9993, 73.7900],
    radius: 110000,
    color: "#3b82f6", 
  },
];

export const UserReports = [
    {
      id: 1,
      username: "Hardik Gupta",
      location: "Malviya Nagar, Jaipur",
      disasterType: "Flood",
      image: "https://images.unsplash.com/photo-1527482797697-8795b05a13fe?q=80&w=800",
      description: "Street is completely submerged. Water entering houses on the ground floor.",
      date: "Feb 24, 2026"
    },
    {
      id: 2,
      username: "Hardik Gupta",
      location: "C-Scheme, Jaipur",
      disasterType: "Storm",
      image: "https://images.unsplash.com/photo-1527482797697-8795b05a13fe?q=80&w=800",
      description: "Severe winds. Multiple trees down blocking the main hospital route.",
      date: "Feb 15, 2026"
    }
  ];
  
 export const protocols = {
  cyclone: {
    title: "Cyclone SOP",
    sections: [
      {
        label: "Before Cyclone",
        items: [
          "Check your roof carefully. Make sure metal sheets, tiles, and loose parts are tightly secured so strong winds cannot blow them away.",
          "Cut or trim tree branches that are close to power lines, windows, or your roof. Strong winds can break branches and cause serious damage.",
          "Store enough emergency supplies for at least 3 days. Keep non-perishable food (like rice, biscuits, canned food) and at least 4 liters of drinking water per person per day.",
          "Cover large glass windows with wooden boards or strong panels. This helps prevent glass from shattering and causing injuries during high winds."
        ]
      },
      {
        label: "During Cyclone",
        items: [
          "Switch off and unplug all electrical appliances. This prevents damage from sudden power surges and reduces fire risk.",
          "Stay inside a safe room, preferably a small room in the center of the house without windows (like a hallway or bathroom).",
          "If parts of the building start breaking or collapsing, lie down and protect your head with a mattress, pillow, or heavy blanket.",
          "Be careful if the wind suddenly becomes calm. This may be the 'eye' of the storm. Strong winds will return quickly from the opposite direction."
        ]
      }
    ]
  },
  tsunami: {
    title: "Tsunami SOP",
    sections: [
      {
        label: "Before Tsunami",
        items: [
          "If you feel strong ground shaking for more than 20 seconds, immediately move to higher ground. Do not wait for official warnings.",
          "If the sea water suddenly pulls back and the shoreline looks unusually empty, run inland right away. This is a natural warning sign of a tsunami.",
          "Try to reach a place at least 30 meters (100 feet) above sea level or as far inland as possible.",
          "If you cannot move far inland, go to the upper floors (3rd floor or higher) of a strong reinforced concrete building for safety."
        ]
      },
      {
        label: "During Tsunami",
        items: [
          "Remember that a tsunami comes in multiple waves. The first wave may not be the biggest, so do not return after it passes.",
          "Stay away from beaches and coastal areas for at least 24 hours or until authorities officially say it is safe.",
          "Before entering any building again, check for gas leaks, broken walls, cracks, or other structural damage."
        ]
      }
    ]
  },
  floods: {
    title: "Flood SOP",
    sections: [
      {
        label: "Before Flood",
        items: [
          "Block doorways, drains, and low air vents using sandbags or thick plastic sheets to reduce water entering your home.",
          "Move important items such as electronics, medicines, and important documents to higher shelves or upper floors.",
          "Fill bathtubs and clean containers with fresh water before flooding begins, as water supply may become dirty or unsafe."
        ]
      },
      {
        label: "During Flood",
        items: [
          "Do not walk through floodwater, even if it looks shallow. There may be open drains, strong currents, or sharp objects under the water.",
          "Turn off the main electricity supply if water starts reaching electrical sockets or appliances to avoid electric shock.",
          "Avoid touching floodwater as it may contain sewage, chemicals, or harmful bacteria that can cause infections.",
          "Use a long stick to check the depth and stability of the ground before stepping into water."
        ]
      }
    ]
  }
};