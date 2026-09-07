import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import { RefreshCw, Navigation } from 'lucide-react';

// Fix for default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Car Icon (Animated based on status)
const createCarIcon = (status) => {
    const isMoving = status === 'Moving';
    const color = isMoving ? '#10b981' : '#ef4444'; // Green if moving, Red if stopped
    
    return L.divIcon({
        className: 'custom-car-icon',
        html: `
            <div style="
                background-color: ${color}; 
                width: 24px; 
                height: 24px; 
                border-radius: 50%; 
                border: 3px solid white;
                box-shadow: 0 0 10px ${color};
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            ">
                ${isMoving ? `<div style="
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    border: 2px solid ${color};
                    animation: pulse 1.5s infinite;
                "></div>` : ''}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M5 18H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.19M15 6h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3.19"/>
                    <path d="M23 13v-2c0-2.6-2.4-4.5-5-5H6c-2.6.5-5 2.4-5 5v2"/>
                    <circle cx="7.5" cy="18.5" r="2.5"/>
                    <circle cx="16.5" cy="18.5" r="2.5"/>
                </svg>
            </div>
            <style>
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(2); opacity: 0; }
                }
            </style>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    });
};

const MapBounds = ({ vehicles }) => {
    const map = useMap();
    useEffect(() => {
        if (vehicles && vehicles.length > 0) {
            const bounds = L.latLngBounds(vehicles.map(v => [v.lat, v.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [vehicles, map]);
    return null;
};

const GPSMap = () => {
    const { selectedCompany } = useCompany();
    const { theme } = useTheme();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLiveLocations = async (isRefresh = false) => {
        if (!selectedCompany) return;
        if (isRefresh) setRefreshing(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/live-map/${selectedCompany._id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            if (data.success) {
                setVehicles(data.liveVehicles);
            }
        } catch (err) {
            console.error('Error fetching live map data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLiveLocations();
        // Auto refresh every 30 seconds
        const interval = setInterval(() => {
            fetchLiveLocations(false);
        }, 30000);
        return () => clearInterval(interval);
    }, [selectedCompany]);

    const defaultCenter = [24.5854, 73.7125]; // Udaipur default

    return (
        <div style={{ 
            height: '100%', 
            minHeight: '100vh',
            display: 'flex', 
            flexDirection: 'column', 
            background: 'radial-gradient(circle at top right, #1e293b, #0f172a)' 
        }}>
            
            {/* Header */}
            <div style={{ 
                padding: '20px 30px', 
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(10px)',
                zIndex: 10
            }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Navigation size={24} color="#0ea5e9" />
                        Live GPS Tracking
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '4px 0 0 0' }}>
                        Real-time map view of all active vehicles (Ready for WheelsEye API)
                    </p>
                </div>
                
                <button 
                    onClick={() => fetchLiveLocations(true)}
                    disabled={refreshing || loading}
                    style={{
                        background: 'rgba(14, 165, 233, 0.1)',
                        color: '#0ea5e9',
                        border: '1px solid rgba(14, 165, 233, 0.2)',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
                    {refreshing ? 'Syncing...' : 'Refresh Map'}
                    <style>{`.spinning { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                </button>
            </div>

            {/* Map Container */}
            <div style={{ flex: 1, position: 'relative' }}>
                {loading ? (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        Loading Map Data...
                    </div>
                ) : (
                    <MapContainer 
                        center={vehicles.length > 0 ? [vehicles[0].lat, vehicles[0].lng] : defaultCenter} 
                        zoom={12} 
                        style={{ height: '100%', width: '100%', zIndex: 1 }}
                    >
                        {/* Dark Theme TileLayer */}
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        />
                        
                        {vehicles.map((v) => (
                            <Marker 
                                key={v.id} 
                                position={[v.lat, v.lng]}
                                icon={createCarIcon(v.status)}
                            >
                                <Popup className="custom-popup">
                                    <div style={{ padding: '5px', minWidth: '150px' }}>
                                        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                                            {v.carNumber}
                                        </h3>
                                        <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#64748b' }}>
                                            <strong>Model:</strong> {v.model}
                                        </p>
                                        <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#64748b' }}>
                                            <strong>Status:</strong> 
                                            <span style={{ 
                                                color: v.status === 'Moving' ? '#10b981' : '#ef4444',
                                                fontWeight: '700',
                                                marginLeft: '5px'
                                            }}>
                                                {v.status}
                                            </span>
                                        </p>
                                        <p style={{ margin: '0', fontSize: '13px', color: '#64748b' }}>
                                            <strong>Speed:</strong> {v.status === 'Moving' ? `${v.speed} km/h` : '0 km/h'}
                                        </p>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                        
                        <MapBounds vehicles={vehicles} />
                    </MapContainer>
                )}
            </div>
            
            <style>{`
                .leaflet-popup-content-wrapper {
                    border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                }
                .leaflet-popup-tip {
                    background: white;
                }
                .leaflet-container {
                    background: #0f172a;
                    font-family: 'Outfit', sans-serif;
                }
                /* Hide Leaflet Branding for cleaner look */
                .leaflet-control-attribution {
                    display: none !important;
                }
            `}</style>
        </div>
    );
};

export default GPSMap;
