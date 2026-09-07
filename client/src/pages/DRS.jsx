import React, { useState, useEffect } from 'react';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import { 
    Calendar, Plus, Save, Trash2, X, Users, Car, Clock, 
    MapPin, IndianRupee, Search, Briefcase, Filter, 
    CheckCircle2, AlertCircle, RefreshCw, ArrowRight
} from 'lucide-react';
import Select from 'react-select';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function DRS() {
    const { selectedCompany } = useCompany();
    const { theme } = useTheme();
    const [duties, setDuties] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [leads, setLeads] = useState([]);
    const [clients, setClients] = useState([]);

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [activeView, setActiveView] = useState('today'); // 'today' | 'tomorrow' | 'upcoming' | 'all' | 'custom'
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedSource, setSelectedSource] = useState(null);
    
    const [formData, setFormData] = useState({
        clientName: '',
        mobileNumber: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00 AM',
        carType: '',
        itinerary: '',
        pickupPoint: '',
        revenue: 0,
        driver: null,
        vehicle: null,
        bookingId: null,
        bookingRef: null,
        leadId: null
    });

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchDuties();
            fetchDropdownData();
        }
    }, [selectedCompany, selectedDate, activeView]);

    const fetchDuties = async () => {
        setLoading(true);
        try {
            let url = `/api/drs/${selectedCompany._id}?`;
            if (activeView === 'upcoming') {
                url += 'view=upcoming';
            } else if (activeView === 'all') {
                url += 'view=all';
            } else {
                url += `date=${selectedDate}`;
            }
            const { data } = await axios.get(url);
            setDuties(data);
        } catch (error) {
            console.error('Error fetching DRS duties:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdownData = async () => {
        try {
            const [driverRes, vehicleRes, bkgRes, leadRes, clientRes] = await Promise.all([
                axios.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false&status=active`).catch(() => ({ data: [] })),
                axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false`).catch(() => ({ data: [] })),
                axios.get(`/api/bookings/${selectedCompany._id}`).catch(() => ({ data: [] })),
                axios.get(`/api/leads/${selectedCompany._id}`).catch(() => ({ data: [] })),
                axios.get(`/api/clients/company/${selectedCompany._id}`).catch(() => ({ data: [] }))
            ]);
            setDrivers(driverRes.data.drivers || driverRes.data || []);
            setVehicles(vehicleRes.data.vehicles || vehicleRes.data || []);
            setBookings(Array.isArray(bkgRes.data) ? bkgRes.data : []);
            setLeads(Array.isArray(leadRes.data) ? leadRes.data : []);
            setClients(Array.isArray(clientRes.data) ? clientRes.data : []);
        } catch (error) {
            console.error('Error fetching dropdown data:', error);
        }
    };

    const driverOptions = drivers.map(d => ({ value: d._id, label: `${d.name} (${d.mobile})` }));
    const vehicleOptions = vehicles.map(v => ({ value: v._id, label: `${v.carNumber} - ${v.model}` }));

    const systemSourceOptions = [
        {
            label: '📦 Confirmed Bookings',
            options: bookings.map(b => ({
                value: `bkg_${b._id}`,
                type: 'booking',
                data: b,
                label: `📦 ${b.bookingId} - ${b.clientName} (${b.vehicleType || 'Vehicle'}) - ₹${b.totalAmount || 0}`
            }))
        },
        {
            label: '🎯 Sales Leads',
            options: leads.map(l => ({
                value: `lead_${l._id}`,
                type: 'lead',
                data: l,
                label: `🎯 ${l.leadId || 'LK-LEAD'} - ${l.clientName} (${l.carType || 'Car'}) - ₹${l.totalAmount || 0}`
            }))
        },
        {
            label: '👤 Existing Clients (Ledgers)',
            options: clients.map(c => ({
                value: `client_${c._id}`,
                type: 'client',
                data: c,
                label: `👤 ${c.name} (${c.mobile}) - Due: ₹${c.balance || 0}`
            }))
        }
    ].filter(group => group.options.length > 0);

    const handleSourceSelect = (opt) => {
        setSelectedSource(opt);
        if (!opt) {
            setFormData({
                clientName: '',
                mobileNumber: '',
                date: selectedDate,
                time: '09:00 AM',
                carType: '',
                itinerary: '',
                pickupPoint: '',
                revenue: 0,
                driver: null,
                vehicle: null,
                bookingId: null,
                bookingRef: null,
                leadId: null
            });
            return;
        }

        if (opt.type === 'booking') {
            const b = opt.data;
            const bDate = b.travelStartDate ? new Date(b.travelStartDate).toISOString().split('T')[0] : selectedDate;
            const itin = b.itinerary?.length > 0 
                ? (b.itinerary[0].duty || b.itinerary[0].description || b.notes || 'Tour Package')
                : (b.notes || `${b.vehicleType || 'Car'} Rental Duty`);
            const pickup = b.itinerary?.[0]?.pickupPoint || '';
            const time = b.itinerary?.[0]?.time || '09:00 AM';

            setFormData(prev => ({
                ...prev,
                clientName: b.clientName || '',
                mobileNumber: b.mobileNumber || '',
                carType: b.vehicleType || '',
                itinerary: itin,
                revenue: b.balanceDue > 0 ? b.balanceDue : (b.totalAmount || 0),
                date: bDate,
                time: time,
                pickupPoint: pickup,
                bookingId: b.bookingId,
                bookingRef: b._id,
                leadId: b.lead?._id || b.lead || null
            }));
        } else if (opt.type === 'lead') {
            const l = opt.data;
            const lDate = l.travelStartDate ? new Date(l.travelStartDate).toISOString().split('T')[0] : selectedDate;
            const itin = l.itinerary?.length > 0 
                ? (l.itinerary[0].duty || l.itinerary[0].description || '')
                : (l.pickupPoint ? `${l.pickupPoint} -> ${l.dropPoint || 'Destination'}` : 'Scheduled Itinerary');
            const pickup = l.pickupPoint || l.itinerary?.[0]?.pickupPoint || '';
            const time = l.itinerary?.[0]?.time || '09:00 AM';

            setFormData(prev => ({
                ...prev,
                clientName: l.clientName || '',
                mobileNumber: l.mobileNumber || '',
                carType: l.carType || '',
                itinerary: itin,
                revenue: l.totalAmount || 0,
                date: lDate,
                time: time,
                pickupPoint: pickup,
                leadId: l._id,
                bookingId: l.bookingId || null,
                bookingRef: l.bookingRef || null
            }));
        } else if (opt.type === 'client') {
            const c = opt.data;
            setFormData(prev => ({
                ...prev,
                clientName: c.name || '',
                mobileNumber: c.mobile || ''
            }));
        }
    };

    const handleAssign = async (dutyId, field, value) => {
        try {
            const updated = await axios.put(`/api/drs/${dutyId}`, {
                [field]: value,
                status: 'Assigned'
            });
            setDuties(duties.map(d => d._id === dutyId ? updated.data : d));
        } catch (error) {
            console.error('Error assigning:', error);
            alert('Failed to update assignment');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this duty from DRS?')) {
            try {
                await axios.delete(`/api/drs/${id}`);
                fetchDuties();
            } catch (error) {
                console.error('Error deleting:', error);
            }
        }
    };

    const handleSubmitDirect = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/drs', {
                ...formData,
                company: selectedCompany._id,
                driver: formData.driver?.value || null,
                vehicle: formData.vehicle?.value || null,
                status: formData.driver && formData.vehicle ? 'Assigned' : 'Pending',
                isDirectBooking: !formData.bookingId && !formData.leadId
            });
            setShowModal(false);
            setSelectedSource(null);
            fetchDuties();
        } catch (error) {
            console.error('Error adding duty:', error);
            alert('Failed to save duty');
        }
    };

    const customSelectStyles = {
        control: (base, state) => ({
            ...base,
            background: 'rgba(0,0,0,0.25)',
            borderColor: state.isFocused ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
            color: 'white',
            minWidth: '200px',
            minHeight: '40px',
            borderRadius: '8px',
            boxShadow: 'none',
            '&:hover': {
                borderColor: 'var(--primary)'
            }
        }),
        singleValue: (base) => ({ ...base, color: 'white' }),
        input: (base) => ({ ...base, color: 'white' }),
        menu: (base) => ({ 
            ...base, 
            background: '#0f172a', 
            zIndex: 99999,
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
        }),
        groupHeading: (base) => ({
            ...base,
            color: 'var(--primary)',
            fontWeight: '800',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
        }),
        option: (base, state) => ({
            ...base,
            background: state.isFocused ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: state.isSelected ? 'var(--primary)' : 'white',
            cursor: 'pointer',
            fontSize: '13px',
            '&:hover': {
                background: 'rgba(255,255,255,0.12)'
            }
        }),
        placeholder: (base) => ({ ...base, color: 'rgba(255,255,255,0.4)', fontSize: '13px' })
    };

    const inputStyle = {
        position: 'relative',
        width: '100%', 
        padding: '12px', 
        borderRadius: '10px', 
        border: '1px solid rgba(255,255,255,0.1)', 
        background: 'rgba(0,0,0,0.2)', 
        color: 'white', 
        outline: 'none',
        transition: 'all 0.3s ease'
    };

    const filteredDuties = duties.filter(d => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
            d.clientName?.toLowerCase().includes(q) ||
            d.mobileNumber?.includes(q) ||
            d.bookingId?.toLowerCase().includes(q) ||
            d.carType?.toLowerCase().includes(q) ||
            d.itinerary?.toLowerCase().includes(q) ||
            d.driver?.name?.toLowerCase().includes(q) ||
            d.vehicle?.carNumber?.toLowerCase().includes(q)
        );
    });

    const totalRevenue = filteredDuties.reduce((sum, d) => sum + (Number(d.revenue) || 0), 0);
    const assignedCount = filteredDuties.filter(d => d.driver && d.vehicle).length;
    const pendingCount = filteredDuties.length - assignedCount;

    const getFilterBtnStyle = (isActive) => ({
        padding: '8px 16px',
        borderRadius: '10px',
        border: isActive ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
        background: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
        color: isActive ? '#000' : 'rgba(255,255,255,0.7)',
        fontWeight: isActive ? '800' : '600',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.2s'
    });

    return (
        <div className="container-fluid" style={{ minHeight: '100vh', padding: '40px 20px', position: 'relative' }}>
            <SEO title="DRS Schedule - LogKaro" />

            <header style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                        width: '45px',
                        height: '45px',
                        background: 'rgba(251, 191, 36, 0.1)',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'var(--primary)'
                    }}>
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'white', letterSpacing: '-0.5px', margin: 0 }}>
                            Daily Rental <span className="text-gradient-yellow">Sheet (DRS)</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px', margin: 0 }}>
                            Auto-syncs with Confirmed Bookings, Sales Leads & Fleet Assignments.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            setSelectedSource(null);
                            setFormData({
                                clientName: '',
                                mobileNumber: '',
                                date: selectedDate,
                                time: '09:00 AM',
                                carType: '',
                                itinerary: '',
                                pickupPoint: '',
                                revenue: 0,
                                driver: null,
                                vehicle: null,
                                bookingId: null,
                                bookingRef: null,
                                leadId: null
                            });
                            setShowModal(true);
                        }}
                        style={{
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            color: '#000',
                            border: 'none',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontWeight: '800',
                            boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)'
                        }}
                    >
                        <Plus size={20} /> Add / Link Duty
                    </motion.button>
                </div>
            </header>

            {/* Quick Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase' }}>Total Duties</div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>{filteredDuties.length}</div>
                </div>
                <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
                    <div style={{ fontSize: '12px', color: '#86efac', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase' }}>Assigned Fleet</div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#4ade80' }}>{assignedCount}</div>
                </div>
                <div style={{ background: 'rgba(234, 179, 8, 0.05)', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(234, 179, 8, 0.15)' }}>
                    <div style={{ fontSize: '12px', color: '#fde047', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase' }}>Pending Assignment</div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#facc15' }}>{pendingCount}</div>
                </div>
                <div style={{ background: 'rgba(251, 191, 36, 0.05)', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(251, 191, 36, 0.15)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--primary)', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase' }}>Total Revenue</div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>₹{totalRevenue.toLocaleString('en-IN')}</div>
                </div>
            </div>

            {/* Controls Bar: View Filters & Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button onClick={() => { const todayStr = new Date().toISOString().split('T')[0]; setSelectedDate(todayStr); setActiveView('today'); }} style={getFilterBtnStyle(activeView === 'today')}>Today</button>
                    <button onClick={() => { const tmr = new Date(); tmr.setDate(tmr.getDate() + 1); const tmrStr = tmr.toISOString().split('T')[0]; setSelectedDate(tmrStr); setActiveView('tomorrow'); }} style={getFilterBtnStyle(activeView === 'tomorrow')}>Tomorrow</button>
                    <button onClick={() => setActiveView('upcoming')} style={getFilterBtnStyle(activeView === 'upcoming')}>Upcoming Duties</button>
                    <button onClick={() => setActiveView('all')} style={getFilterBtnStyle(activeView === 'all')}>All Duties</button>
                    
                    <div 
                        style={{ display: 'flex', alignItems: 'center', background: activeView === 'custom' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(0,0,0,0.3)', padding: '6px 14px', borderRadius: '10px', border: activeView === 'custom' ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                        onClick={(e) => { const input = e.currentTarget.querySelector('input'); if (input && input.showPicker) input.showPicker(); }}
                    >
                        <Calendar size={16} color="var(--primary)" style={{ marginRight: '8px' }} />
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => { setSelectedDate(e.target.value); setActiveView('custom'); }}
                            onClick={(e) => e.target.showPicker && e.target.showPicker()}
                            style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Search size={16} color="rgba(255,255,255,0.4)" />
                    <input type="text" placeholder="Search duty, guest, vehicle, booking..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'white', padding: '10px', outline: 'none', fontSize: '13px', width: '240px' }} />
                    {searchTerm && <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={14} /></button>}
                </div>
            </div>

            {/* Duties Table */}
            <div className="glass-card" style={{ padding: '0', overflowX: 'auto', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <table style={{ width: '100%', color: 'white', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.3)' }}>
                        <tr>
                            <th style={{ padding: '16px 20px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', width: '130px', fontSize: '13px' }}>Schedule</th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Client & Source</th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Itinerary & Vehicle Req.</th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', width: '260px', fontSize: '13px' }}>Fleet Assignment</th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Revenue</th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: '13px' }}>Status</th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textAlign: 'right', fontSize: '13px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="7" style={{ textAlign: 'center', padding: '50px' }}><div className="loader"></div></td></tr> : filteredDuties.length === 0 ? <tr><td colSpan="7" style={{ textAlign: 'center', padding: '60px 20px' }}><div style={{ color: 'rgba(255,255,255,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}><Calendar size={48} /><p style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>No duties scheduled for this view</p></div></td></tr> : filteredDuties.map(duty => (
                            <tr key={duty._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: 'var(--primary)', fontSize: '14px' }}><Clock size={15} /> {duty.time || '09:00 AM'}</div>
                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{duty.date ? new Date(duty.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</div>
                                </td>
                                <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                                    <div style={{ fontWeight: '800', fontSize: '15px' }}>{duty.clientName}</div>
                                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>📱 {duty.mobileNumber}</div>
                                    <div style={{ marginTop: '8px' }}>
                                        {duty.bookingId ? (
                                            <Link to="/admin/bookings" style={{ textDecoration: 'none' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}><Briefcase size={11} /> {duty.bookingId} <ArrowRight size={10} /></span></Link>
                                        ) : duty.leadId ? (
                                            <Link to="/admin/leads" style={{ textDecoration: 'none' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', background: 'rgba(234, 179, 8, 0.15)', color: '#fde047', border: '1px solid rgba(234, 179, 8, 0.3)' }}>🎯 {duty.leadId?.leadId || 'Lead'} <ArrowRight size={10} /></span></Link>
                                        ) : <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255,255,255,0.5)' }}>Direct Walk-In</span>}
                                    </div>
                                </td>
                                <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                                    {duty.pickupPoint && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#4ade80', marginBottom: '4px' }}><MapPin size={13} /> <span>Pickup: {duty.pickupPoint}</span></div>}
                                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.4' }}>{duty.itinerary || duty.duty || 'Standard Duty'}</div>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', marginTop: '8px', color: 'rgba(255,255,255,0.8)' }}><Car size={13} color="var(--primary)"/> Req: <span style={{ fontWeight: 'bold' }}>{duty.carType}</span></div>
                                </td>
                                <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <Select options={driverOptions} value={duty.driver ? { value: duty.driver._id, label: duty.driver.name } : null} onChange={(opt) => handleAssign(duty._id, 'driver', opt?.value)} placeholder="Assign Driver" styles={customSelectStyles} isClearable menuPortalTarget={document.body} />
                                        <Select options={vehicleOptions} value={duty.vehicle ? { value: duty.vehicle._id, label: duty.vehicle.carNumber } : null} onChange={(opt) => handleAssign(duty._id, 'vehicle', opt?.value)} placeholder="Assign Vehicle" styles={customSelectStyles} isClearable menuPortalTarget={document.body} />
                                    </div>
                                </td>
                                <td style={{ padding: '16px 20px', fontWeight: '900', color: 'white', fontSize: '16px', verticalAlign: 'top' }}>₹{Number(duty.revenue || 0).toLocaleString('en-IN')}</td>
                                <td style={{ padding: '16px 20px', textAlign: 'center', verticalAlign: 'top' }}><span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', background: duty.status === 'Assigned' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)', color: duty.status === 'Assigned' ? '#4ade80' : '#fde047', border: `1px solid ${duty.status === 'Assigned' ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)'}` }}>{duty.status}</span></td>
                                <td style={{ padding: '16px 20px', textAlign: 'right', verticalAlign: 'top' }}><button onClick={() => handleDelete(duty._id)} title="Delete Duty" style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={16} /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <AnimatePresence>
                {showModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999 }}>
                        <motion.div initial={{ y: 50, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="glass-card" style={{ width: '92%', maxWidth: '720px', maxHeight: '92vh', overflowY: 'auto', background: '#0b1120', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '24px', padding: '25px 30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <div><h2 style={{ color: 'white', margin: 0, fontSize: '22px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}><Plus size={24} color="var(--primary)" /> Schedule Duty in DRS</h2></div>
                                <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmitDirect} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                                <div style={{ gridColumn: '1 / -1', background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.25)', borderRadius: '14px', padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}><label style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '13px' }}>⚡ Auto-Fetch Data From System (Bookings / Leads / Clients)</label>{selectedSource && <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: '700', background: 'rgba(34, 197, 94, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>✓ Linked</span>}</div>
                                    <Select placeholder="🔍 Type or select a Booking, Lead or Client..." options={systemSourceOptions} value={selectedSource} onChange={handleSourceSelect} isClearable styles={customSelectStyles} menuPortalTarget={document.body} />
                                </div>
                                <div><label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>Client / Guest Name</label><input required type="text" value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} style={inputStyle} placeholder="e.g. Ramesh Patel" /></div>
                                <div><label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>Mobile Number</label><input required type="text" value={formData.mobileNumber} onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })} style={inputStyle} placeholder="e.g. 9876543210" /></div>
                                <div><label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>Duty Date</label><input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} onClick={e => e.target.showPicker && e.target.showPicker()} style={{...inputStyle, cursor: 'pointer'}} /></div>
                                <div><label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>Reporting Time</label><input required type="text" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} style={inputStyle} placeholder="e.g. 09:00 AM" /></div>
                                <div style={{ gridColumn: '1 / -1' }}><label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>Pickup Point / Reporting Address</label><input type="text" value={formData.pickupPoint || ''} onChange={e => setFormData({ ...formData, pickupPoint: e.target.value })} placeholder="e.g. Udaipur Airport Terminal 1" style={inputStyle} /></div>
                                <div style={{ gridColumn: '1 / -1' }}><label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>Itinerary / Route Details</label><input required type="text" value={formData.itinerary} onChange={e => setFormData({ ...formData, itinerary: e.target.value })} placeholder="e.g. Airport Pick up -> City Tour -> Hotel Drop" style={inputStyle} /></div>
                                <div><label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>Car Type (Requested)</label><input required type="text" value={formData.carType} onChange={e => setFormData({ ...formData, carType: e.target.value })} style={inputStyle} placeholder="e.g. Innova Crysta" /></div>
                                <div><label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>Revenue / Rate (₹)</label><div style={{ position: 'relative' }}><IndianRupee size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} /><input required type="number" min="0" value={formData.revenue} onChange={e => setFormData({ ...formData, revenue: Number(e.target.value) })} style={{ ...inputStyle, paddingLeft: '35px' }} placeholder="Amount" /></div></div>
                                <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.02)', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <h3 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700' }}>Fleet Assignment (Optional)</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div><label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px', fontSize: '13px' }}>Assign Driver</label><Select options={driverOptions} onChange={opt => setFormData({...formData, driver: opt})} styles={customSelectStyles} isClearable menuPortalTarget={document.body} /></div>
                                        <div><label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px', fontSize: '13px' }}>Assign Vehicle</label><Select options={vehicleOptions} onChange={opt => setFormData({...formData, vehicle: opt})} styles={customSelectStyles} isClearable menuPortalTarget={document.body} /></div>
                                    </div>
                                </div>
                                <div style={{ gridColumn: '1 / -1', marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}><button type="button" onClick={() => setShowModal(false)} style={{ padding: '12px 24px', background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button><button type="submit" style={{ padding: '12px 32px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#000', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '900', fontSize: '15px', boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)' }}>Save Duty</button></div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
