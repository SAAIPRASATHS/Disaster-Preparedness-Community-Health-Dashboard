# 🛡️ Disaster Preparedness & Community Health Dashboard

A decision-support platform that converts environmental data and citizen health reports into actionable disaster preparedness recommendations and outbreak detection alerts.

## Architecture

```
citizen → frontend → backend API → OpenWeatherMap
                                  → MongoDB (symptom reports)
                                  → Rule Engines → decisions
authority → dashboard → cluster detection → recommended actions
```

**Backend is the intelligence layer** — all external API calls and rule-based analysis happen server-side.

---

## Tech Stack

| Layer    | Technology                                           |
|----------|------------------------------------------------------|
| Frontend | React (Vite), TailwindCSS, Axios, React Router, Chart.js, Leaflet |
| Backend  | Node.js, Express, Mongoose, dotenv, axios, cors     |
| Database | MongoDB Atlas                                        |
| Deploy   | Backend → Render, Frontend → Vercel                 |

---

## Features

### Backend Intelligence Engines

1. **Weather Risk Engine** — `GET /api/risk?city=<name>`
   - Fetches weather from OpenWeatherMap
   - Rule engine: flood (rain>50mm OR humidity>85+low wind), heatwave (≥40°C), cyclone (wind>70km/h)
   - Returns risk level, probability score, and preparedness steps

2. **Preparedness Advisor** — `POST /api/preparedness`
   - Context-aware checklist based on disaster type + family profile (elderly, children, medical conditions)

3. **Symptom Reporting** — `POST /api/report`
   - Citizens report location + symptoms (fever, cough, vomiting, diarrhea, rash, breathing_issue)

4. **Outbreak Detection** — `GET /api/cluster`
   - Groups reports by location within 12h window
   - Rules: fever≥10→viral, vomiting+diarrhea≥8→waterborne, cough≥10→respiratory
   - Returns clusters with confidence scores and authority action recommendations

### Frontend Pages

- **Home** — City search → disaster risk cards + personalized preparedness checklist
- **Report** — Symptom form for citizens
- **Dashboard** — Authority view with Chart.js visualizations and outbreak alerts
- **Map** — Leaflet map with color-coded risk zones

---

## Setup

### Prerequisites

- Node.js 18+
- MongoDB Atlas cluster (free tier works)
- OpenWeatherMap API key (free at https://openweathermap.org/api)

### 1. Clone & configure backend

```bash
cd server
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/disaster-db
WEATHER_API_KEY=your_openweathermap_api_key
```

### 2. Install & run backend

```bash
cd server
npm install
npm run dev
```

Server starts at `http://localhost:5000`

### 3. Install & run frontend

```bash
cd client
npm install
npm run dev
```

Frontend starts at `http://localhost:5173` (proxies `/api` to backend)

---

## Deployment

### Backend → Render

1. Push `server/` to a Git repo
2. Create a new **Web Service** on [Render](https://render.com)
3. Set:
   - Build Command: `npm install`
   - Start Command: `node index.js`
4. Add environment variables: `MONGO_URI`, `WEATHER_API_KEY`

### Frontend → Vercel

1. Push `client/` to a Git repo
2. Import on [Vercel](https://vercel.com)
3. Set:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variable:
   - `VITE_API_URL` = your Render backend URL (e.g. `https://your-app.onrender.com/api`)

---

## Folder Structure

```
├── server/
│   ├── index.js              # Express entry point
│   ├── models/
│   │   ├── User.js           # Family profile schema
│   │   └── SymptomReport.js  # Symptom report schema
│   ├── engines/
│   │   ├── riskEngine.js     # Weather → disaster risk
│   │   ├── preparednessEngine.js  # Family → checklist
│   │   └── clusterEngine.js  # Reports → outbreak detection
│   ├── routes/
│   │   ├── risk.js
│   │   ├── preparedness.js
│   │   ├── report.js
│   │   └── cluster.js
│   ├── .env.example
│   └── package.json
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── api/index.js
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── RiskCard.jsx
│   │   │   └── ChecklistCard.jsx
│   │   └── pages/
│   │       ├── Home.jsx
│   │       ├── Report.jsx
│   │       ├── Dashboard.jsx
│   │       └── MapView.jsx
│   └── package.json
└── README.md
```
