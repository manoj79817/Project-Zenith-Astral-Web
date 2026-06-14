#  Project Zenith — The Celestial Eye

A real-time cosmic radar web application that shows you what's directly above any location on Earth. Track the ISS, active satellites, the Moon, planets, and constellations in real time.

##  Architecture

```
/frontend  → Next.js 16 (App Router) + TypeScript + Tailwind CSS + Framer Motion
/backend   → Express + TypeScript + Socket.IO + Mongoose
```


### Prerequisites
- Node.js 18+
- npm 9+
- MongoDB Atlas account (or use mock data)

### Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your credentials
npm install
npm run dev
```

### Access
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/api/health

##  Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 4000) | No |
| `MONGODB_URI` | MongoDB connection string | Yes (or skip for mock) |
| `NASA_API_KEY` | NASA API key from api.nasa.gov | Optional |
| `CORS_ORIGIN` | Frontend URL (default: http://localhost:3000) | No |

### Frontend (`frontend/.env.local`)
| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | Cesium Ion access token | Yes (for 3D globe) |
| `NEXT_PUBLIC_BACKEND_URL` | Backend URL (default: http://localhost:4000) | No |

## 📡 API Endpoints
- `GET /api/health` — Server health check
- `GET /api/zenith?lat=&lon=` — Get celestial objects currently overhead
- `GET /api/satellites` — View satellite cache statistics
- `GET /api/satellites/refresh` — Force refresh satellite TLE data
- `GET /api/satellites/iss` — Live ISS position from OpenNotify

## 🛠️ Tech Stack
- **Frontend**: Next.js 16, TypeScript, Tailwind CSS, Framer Motion, CesiumJS/Resium, Three.js
- **Backend**: Express, TypeScript, Socket.IO, Mongoose
- **Astronomy**: satellite.js, astronomy-engine
- **External APIs**: OpenNotify (ISS), CelesTrak (TLEs), NASA Horizons

---
