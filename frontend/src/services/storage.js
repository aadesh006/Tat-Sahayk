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
