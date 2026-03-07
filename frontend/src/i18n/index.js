import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    resources: {
      en: {
        translation: {
          // Navigation
          dashboard: "Dashboard",
          myProfile: "My Profile",
          map: "Map",
          adminPanel: "Admin Panel",
          newReport: "New Report",
          signOut: "Sign Out",
          home: "Home",
          alerts: "Alerts & Notices",
          
          // Status & States
          activeIncidents: "Active Incidents",
          live: "Live",
          noIncidents: "No active incidents",
          loading: "Loading...",
          all: "All",
          pending: "Pending",
          verified: "Verified",
          rejected: "Rejected",
          fakeIrrelevant: "Fake/Irrelevant",
          
          // Emergency & SOS
          emergencyDirectory: "Emergency Directory",
          socialUpdates: "Social Updates",
          noUpdates: "No updates yet",
          sos: "SOS",
          sosTriggers: "SOS Triggers",
          
          // Reports
          incidents: "Incidents",
          infoFeed: "Info & Feed",
          filter: "Filter",
          submitReport: "Submit Report",
          reportPhoto: "Report Photo",
          disasterType: "Disaster Type",
          description: "Description",
          locationGps: "Location (GPS)",
          detectingLocation: "Detecting your location...",
          locationFound: "Location found",
          locationDenied: "Location denied — using India default",
          transmitting: "Transmitting...",
          reportSubmitted: "Report submitted successfully!",
          uploadPhoto: "Click to upload photo",
          myReports: "My Reports",
          noReports: "No reports found",
          deleteReport: "Delete report",
          confirmDelete: "Delete this report? This cannot be undone.",
          allReports: "All Reports",
          
          // Profile
          editProfile: "Edit Profile",
          fullName: "Full Name",
          email: "Email",
          password: "Password",
          governmentAdmin: "Government Admin",
          areaOfControl: "Area of Control",
          emergencyContacts: "Emergency Contacts",
          quickActions: "Quick Actions",
          dangerZone: "Danger Zone",
          deleteMyAccount: "Delete My Account",
          deleteAccount: "Delete Account",
          accountDeletion: "Account Deletion",
          cannotBeUndone: "cannot be undone",
          permanentlyDelete: "This will permanently delete your account and remove all your data from our servers.",
          willBeDeleted: "The following will be permanently deleted:",
          disasterReports: "disaster report(s)",
          allComments: "All your comments and interactions",
          profileInfo: "Your profile photo and personal information",
          phoneVerification: "Phone verification and alert preferences",
          
          // Admin
          adminDashboard: "Admin Dashboard",
          totalReports: "Total Reports",
          pendingReview: "Pending Review",
          verifiedHazards: "Verified Hazards",
          criticalAlerts: "Critical Alerts",
          verify: "Verify",
          reject: "Reject",
          reset: "Reset",
          issuedAlerts: "Issued Alerts",
          aiIntelligence: "AI Intelligence",
          
          // Comments
          comments: "Comments",
          addComment: "Add a comment...",
          post: "Post",
          noComments: "No comments yet. Be the first.",
          reply: "Reply",
          
          // Auth
          login: "Login",
          signup: "Sign Up",
          welcomeBack: "Welcome Back",
          createAccount: "Create Account",
          
          // Alerts & Notices
          governmentAlerts: "Government Alerts",
          governmentAdvisory: "Government Advisory",
          noActiveAlerts: "No active alerts",
          
          // Misc
          confirm: "Confirm",
          share: "Share",
          cancel: "Cancel",
          save: "Save",
          close: "Close",
          delete: "Delete",
        },
      },
      hi: {
        translation: {
          // Navigation
          dashboard: "डैशबोर्ड",
          myProfile: "मेरी प्रोफ़ाइल",
          map: "नक्शा",
          adminPanel: "एडमिन पैनल",
          newReport: "नई रिपोर्ट",
          signOut: "साइन आउट",
          home: "होम",
          alerts: "अलर्ट और सूचनाएं",
          
          // Status & States
          activeIncidents: "सक्रिय घटनाएं",
          live: "लाइव",
          noIncidents: "कोई सक्रिय घटना नहीं",
          loading: "लोड हो रहा है...",
          all: "सभी",
          pending: "लंबित",
          verified: "सत्यापित",
          rejected: "अस्वीकृत",
          fakeIrrelevant: "नकली/अप्रासंगिक",
          
          // Emergency & SOS
          emergencyDirectory: "आपातकालीन निर्देशिका",
          socialUpdates: "सोशल अपडेट",
          noUpdates: "अभी कोई अपडेट नहीं",
          sos: "एसओएस",
          sosTriggers: "एसओएस ट्रिगर",
          
          // Reports
          incidents: "घटनाएं",
          infoFeed: "जानकारी",
          filter: "फ़िल्टर",
          submitReport: "रिपोर्ट सबमिट करें",
          reportPhoto: "रिपोर्ट फ़ोटो",
          disasterType: "आपदा प्रकार",
          description: "विवरण",
          locationGps: "स्थान (GPS)",
          detectingLocation: "आपका स्थान खोजा जा रहा है...",
          locationFound: "स्थान मिला",
          locationDenied: "स्थान अस्वीकृत — डिफ़ॉल्ट उपयोग",
          transmitting: "भेजा जा रहा है...",
          reportSubmitted: "रिपोर्ट सफलतापूर्वक सबमिट की गई!",
          uploadPhoto: "फ़ोटो अपलोड करें",
          myReports: "मेरी रिपोर्टें",
          noReports: "कोई रिपोर्ट नहीं मिली",
          deleteReport: "रिपोर्ट हटाएं",
          confirmDelete: "इस रिपोर्ट को हटाएं?",
          allReports: "सभी रिपोर्टें",
          
          // Profile
          editProfile: "प्रोफ़ाइल संपादित करें",
          fullName: "पूरा नाम",
          email: "ईमेल",
          password: "पासवर्ड",
          governmentAdmin: "सरकारी व्यवस्थापक",
          areaOfControl: "नियंत्रण क्षेत्र",
          emergencyContacts: "आपातकालीन संपर्क",
          quickActions: "त्वरित कार्य",
          dangerZone: "खतरे का क्षेत्र",
          deleteMyAccount: "मेरा खाता हटाएं",
          deleteAccount: "खाता हटाएं",
          accountDeletion: "खाता हटाना",
          cannotBeUndone: "पूर्ववत नहीं किया जा सकता",
          permanentlyDelete: "यह आपके खाते को स्थायी रूप से हटा देगा और हमारे सर्वर से आपका सभी डेटा हटा देगा।",
          willBeDeleted: "निम्नलिखित स्थायी रूप से हटा दिया जाएगा:",
          disasterReports: "आपदा रिपोर्ट",
          allComments: "आपकी सभी टिप्पणियां और इंटरैक्शन",
          profileInfo: "आपकी प्रोफ़ाइल फ़ोटो और व्यक्तिगत जानकारी",
          phoneVerification: "फ़ोन सत्यापन और अलर्ट प्राथमिकताएं",
          
          // Admin
          adminDashboard: "एडमिन डैशबोर्ड",
          totalReports: "कुल रिपोर्टें",
          pendingReview: "समीक्षा लंबित",
          verifiedHazards: "सत्यापित खतरे",
          criticalAlerts: "गंभीर अलर्ट",
          verify: "सत्यापित करें",
          reject: "अस्वीकार करें",
          reset: "रीसेट",
          issuedAlerts: "जारी अलर्ट",
          aiIntelligence: "एआई इंटेलिजेंस",
          
          // Comments
          comments: "टिप्पणियां",
          addComment: "टिप्पणी जोड़ें...",
          post: "पोस्ट करें",
          noComments: "अभी कोई टिप्पणी नहीं।",
          reply: "जवाब दें",
          
          // Auth
          login: "लॉगिन",
          signup: "साइन अप",
          welcomeBack: "वापसी पर स्वागत है",
          createAccount: "खाता बनाएं",
          
          // Alerts & Notices
          governmentAlerts: "सरकारी अलर्ट",
          governmentAdvisory: "सरकारी सलाह",
          noActiveAlerts: "कोई सक्रिय अलर्ट नहीं",
          
          // Misc
          confirm: "पुष्टि करें",
          share: "साझा करें",
          cancel: "रद्द करें",
          save: "सहेजें",
          close: "बंद करें",
          delete: "हटाएं",
        },
      },
      mr: {
        translation: {
          // Navigation
          dashboard: "डॅशबोर्ड",
          myProfile: "माझी प्रोफाइल",
          map: "नकाशा",
          adminPanel: "प्रशासक पॅनेल",
          newReport: "नवीन अहवाल",
          signOut: "साइन आउट",
          home: "होम",
          alerts: "सूचना आणि अलर्ट",
          
          // Status & States
          activeIncidents: "सक्रिय घटना",
          live: "लाइव्ह",
          noIncidents: "कोणतीही सक्रिय घटना नाही",
          loading: "लोड होत आहे...",
          all: "सर्व",
          pending: "प्रलंबित",
          verified: "सत्यापित",
          rejected: "नाकारले",
          
          // Emergency
          emergencyDirectory: "आपत्कालीन निर्देशिका",
          socialUpdates: "सोशल अपडेट",
          noUpdates: "अद्याप कोणतेही अपडेट नाही",
          
          // Reports
          incidents: "घटना",
          infoFeed: "माहिती",
          filter: "फिल्टर",
          submitReport: "अहवाल सबमिट करा",
          reportPhoto: "अहवाल फोटो",
          disasterType: "आपत्ती प्रकार",
          description: "वर्णन",
          locationGps: "स्थान (GPS)",
          detectingLocation: "आपले स्थान शोधत आहे...",
          locationFound: "स्थान सापडले",
          locationDenied: "स्थान नाकारले — डिफॉल्ट वापरत आहे",
          transmitting: "पाठवत आहे...",
          reportSubmitted: "अहवाल यशस्वीरित्या सबमिट केला!",
          uploadPhoto: "फोटो अपलोड करा",
          myReports: "माझे अहवाल",
          noReports: "कोणतेही अहवाल सापडले नाहीत",
          deleteReport: "अहवाल हटवा",
          confirmDelete: "हा अहवाल हटवायचा?",
          
          // Profile
          editProfile: "प्रोफाइल संपादित करा",
          fullName: "पूर्ण नाव",
          email: "ईमेल",
          password: "पासवर्ड",
          
          // Admin
          adminDashboard: "प्रशासक डॅशबोर्ड",
          totalReports: "एकूण अहवाल",
          pendingReview: "पुनरावलोकन प्रलंबित",
          verifiedHazards: "सत्यापित धोके",
          criticalAlerts: "गंभीर इशारे",
          verify: "सत्यापित करा",
          reject: "नाकारा",
          reset: "रीसेट",
          
          // Comments
          comments: "टिप्पण्या",
          addComment: "टिप्पणी जोडा...",
          post: "पोस्ट करा",
          noComments: "अद्याप कोणत्याही टिप्पण्या नाहीत.",
          reply: "उत्तर द्या",
          
          // Auth
          login: "लॉगिन",
          signup: "साइन अप",
          welcomeBack: "परत स्वागत आहे",
          createAccount: "खाते तयार करा",
          
          // Misc
          governmentAdvisory: "शासकीय सल्ला",
          confirm: "पुष्टी करा",
          share: "शेअर करा",
        },
      },
    bn: {
  translation: {
    // Navigation
    dashboard: "ড্যাশবোর্ড", myProfile: "আমার প্রোফাইল", map: "মানচিত্র",
    adminPanel: "অ্যাডমিন প্যানেল", newReport: "নতুন রিপোর্ট", signOut: "সাইন আউট",
    home: "হোম", alerts: "সতর্কতা এবং বিজ্ঞপ্তি",
    
    // Status & States
    activeIncidents: "সক্রিয় ঘটনা", live: "লাইভ", noIncidents: "কোনো সক্রিয় ঘটনা নেই",
    loading: "লোড হচ্ছে...", all: "সব", pending: "অপেক্ষমাণ", 
    verified: "যাচাইকৃত", rejected: "প্রত্যাখ্যাত",
    
    // Emergency
    emergencyDirectory: "জরুরি নির্দেশিকা", socialUpdates: "সামাজিক আপডেট", 
    noUpdates: "এখনও কোনো আপডেট নেই",
    
    // Reports
    incidents: "ঘটনা", infoFeed: "তথ্য ও ফিড", filter: "ফিল্টার", 
    submitReport: "রিপোর্ট জমা দিন", reportPhoto: "রিপোর্ট ফটো", 
    disasterType: "দুর্যোগের ধরন", description: "বিবরণ", locationGps: "অবস্থান (GPS)",
    detectingLocation: "আপনার অবস্থান খুঁজছে...", locationFound: "অবস্থান পাওয়া গেছে",
    locationDenied: "অবস্থান অস্বীকৃত — ডিফল্ট ব্যবহার করা হচ্ছে",
    transmitting: "পাঠানো হচ্ছে...", reportSubmitted: "রিপোর্ট সফলভাবে জমা দেওয়া হয়েছে!",
    uploadPhoto: "ফটো আপলোড করুন", myReports: "আমার রিপোর্ট", 
    noReports: "কোনো রিপোর্ট পাওয়া যায়নি", deleteReport: "রিপোর্ট মুছুন",
    confirmDelete: "এই রিপোর্ট মুছবেন?",
    
    // Profile
    editProfile: "প্রোফাইল সম্পাদনা", fullName: "পুরো নাম", 
    email: "ইমেইল", password: "পাসওয়ার্ড",
    
    // Admin
    adminDashboard: "অ্যাডমিন ড্যাশবোর্ড", totalReports: "মোট রিপোর্ট",
    pendingReview: "পর্যালোচনা অপেক্ষমাণ", verifiedHazards: "যাচাইকৃত বিপদ",
    criticalAlerts: "গুরুতর সতর্কতা", verify: "যাচাই করুন", 
    reject: "প্রত্যাখ্যান করুন", reset: "রিসেট",
    
    // Comments
    comments: "মন্তব্য", addComment: "মন্তব্য যোগ করুন...", post: "পোস্ট করুন",
    noComments: "এখনও কোনো মন্তব্য নেই।", reply: "উত্তর দিন",
    
    // Auth
    login: "লগইন", signup: "সাইন আপ", welcomeBack: "স্বাগতম", 
    createAccount: "অ্যাকাউন্ট তৈরি করুন",
    
    // Misc
    governmentAdvisory: "সরকারি পরামর্শ", confirm: "নিশ্চিত করুন", share: "শেয়ার করুন",
  },
},
te: {
  translation: {
    // Navigation
    dashboard: "డాష్‌బోర్డ్", myProfile: "నా ప్రొఫైల్", map: "మ్యాప్",
    adminPanel: "అడ్మిన్ ప్యానెల్", newReport: "కొత్త నివేదిక", signOut: "సైన్ అవుట్",
    home: "హోమ్", alerts: "హెచ్చరికలు మరియు నోటీసులు",
    
    // Status & States
    activeIncidents: "చురుకైన సంఘటనలు", live: "లైవ్", noIncidents: "చురుకైన సంఘటనలు లేవు",
    loading: "లోడవుతోంది...", all: "అన్నీ", pending: "పెండింగ్", 
    verified: "ధృవీకరించబడింది", rejected: "తిరస్కరించబడింది",
    
    // Emergency
    emergencyDirectory: "అత్యవసర డైరెక్టరీ", socialUpdates: "సోషల్ అప్‌డేట్లు", 
    noUpdates: "ఇంకా అప్‌డేట్లు లేవు",
    
    // Reports
    incidents: "సంఘటనలు", infoFeed: "సమాచారం", filter: "ఫిల్టర్", 
    submitReport: "నివేదికను సమర్పించండి", reportPhoto: "నివేదిక ఫోటో", 
    disasterType: "విపత్తు రకం", description: "వివరణ", locationGps: "స్థానం (GPS)",
    detectingLocation: "మీ స్థానాన్ని గుర్తిస్తోంది...", locationFound: "స్థానం కనుగొనబడింది",
    locationDenied: "స్థానం తిరస్కరించబడింది — డిఫాల్ట్ ఉపయోగిస్తోంది",
    transmitting: "పంపిస్తోంది...", reportSubmitted: "నివేదిక విజయవంతంగా సమర్పించబడింది!",
    uploadPhoto: "ఫోటో అప్‌లోడ్ చేయండి", myReports: "నా నివేదికలు", 
    noReports: "నివేదికలు కనుగొనబడలేదు", deleteReport: "నివేదికను తొలగించు",
    confirmDelete: "ఈ నివేదికను తొలగించాలా?",
    
    // Profile
    editProfile: "ప్రొఫైల్ సవరించు", fullName: "పూర్తి పేరు", 
    email: "ఇమెయిల్", password: "పాస్‌వర్డ్",
    
    // Admin
    adminDashboard: "అడ్మిన్ డాష్‌బోర్డ్", totalReports: "మొత్తం నివేదికలు",
    pendingReview: "సమీక్ష పెండింగ్", verifiedHazards: "ధృవీకరించబడిన ప్రమాదాలు",
    criticalAlerts: "క్లిష్టమైన హెచ్చరికలు", verify: "ధృవీకరించు", 
    reject: "తిరస్కరించు", reset: "రీసెట్",
    
    // Comments
    comments: "వ్యాఖ్యలు", addComment: "వ్యాఖ్య జోడించండి...", post: "పోస్ట్ చేయి",
    noComments: "ఇంకా వ్యాఖ్యలు లేవు.", reply: "సమాధానం ఇవ్వండి",
    
    // Auth
    login: "లాగిన్", signup: "సైన్ అప్", welcomeBack: "తిరిగి స్వాగతం", 
    createAccount: "ఖాతా సృష్టించు",
    
    // Misc
    governmentAdvisory: "ప్రభుత్వ సలహా", confirm: "నిర్ధారించు", share: "షేర్ చేయి",
  },
},
ta: {
  translation: {
    // Navigation
    dashboard: "டாஷ்போர்டு", myProfile: "என் சுயவிவரம்", map: "வரைபடம்",
    adminPanel: "நிர்வாக பலகை", newReport: "புதிய அறிக்கை", signOut: "வெளியேறு",
    home: "முகப்பு", alerts: "எச்சரிக்கைகள் மற்றும் அறிவிப்புகள்",
    
    // Status & States
    activeIncidents: "செயலில் உள்ள சம்பவங்கள்", live: "நேரடி", 
    noIncidents: "செயலில் உள்ள சம்பவங்கள் இல்லை", loading: "ஏற்றுகிறது...", 
    all: "அனைத்தும்", pending: "நிலுவையில்", verified: "சரிபார்க்கப்பட்டது", 
    rejected: "நிராகரிக்கப்பட்டது",
    
    // Emergency
    emergencyDirectory: "அவசர கோப்பகம்", socialUpdates: "சமூக புதுப்பிப்புகள்", 
    noUpdates: "இன்னும் புதுப்பிப்புகள் இல்லை",
    
    // Reports
    incidents: "சம்பவங்கள்", infoFeed: "தகவல்", filter: "வடிகட்டி", 
    submitReport: "அறிக்கை சமர்பிக்கவும்", reportPhoto: "அறிக்கை புகைப்படம்", 
    disasterType: "பேரிடர் வகை", description: "விவரிப்பு", locationGps: "இடம் (GPS)",
    detectingLocation: "உங்கள் இடத்தை கண்டறிகிறது...", locationFound: "இடம் கண்டறியப்பட்டது",
    locationDenied: "இடம் மறுக்கப்பட்டது — இயல்புநிலை பயன்படுத்துகிறது",
    transmitting: "அனுப்புகிறது...", reportSubmitted: "அறிக்கை வெற்றிகரமாக சமர்பிக்கப்பட்டது!",
    uploadPhoto: "புகைப்படம் பதிவேற்றவும்", myReports: "என் அறிக்கைகள்", 
    noReports: "அறிக்கைகள் இல்லை", deleteReport: "அறிக்கையை நீக்கு",
    confirmDelete: "இந்த அறிக்கையை நீக்கவா?",
    
    // Profile
    editProfile: "சுயவிவரம் திருத்து", fullName: "முழு பெயர்", 
    email: "மின்னஞ்சல்", password: "கடவுச்சொல்",
    
    // Admin
    adminDashboard: "நிர்வாக டாஷ்போர்டு", totalReports: "மொத்த அறிக்கைகள்",
    pendingReview: "மதிப்பாய்வு நிலுவையில்", verifiedHazards: "சரிபார்க்கப்பட்ட ஆபத்துகள்",
    criticalAlerts: "முக்கியமான எச்சரிக்கைகள்", verify: "சரிபார்", 
    reject: "நிராகரி", reset: "மீட்டமை",
    
    // Comments
    comments: "கருத்துகள்", addComment: "கருத்து சேர்க்கவும்...", post: "பதிவிடு",
    noComments: "இன்னும் கருத்துகள் இல்லை.", reply: "பதிலளி",
    
    // Auth
    login: "உள்நுழை", signup: "பதிவு செய்க", welcomeBack: "மீண்டும் வரவேற்கிறோம்", 
    createAccount: "கணக்கு உருவாக்கு",
    
    // Misc
    governmentAdvisory: "அரசு ஆலோசனை", confirm: "உறுதிப்படுத்து", share: "பகிர்",
  },
},
gu: {
  translation: {
    dashboard: "ડૅશબોર્ડ", myProfile: "મારી પ્રોફાઇલ", map: "નકશો",
    adminPanel: "એડમિન પૅનલ", newReport: "નવો અહેવાલ", signOut: "સાઇન આઉટ",
    activeIncidents: "સક્રિય ઘટનાઓ", live: "લાઇવ", noIncidents: "કોઈ સક્રિય ઘટના નથી",
    loading: "લોડ થઈ રહ્યું છે...", emergencyDirectory: "કટોકટી નિર્દેશિકા",
    socialUpdates: "સામાજિક અપડેટ", noUpdates: "હજી કોઈ અપડેટ નથી",
    incidents: "ઘટનાઓ", infoFeed: "માહિતી",
    all: "બધા", pending: "બાકી", verified: "ચકાસાયેલ", rejected: "નકલી / અસ્પষ્ટ",
    filter: "ફિલ્ટર", submitReport: "અહેવાલ સબમિટ કરો",
    reportPhoto: "અહેવાલ ફોટો", disasterType: "આપત્તિ પ્રકાર",
    description: "વર્ણન", locationGps: "સ્થાન (GPS)",
    detectingLocation: "તમારું સ્થાન શોધી રહ્યું છે...", locationFound: "સ્થાન મળ્યું",
    locationDenied: "સ્થાન નકારાયું — ડિફૉલ્ટ વાપરી રહ્યું છે",
    transmitting: "મોકલી રહ્યું છે...", reportSubmitted: "અહેવાલ સફળતાપૂર્વક સબમિટ થયો!",
    uploadPhoto: "ફોટો અપલોડ કરો", editProfile: "પ્રોફાઇલ સંપાદિત કરો",
    myReports: "મારા અહેવાલ", noReports: "કોઈ અહેવાલ મળ્યો નથી",
    verify: "ચકાસો", reject: "નકારો", reset: "રીસેટ",
    comments: "ટિપ્પણીઓ", addComment: "ટિપ્પણી ઉમેરો...", post: "પોસ્ટ કરો",
    noComments: "હજી કોઈ ટિપ્પણી નથી.",
    login: "લૉગિન", signup: "સાઇન અપ", email: "ઇમેઇલ",
    password: "પાસવર્ડ", fullName: "પૂરું નામ",
    welcomeBack: "પાછા સ્વાગત છે", createAccount: "ખાતું બનાવો",
    governmentAdvisory: "સરકારી સલાહ",
  },
},
kn: {
  translation: {
    // Navigation
    dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", myProfile: "ನನ್ನ ಪ್ರೊಫೈಲ್", map: "ನಕ್ಷೆ",
    adminPanel: "ಆಡಳಿತ ಫಲಕ", newReport: "ಹೊಸ ವರದಿ", signOut: "ಸೈನ್ ಔಟ್",
    home: "ಮುಖಪುಟ", alerts: "ಎಚ್ಚರಿಕೆಗಳು ಮತ್ತು ಸೂಚನೆಗಳು",
    
    // Status & States
    activeIncidents: "ಸಕ್ರಿಯ ಘಟನೆಗಳು", live: "ಲೈವ್", noIncidents: "ಯಾವುದೇ ಸಕ್ರಿಯ ಘಟನೆ ಇಲ್ಲ",
    loading: "ಲೋಡ್ ಆಗುತ್ತಿದೆ...", all: "ಎಲ್ಲಾ", pending: "ಬಾಕಿ", 
    verified: "ಪರಿಶೀಲಿಸಲಾಗಿದೆ", rejected: "ತಿರಸ್ಕರಿಸಲಾಗಿದೆ",
    
    // Emergency
    emergencyDirectory: "ತುರ್ತು ನಿರ್ದೇಶಿಕೆ", socialUpdates: "ಸಾಮಾಜಿಕ ನವೀಕರಣಗಳು", 
    noUpdates: "ಇನ್ನೂ ನವೀಕರಣಗಳಿಲ್ಲ",
    
    // Reports
    incidents: "ಘಟನೆಗಳು", infoFeed: "ಮಾಹಿತಿ", filter: "ಫಿಲ್ಟರ್", 
    submitReport: "ವರದಿ ಸಲ್ಲಿಸಿ", reportPhoto: "ವರದಿ ಫೋಟೋ", 
    disasterType: "ವಿಪತ್ತು ಪ್ರಕಾರ", description: "ವಿವರಣೆ", locationGps: "ಸ್ಥಳ (GPS)",
    detectingLocation: "ನಿಮ್ಮ ಸ್ಥಳ ಪತ್ತೆ ಮಾಡುತ್ತಿದೆ...", locationFound: "ಸ್ಥಳ ಕಂಡುಬಂತು",
    locationDenied: "ಸ್ಥಳ ನಿರಾಕರಿಸಲಾಗಿದೆ — ಡಿಫಾಲ್ಟ್ ಬಳಸುತ್ತಿದೆ",
    transmitting: "ಕಳುಹಿಸುತ್ತಿದೆ...", reportSubmitted: "ವರದಿ ಯಶಸ್ವಿಯಾಗಿ ಸಲ್ಲಿಸಲಾಗಿದೆ!",
    uploadPhoto: "ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ", myReports: "ನನ್ನ ವರದಿಗಳು", 
    noReports: "ವರದಿಗಳು ಕಂಡುಬಂದಿಲ್ಲ", deleteReport: "ವರದಿ ಅಳಿಸಿ",
    confirmDelete: "ಈ ವರದಿ ಅಳಿಸುವುದೇ?",
    
    // Profile
    editProfile: "ಪ್ರೊಫೈಲ್ ಸಂಪಾದಿಸಿ", fullName: "ಪೂರ್ಣ ಹೆಸರು", 
    email: "ಇಮೇಲ್", password: "ಪಾಸ್‌ವರ್ಡ್",
    
    // Admin
    adminDashboard: "ಆಡಳಿತ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", totalReports: "ಒಟ್ಟು ವರದಿಗಳು",
    pendingReview: "ಪರಿಶೀಲನೆ ಬಾಕಿ", verifiedHazards: "ಪರಿಶೀಲಿಸಿದ ಅಪಾಯಗಳು",
    criticalAlerts: "ನಿರ್ಣಾಯಕ ಎಚ್ಚರಿಕೆಗಳು", verify: "ಪರಿಶೀಲಿಸಿ", 
    reject: "ತಿರಸ್ಕರಿಸಿ", reset: "ರೀಸೆಟ್",
    
    // Comments
    comments: "ಕಾಮೆಂಟ್‌ಗಳು", addComment: "ಕಾಮೆಂಟ್ ಸೇರಿಸಿ...", post: "ಪೋಸ್ಟ್ ಮಾಡಿ",
    noComments: "ಇನ್ನೂ ಕಾಮೆಂಟ್‌ಗಳಿಲ್ಲ.", reply: "ಉತ್ತರಿಸಿ",
    
    // Auth
    login: "ಲಾಗಿನ್", signup: "ಸೈನ್ ಅಪ್", welcomeBack: "ಮತ್ತೆ ಸ್ವಾಗತ", 
    createAccount: "ಖಾತೆ ರಚಿಸಿ",
    
    // Misc
    governmentAdvisory: "ಸರ್ಕಾರದ ಸಲಹೆ", confirm: "ದೃಢೀಕರಿಸಿ", share: "ಹಂಚಿಕೊಳ್ಳಿ",
  },
},
    
    },
  });


export default i18n;