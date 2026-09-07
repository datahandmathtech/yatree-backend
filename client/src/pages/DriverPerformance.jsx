import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { User, Calendar, Plus, Trash2, AlertCircle, CheckCircle2, ShieldAlert, Edit2, Image as ImageIcon, X } from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import ImageUploader from '../components/common/ImageUploader';

const DriverPerformance = ({ driverType = 'Taxi' }) => {
    const { selectedCompany } = useCompany();
    
    // Compute current FY
    const currentDate = new Date();
    const currentMonthNum = currentDate.getMonth() + 1;
    const currentYearNum = currentDate.getFullYear();
    const currentFYStart = currentMonthNum >= 4 ? currentYearNum : currentYearNum - 1;

    const [drivers, setDrivers] = useState([]);
    const [selectedFY, setSelectedFY] = useState(currentFYStart);
    const [selectedMonth, setSelectedMonth] = useState(currentMonthNum);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [filterDriverId, setFilterDriverId] = useState('');
    
    // Form state
    const [selectedDriver, setSelectedDriver] = useState('');
    const [date, setDate] = useState(currentDate.toISOString().split('T')[0]);
    const [incidentType, setIncidentType] = useState('Late for Duty');
    const [remarks, setRemarks] = useState('');
    const [photos, setPhotos] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState('');

    const getImageUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) {
            return path.replace(/^http:\/\//i, 'https://');
        }
        const baseUrl = import.meta.env.VITE_API_URL || '';
        return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
    };
    

    
    const INCIDENT_TYPES = [
        'Late for Duty',
        'Missed Duty',
        'No Uniform',
        'Misbehavior',
        'Vehicle Damage',
        'Other'
    ];

    const fyMonths = [
        { value: 4, label: 'April' }, { value: 5, label: 'May' },
        { value: 6, label: 'June' }, { value: 7, label: 'July' },
        { value: 8, label: 'August' }, { value: 9, label: 'September' },
        { value: 10, label: 'October' }, { value: 11, label: 'November' },
        { value: 12, label: 'December' }, { value: 1, label: 'January' },
        { value: 2, label: 'February' }, { value: 3, label: 'March' }
    ];

    // Compute actual year based on FY and Month
    const getActualYear = (fy, month) => {
        return month >= 4 ? fy : fy + 1;
    };

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchDrivers();
            fetchRecords();
        }
    }, [selectedCompany, selectedFY, selectedMonth]);

    const fetchDrivers = async () => {
        if (!selectedCompany?._id) return;
        try {
            const { data } = await axios.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false&isFreelancer=false&status=active&driverType=${driverType}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setDrivers(data.drivers || data);
        } catch (error) {
            console.error('Error fetching drivers', error);
        }
    };

    const fetchRecords = async () => {
        if (!selectedCompany?._id) return;
        
        const actualYear = getActualYear(selectedFY, selectedMonth);
        
        try {
            setLoading(true);
            const { data } = await axios.get(
                `/api/driver-performance/company/${selectedCompany._id}?month=${selectedMonth}&year=${actualYear}&driverType=${driverType}`,
                { headers: { Authorization: `Bearer ${userInfo.token}` } }
            );
            setRecords(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching records', error);
            setLoading(false);
        }
    };

    const handleSaveRecord = async (e) => {
        e.preventDefault();
        if (!selectedDriver) {
            alert('Please select a driver first!');
            return;
        }

        try {
            if (editingId) {
                await axios.put(`/api/driver-performance/${editingId}`, {
                    driverId: selectedDriver,
                    date,
                    incidentType,
                    remarks,
                    photos
                });
            } else {
                await axios.post(`/api/driver-performance`, {
                    driverId: selectedDriver,
                    date,
                    incidentType,
                    remarks,
                    photos
                });
            }
            
            closeModal();
            fetchRecords();
        } catch (error) {
            console.error('Error saving record', error);
            alert('Failed to save record');
        }
    };

    const handleEditClick = (record) => {
        setEditingId(record._id);
        setSelectedDriver(record.driverId._id);
        setDate(new Date(record.date).toISOString().split('T')[0]);
        setIncidentType(record.incidentType);
        setRemarks(record.remarks);
        setPhotos(record.photos || []);
        setShowModal(true);
    };

    const openAddModal = () => {
        setEditingId(null);
        setSelectedDriver('');
        setDate(currentDate.toISOString().split('T')[0]);
        setIncidentType('Late for Duty');
        setRemarks('');
        setPhotos([]);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setSelectedDriver('');
        setRemarks('');
        setPhotos([]);
        setIncidentType('Late for Duty');
    };

    const handleSinglePhotoUpload = async (file, indexToReplace = null) => {
        if (!file) return;

        setIsUploading(true);
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            
            const uploadData = new FormData();
            uploadData.append('file', file);
            
            const res = await axios.post('/api/admin/upload', uploadData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${userInfo?.token}`
                }
            });

            const uploadedUrl = res.data.url;
            
            if (indexToReplace !== null) {
                setPhotos(prev => {
                    const newArr = [...prev];
                    newArr[indexToReplace] = uploadedUrl;
                    return newArr;
                });
            } else {
                setPhotos(prev => [...prev, uploadedUrl]);
            }
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Image upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const removePhoto = (index) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this record?')) {
            try {
                await axios.delete(`/api/driver-performance/${id}`);
                fetchRecords();
            } catch (error) {
                console.error('Error deleting record', error);
            }
        }
    };

    const filteredRecords = filterDriverId ? records.filter(r => r.driverId?._id === filterDriverId || r.driverId === filterDriverId) : records;

    return (
        <div style={{ padding: '0 10px', color: 'white', animation: 'fadeIn 0.5s ease-in-out' }}>
            {/* Header with Title and Right-Aligned Filters + Button */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '30px',
                flexWrap: 'wrap',
                gap: '20px'
            }}>
                <div>
                    <h2 style={{ fontSize: '26px', fontWeight: '900', letterSpacing: '-0.5px', margin: 0 }}>Fleet <span className="text-gradient-yellow">Performance</span></h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: '5px 0 0 0', fontSize: '14px' }}>Monitor incidents and duty violations across your fleet.</p>
                </div>
                
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', position: 'absolute', top: '40px', right: '20px', zIndex: 10 }}>
                    {/* FY Calendar Filters on Top Right */}
                    <div style={{ 
                        background: 'rgba(15, 23, 42, 0.6)', 
                        padding: '6px', 
                        borderRadius: '14px', 
                        display: 'flex', 
                        gap: '6px', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '0 10px' }}>
                            <Calendar size={16} color="rgba(255,255,255,0.5)" style={{ marginRight: '8px' }} />
                            <select 
                                value={selectedFY}
                                onChange={(e) => setSelectedFY(Number(e.target.value))}
                                style={{
                                    padding: '10px 5px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    outline: 'none',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                {Array.from({ length: new Date().getFullYear() - 2023 + 5 }, (_, i) => 2023 + i).map(y => (
                                    <option key={y} value={y} style={{ background: '#0f172a' }}>FY {y}-{y.toString().slice(2) * 1 + 1}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
                            <select 
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                style={{
                                    padding: '10px 15px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    outline: 'none',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                {fyMonths.map(m => (
                                    <option key={m.value} value={m.value} style={{ background: '#0f172a' }}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', padding: '0 10px' }}>
                            <User size={16} color="rgba(255,255,255,0.5)" style={{ marginRight: '8px' }} />
                            <select 
                                value={filterDriverId}
                                onChange={(e) => setFilterDriverId(e.target.value)}
                                style={{
                                    padding: '10px 5px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    outline: 'none',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    maxWidth: '150px'
                                }}
                            >
                                <option value="" style={{ background: '#0f172a' }}>All Drivers</option>
                                {drivers.map(d => (
                                    <option key={d._id} value={d._id} style={{ background: '#0f172a' }}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button 
                        onClick={openAddModal}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                            color: '#000',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '12px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
                            transition: 'transform 0.2s',
                            height: '46px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <Plus size={20} strokeWidth={3} /> Add Incident
                    </button>
                </div>
            </div>

            {/* Content area */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--primary)' }}>
                    <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(251, 191, 36, 0.3)', borderTopColor: '#fbbf24', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px auto' }}></div>
                    <p style={{ fontWeight: '600' }}>Loading fleet incidents...</p>
                </div>
            ) : filteredRecords.length > 0 ? (
                <div style={{
                    background: 'rgba(15, 23, 42, 0.4)',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    overflow: 'hidden',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                <th style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Driver</th>
                                <th style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Date</th>
                                <th style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Incident Type</th>
                                <th style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Remarks</th>
                                <th style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Recorded By</th>
                                <th style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map(record => (
                                <tr key={record._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '10px', 
                                                background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                                                overflow: 'hidden'
                                            }}>
                                                {record.driverId?.profilePhoto ? (
                                                    <img src={record.driverId.profilePhoto} alt="Driver" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <User size={20} color="rgba(255,255,255,0.4)" />
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: 'white' }}>{record.driverId?.name || 'Unknown Driver'}</div>
                                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{record.driverId?.mobile || 'No Contact'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px', color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>
                                        {new Date(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td style={{ padding: '20px' }}>
                                        <span style={{ 
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '8px 14px', 
                                            borderRadius: '30px', 
                                            fontSize: '12px', 
                                            fontWeight: '800',
                                            background: record.incidentType === 'Missed Duty' ? 'rgba(239, 68, 68, 0.15)' : 
                                                       record.incidentType === 'Late for Duty' ? 'rgba(245, 158, 11, 0.15)' :
                                                       'rgba(59, 130, 246, 0.15)',
                                            color: record.incidentType === 'Missed Duty' ? '#f87171' : 
                                                   record.incidentType === 'Late for Duty' ? '#fbbf24' :
                                                   '#60a5fa',
                                            border: `1px solid ${record.incidentType === 'Missed Duty' ? 'rgba(239, 68, 68, 0.3)' : record.incidentType === 'Late for Duty' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                                        }}>
                                            {record.incidentType}
                                        </span>
                                    </td>
                                    <td style={{ padding: '20px', color: 'rgba(255,255,255,0.7)', maxWidth: '300px', lineHeight: '1.5' }}>
                                        <div>{record.remarks}</div>
                                        {record.photos && record.photos.length > 0 && (
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                                                {record.photos.map((photo, i) => (
                                                    <img 
                                                        key={i}
                                                        src={getImageUrl(photo)} 
                                                        alt="Incident" 
                                                        onClick={() => { setSelectedImage(photo); setShowImageModal(true); }}
                                                        style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '20px' }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                                            <ShieldAlert size={14} />
                                            {record.recordedBy?.name || 'Admin'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                            <button 
                                                onClick={() => handleEditClick(record)}
                                                style={{ 
                                                    background: 'rgba(59, 130, 246, 0.1)', 
                                                    border: '1px solid rgba(59, 130, 246, 0.2)', 
                                                    color: '#60a5fa', 
                                                    cursor: 'pointer', 
                                                    padding: '8px',
                                                    borderRadius: '8px',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                                                title="Edit"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(record._id)}
                                                style={{ 
                                                    background: 'rgba(239, 68, 68, 0.1)', 
                                                    border: '1px solid rgba(239, 68, 68, 0.2)', 
                                                    color: '#f87171', 
                                                    cursor: 'pointer', 
                                                    padding: '8px',
                                                    borderRadius: '8px',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '80px 20px', 
                    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(15, 23, 42, 0.2) 100%)', 
                    borderRadius: '24px', 
                    border: '1px dashed rgba(255,255,255,0.1)' 
                }}>
                    <div style={{
                        width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px auto'
                    }}>
                        <CheckCircle2 size={40} color="#34d399" />
                    </div>
                    <h3 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '10px', color: 'white' }}>Excellent Performance</h3>
                    <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '400px', margin: '0 auto' }}>No incidents have been recorded for your fleet this month. Keep up the good work!</p>
                </div>
            )}

            {/* Premium Glass Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(2, 6, 23, 0.8)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <div style={{
                        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                        padding: '40px',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '550px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset',
                        animation: 'slideUp 0.4s ease-out'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                            <h3 style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>
                                {editingId ? 'Edit ' : 'Record '}<span className="text-gradient-yellow">Incident</span>
                            </h3>
                            <button onClick={closeModal} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '24px' }}>&times;</button>
                        </div>
                        
                        <form onSubmit={handleSaveRecord}>
                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ display: 'block', marginBottom: '10px', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>Select Driver</label>
                                <select 
                                    required
                                    value={selectedDriver}
                                    onChange={(e) => setSelectedDriver(e.target.value)}
                                    style={{
                                        width: '100%', padding: '14px 16px', background: 'rgba(0,0,0,0.4)',
                                        border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: 'white',
                                        fontSize: '15px', transition: 'border 0.3s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                                >
                                    <option value="" style={{ background: '#0f172a' }}>-- Select the Driver involved --</option>
                                    {drivers.map(d => (
                                        <option key={d._id} value={d._id} style={{ background: '#0f172a' }}>{d.name} ({d.mobile || 'No Mobile'})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '10px', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>Date</label>
                                    <input 
                                        type="date" 
                                        required
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        style={{
                                            width: '100%', padding: '14px 16px', background: 'rgba(0,0,0,0.4)',
                                            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: 'white',
                                            fontSize: '15px'
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '10px', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>Incident Type</label>
                                    <select 
                                        value={incidentType}
                                        onChange={(e) => setIncidentType(e.target.value)}
                                        style={{
                                            width: '100%', padding: '14px 16px', background: 'rgba(0,0,0,0.4)',
                                            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: 'white',
                                            fontSize: '15px'
                                        }}
                                    >
                                        {INCIDENT_TYPES.map(t => <option key={t} value={t} style={{ background: '#0f172a' }}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div style={{ marginBottom: '35px' }}>
                                <label style={{ display: 'block', marginBottom: '10px', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>Remarks / Details</label>
                                <textarea 
                                    required
                                    rows={4}
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="Enter specific details about the incident..."
                                    style={{
                                        width: '100%', padding: '16px', background: 'rgba(0,0,0,0.4)',
                                        border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: 'white',
                                        resize: 'none', fontSize: '15px', fontFamily: 'inherit'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '30px' }}>
                                <label style={{ display: 'block', marginBottom: '10px', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>Incident Photos (Optional)</label>
                                {isUploading && <div style={{ color: 'var(--primary)', marginBottom: '10px', fontSize: '13px', fontWeight: '800' }}>Uploading Photo...</div>}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                                    {photos.map((photo, i) => (
                                        <ImageUploader 
                                            key={i} 
                                            file={photo} 
                                            onChange={(newFile) => {
                                                if (!newFile) {
                                                    removePhoto(i);
                                                } else {
                                                    handleSinglePhotoUpload(newFile, i);
                                                }
                                            }} 
                                            label={`Photo ${i + 1}`} 
                                            color="#f43f5e" 
                                        />
                                    ))}
                                    {photos.length < 3 && (
                                        <ImageUploader 
                                            file={null} 
                                            onChange={(f) => handleSinglePhotoUpload(f)} 
                                            label={`Add Photo`} 
                                            color="#f43f5e" 
                                        />
                                    )}
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                                <button 
                                    type="button" 
                                    onClick={closeModal}
                                    style={{
                                        padding: '14px 24px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer',
                                        fontWeight: '600', transition: 'background 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    style={{
                                        padding: '14px 30px', borderRadius: '12px', border: 'none',
                                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                                        color: '#000', fontWeight: '800', cursor: 'pointer',
                                        boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)', transition: 'transform 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    {editingId ? 'Update Record' : 'Save Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Fullscreen Image View Modal */}
            {showImageModal && selectedImage && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(5px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setShowImageModal(false)}>
                    <button style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                    <img src={getImageUrl(selectedImage)} style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '12px', objectFit: 'contain' }} alt="Full Incident View" />
                </div>
            )}
            
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .text-gradient-yellow {
                    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
            `}</style>
        </div>
    );
};

export default DriverPerformance;

