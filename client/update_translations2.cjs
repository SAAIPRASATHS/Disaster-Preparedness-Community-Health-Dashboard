const fs = require('fs');
const path = require('path');

const locales = ['en', 'hi', 'ta'];

const newKeys = {
    en: {
        userDashboard: {
            instantSupport: "Instant Support",
            instantSupportDesc: "Trigger immediate assistance or mark yourself as safe during an active crisis.",
            signalling: "SIGNALLING...",
            helpIsComing: "HELP IS COMING",
            triggerSos: "TRIGGER SOS",
            responseTeamOnline: "Response Team Online",
            readinessScore: "Readiness Score",
            resilient: "Resilient",
            vulnerable: "Vulnerable",
            atRisk: "At Risk",
            refineKit: "Refine your kit to increase resilience",
            liveUpdates: "Live Updates",
            tideUp: "Tide Up ✓",
            stable: "Stable",
            calculatedForHousehold: "Calculated for your household",
            completed: "COMPLETED",
            drillProtocol: "DRILL PROTOCOL",
            drillNotTested: "Protocol hasn't been tested yet.",
            drillExpires: "Protocol expires in {{days}} days. Refresh now.",
            drillNextCheck: "Next protocol check in {{days}} days.",
            drillPractising: "Practising evacuation routes is critical for family safety.",
            runDrillNow: "RUN DRILL NOW",
            refreshProtocol: "REFRESH PROTOCOL",
            southwestMonsoon: "🌧️ Southwest Monsoon Active",
            southwestMonsoonDesc: "Flood risk elevated (June–September). Stay prepared.",
            cycloneSeason: "🌀 Cyclone Season Active",
            cycloneSeasonDesc: "Northeast Monsoon active (Oct–Dec). Monitor coastal alerts.",
            heatSeason: "🌡️ Pre-Monsoon Heat Season",
            heatSeasonDesc: "Heatwave risk (March–May). Stay hydrated, avoid midday sun.",
            drySeason: "☀️ Dry Season",
            drySeasonDesc: "No active seasonal hazard. Maintain your emergency kit.",
            viewDetailedProtocol: "View Detailed Protocol",
            shareUpdate: "Share Update"
        }
    },
    hi: {
        userDashboard: {
            instantSupport: "तत्काल सहायता",
            instantSupportDesc: "तत्काल सहायता ट्रिगर करें या सक्रिय संकट के दौरान खुद को सुरक्षित चिह्नित करें।",
            signalling: "संकेत दे रहा है...",
            helpIsComing: "मदद आ रही है",
            triggerSos: "एसओएस ट्रिगर करें",
            responseTeamOnline: "प्रतिक्रिया टीम ऑनलाइन",
            readinessScore: "तैयारी स्कोर",
            resilient: "लचीला",
            vulnerable: "संवेदनशील",
            atRisk: "खतरे में",
            refineKit: "लचीलापन बढ़ाने के लिए अपनी किट को परिष्कृत करें",
            liveUpdates: "लाइव अपडेट",
            tideUp: "ज्वार ऊपर ✓",
            stable: "स्थिर",
            calculatedForHousehold: "आपके घर के लिए गणना की गई",
            completed: "पूरा हुआ",
            drillProtocol: "ड्रिल प्रोटोकॉल",
            drillNotTested: "प्रोटोकॉल का अभी तक परीक्षण नहीं किया गया है।",
            drillExpires: "प्रोटोकॉल {{days}} दिनों में समाप्त हो रहा है। अभी रीफ्रेश करें।",
            drillNextCheck: "{{days}} दिनों में अगला प्रोटोकॉल चेक।",
            drillPractising: "निकासी मार्गों का अभ्यास करना परिवार की सुरक्षा के लिए महत्वपूर्ण है।",
            runDrillNow: "अभी ड्रिल चलाएं",
            refreshProtocol: "प्रोटोकॉल रीफ्रेश करें",
            southwestMonsoon: "🌧️ दक्षिण-पश्चिम मानसून सक्रिय",
            southwestMonsoonDesc: "बाढ़ का खतरा बढ़ा (जून-सितंबर)। तैयार रहें।",
            cycloneSeason: "🌀 चक्रवात का मौसम सक्रिय",
            cycloneSeasonDesc: "पूर्वोत्तर मानसून सक्रिय (अक्टूबर-दिसंबर)। तटीय अलर्ट पर नजर रखें।",
            heatSeason: "🌡️ प्री-मानसून गर्मी का मौसम",
            heatSeasonDesc: "लू का खतरा (मार्च-मई)। हाइड्रेटेड रहें, दोपहर की धूप से बचें।",
            drySeason: "☀️ शुष्क मौसम",
            drySeasonDesc: "कोई सक्रिय मौसमी खतरा नहीं। अपनी आपातकालीन किट बनाए रखें।",
            viewDetailedProtocol: "विस्तृत प्रोटोकॉल देखें",
            shareUpdate: "अपडेट साझा करें"
        }
    },
    ta: {
        userDashboard: {
            instantSupport: "உடனடி ஆதரவு",
            instantSupportDesc: "ஒரு நெருக்கடியின் போது உடனடி உதவியைத் தூண்டவும் அல்லது உங்களைப் பாதுகாப்பாகக் குறிக்கவும்.",
            signalling: "சிக்னலிங்...",
            helpIsComing: "உதவி வருகிறது",
            triggerSos: "SOS ஐத் தூண்டு",
            responseTeamOnline: "பதில் குழு ஆன்லைனில்",
            readinessScore: "தயார்நிலை மதிப்பெண்",
            resilient: "தாங்கும் திறன்",
            vulnerable: "பாதிக்கப்படக்கூடியது",
            atRisk: "ஆபத்தில்",
            refineKit: "பின்னடைவை அதிகரிக்க உங்கள் கருவியை மேம்படுத்தவும்",
            liveUpdates: "நேரலை புதுப்பிப்புகள்",
            tideUp: "அலை உயர்வு ✓",
            stable: "நிலையானது",
            calculatedForHousehold: "உங்கள் வீடுகளுக்காக கணக்கிடப்பட்டது",
            completed: "முடிந்தது",
            drillProtocol: "பயிற்சி நெறிமுறை",
            drillNotTested: "நெறிமுறை இன்னும் சோதிக்கப்படவில்லை.",
            drillExpires: "நெறிமுறை {{days}} நாட்களில் காலாவதியாகிறது. இப்போதே புதுப்பிக்கவும்.",
            drillNextCheck: "அடுத்த நெறிமுறை சரிபார்ப்பு {{days}} நாட்களில்.",
            drillPractising: "வெளியேற்ற வழிகளைப் பயிற்சி செய்வது குடும்ப பாதுகாப்பிற்கு முக்கியமானது.",
            runDrillNow: "இப்போது பயிற்சியை இயக்கு",
            refreshProtocol: "நெறிமுறையைப் புதுப்பிக்கவும்",
            southwestMonsoon: "🌧️ தென்மேற்கு பருவமழை செயலில் உள்ளது",
            southwestMonsoonDesc: "வெள்ள அபாயம் அதிகரித்துள்ளது (ஜூன்-செப்டம்பர்). தயாராக இருங்கள்.",
            cycloneSeason: "🌀 சூறாவளி காலம் செயலில் உள்ளது",
            cycloneSeasonDesc: "வடகிழக்கு பருவமழை செயலில் உள்ளது (அக்டோபர்-டிசம்பர்). கடலோர விழிப்பூட்டல்களைக் கண்காணிக்கவும்.",
            heatSeason: "🌡️ பருவமழைக்கு முந்தைய வெப்ப காலம்",
            heatSeasonDesc: "வெப்ப அலை அபாயம் (மார்ச்-மே). நீரேற்றமாக இருங்கள், நண்பகல் வெயிலைத் தவிர்க்கவும்.",
            drySeason: "☀️ வறண்ட காலம்",
            drySeasonDesc: "சுறுசுறுப்பான பருவகால ஆபத்து இல்லை. உங்கள் அவசர கருவியை பராமரிக்கவும்.",
            viewDetailedProtocol: "விரிவான நெறிமுறையைக் காண்க",
            shareUpdate: "புதுப்பிப்பைப் பகிரவும்"
        }
    }
};

locales.forEach(lang => {
    const file = path.join(__dirname, 'src', 'locales', lang, 'translation.json');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    // Merge new keys into existing userDashboard
    data.userDashboard = { ...data.userDashboard, ...newKeys[lang].userDashboard };
    fs.writeFileSync(file, JSON.stringify(data, null, 4));
});

console.log('Translations updated!');
