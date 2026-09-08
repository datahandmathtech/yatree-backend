import React, { useState, useEffect, useMemo } from 'react';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import { 
    Calendar, Plus, Save, Trash2, X, Users, Car, Clock, 
    MapPin, IndianRupee, Search, Briefcase, Filter, 
    CheckCircle2, AlertCircle, RefreshCw, ArrowRight, Edit3,
    ChevronLeft, ChevronRight, Phone, MessageSquare, ExternalLink,
    Building2, UserCheck, ShieldCheck
} from 'lucide-react';
import Select from 'react-select';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

// Smart Time Parser for Chronological Sorting
// Handles: "5:30", "07:30", "09:30", "11:00", "13:00", "01:00 PM", "16:30", "APG", "TBA"
const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 99999;
    const s = String(timeStr).trim().toUpperCase();
    if (s === 'APG') return 90000;
    if (s === 'TBA') return 99990;

    // 12-hour format e.g. "09:30 AM", "1:00 PM", "11:00 AM"
    const match12 = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (match12) {
        let hours = parseInt(match12[1], 10);
        const minutes = parseInt(match12[2] || '0', 10);
        const meridiem = match12[3].toUpperCase();
        if (meridiem === 'PM' && hours < 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    }

    // 24-hour format e.g. "5:30", "07:30", "11:00", "13:00", "16:30"
    const match24 = s.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
        let hours = parseInt(match24[1], 10);
        const minutes = parseInt(match24[2], 10);
        return hours * 60 + minutes;
    }

    // Single hour e.g. "1", "9", "11", "13"
    const matchHour = s.match(/^(\d{1,2})$/);
    if (matchHour) {
        let hours = parseInt(matchHour[1], 10);
        if (hours >= 1 && hours <= 6) hours += 12; // In taxi scheduling, 1..6 usually means afternoon
        return hours * 60;
    }

    return 80000;
};

// Formats date into live DRS spreadsheet format e.g. "1-09"
const formatTableDate = (dateVal) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    const day = d.getDate();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}`;
};

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
    const [viewMode, setViewMode] = useState('date'); // 'date' | 'all'
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingDutyId, setEditingDutyId] = useState(null);
    const [showSystemLinkAccordion, setShowSystemLinkAccordion] = useState(false);
    const [selectedSource, setSelectedSource] = useState(null);

    const initialFormData = {
        clientName: '',
        mobileNumber: '',
        hotel: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        duty: '',
        revenue: '',
        cOut: '',
        carType: '',
        customCarNumber: '',
        customDriverName: '',
        driver: null,
        vehicle: null,
        pickupPoint: '',
        isDirectBooking: true,
        bookingId: null,
        bookingRef: null,
        leadId: null
    };

    const [formData, setFormData] = useState(initialFormData);

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchDuties();
            fetchDropdownData();
        }
    }, [selectedCompany, selectedDate, viewMode]);

    const fetchDuties = async () => {
        setLoading(true);
        try {
            let url = `/api/drs/${selectedCompany._id}?`;
            if (viewMode === 'all') {
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

    const driverOptions = drivers.map(d => ({ value: d._id, label: `${d.name} (${d.mobile || 'No mob'})` }));
    const vehicleOptions = vehicles.map(v => ({ value: v._id, label: `${v.carNumber} - ${v.model || v.type}` }));

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
                label: `🎯 ${l.leadId || l.clientCode || 'LEAD'} - ${l.clientName} (${l.carType || 'Car'}) - ₹${l.totalAmount || 0}`
            }))
        },
        {
            label: '👤 Existing Clients',
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
        if (!opt) return;

        if (opt.type === 'booking') {
            const b = opt.data;
            const bDate = b.travelStartDate ? new Date(b.travelStartDate).toISOString().split('T')[0] : selectedDate;
            const itin = b.itinerary?.length > 0 
                ? (b.itinerary[0].duty || b.itinerary[0].description || b.notes || 'Tour Package')
                : (b.notes || `${b.vehicleType || 'Car'} Rental Duty`);
            const time = b.itinerary?.[0]?.time || '09:00';

            setFormData(prev => ({
                ...prev,
                clientName: b.clientName || '',
                mobileNumber: b.mobileNumber || '',
                hotel: b.hotel || b.source || 'Confirmed Booking',
                carType: b.vehicleType || '',
                duty: itin,
                revenue: b.totalAmount || 0,
                date: bDate,
                time: time,
                bookingId: b.bookingId,
                bookingRef: b._id,
                leadId: b.lead?._id || b.lead || null,
                isDirectBooking: false
            }));
        } else if (opt.type === 'lead') {
            const l = opt.data;
            const lDate = l.travelStartDate ? new Date(l.travelStartDate).toISOString().split('T')[0] : selectedDate;
            const itin = l.itinerary?.length > 0 
                ? (l.itinerary[0].duty || l.itinerary[0].description || '')
                : (l.pickupPoint ? `${l.pickupPoint} -> ${l.dropPoint || 'Destination'}` : 'Scheduled Itinerary');
            const time = l.itinerary?.[0]?.time || '09:00';

            setFormData(prev => ({
                ...prev,
                clientName: l.clientName || '',
                mobileNumber: l.mobileNumber || '',
                hotel: l.source || 'Sales Lead',
                carType: l.carType || '',
                duty: itin,
                revenue: l.totalAmount || 0,
                date: lDate,
                time: time,
                leadId: l._id,
                bookingId: l.bookingId || null,
                bookingRef: l.bookingRef || null,
                isDirectBooking: false
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

    const changeDate = (days) => {
        const current = new Date(selectedDate);
        current.setDate(current.getDate() + days);
        setSelectedDate(current.toISOString().split('T')[0]);
        setViewMode('date');
    };

    const setToday = () => {
        setSelectedDate(new Date().toISOString().split('T')[0]);
        setViewMode('date');
    };

    // Filter and Sort duties chronologically
    const processedDuties = useMemo(() => {
        let list = duties;
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            list = list.filter(d => (
                d.clientName?.toLowerCase().includes(q) ||
                d.mobileNumber?.includes(q) ||
                d.hotel?.toLowerCase().includes(q) ||
                d.duty?.toLowerCase().includes(q) ||
                d.itinerary?.toLowerCase().includes(q) ||
                d.carType?.toLowerCase().includes(q) ||
                d.customCarNumber?.toLowerCase().includes(q) ||
                d.customDriverName?.toLowerCase().includes(q) ||
                d.driver?.name?.toLowerCase().includes(q) ||
                d.vehicle?.carNumber?.toLowerCase().includes(q) ||
                d.bookingId?.toLowerCase().includes(q)
            ));
        }

        // Chronological sort: Date first (if all dates view), then Time
        return [...list].sort((a, b) => {
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            if (dateA !== dateB) return dateA - dateB;

            const timeA = parseTimeToMinutes(a.time);
            const timeB = parseTimeToMinutes(b.time);
            return timeA - timeB;
        });
    }, [duties, searchTerm]);

    const totalRevenue = useMemo(() => {
        return processedDuties.reduce((sum, d) => sum + (Number(d.revenue) || 0), 0);
    }, [processedDuties]);

    const handleAssignQuick = async (dutyId, field, value) => {
        try {
            const updated = await axios.put(`/api/drs/${dutyId}`, {
                [field]: value,
                status: 'Assigned'
            });
            setDuties(prev => prev.map(d => d._id === dutyId ? updated.data : d));
        } catch (error) {
            console.error('Error assigning:', error);
            alert('Failed to update assignment');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this duty from DRS?')) {
            try {
                await axios.delete(`/api/drs/${id}`);
                setDuties(prev => prev.filter(d => d._id !== id));
            } catch (error) {
                console.error('Error deleting:', error);
                alert('Failed to delete duty');
            }
        }
    };

    const openAddModal = () => {
        setEditingDutyId(null);
        setSelectedSource(null);
        setShowSystemLinkAccordion(false);
        setFormData({
            ...initialFormData,
            date: selectedDate
        });
        setShowModal(true);
    };

    const openEditModal = (duty) => {
        setEditingDutyId(duty._id);
        setSelectedSource(null);
        setShowSystemLinkAccordion(false);
        setFormData({
            clientName: duty.clientName || '',
            mobileNumber: duty.mobileNumber || '',
            hotel: duty.hotel || '',
            date: duty.date ? new Date(duty.date).toISOString().split('T')[0] : selectedDate,
            time: duty.time || '09:00',
            duty: duty.duty || duty.itinerary || '',
            revenue: duty.revenue || '',
            cOut: duty.cOut || '',
            carType: duty.carType || '',
            customCarNumber: duty.customCarNumber || '',
            customDriverName: duty.customDriverName || '',
            driver: duty.driver ? { value: duty.driver._id, label: duty.driver.name } : null,
            vehicle: duty.vehicle ? { value: duty.vehicle._id, label: `${duty.vehicle.carNumber} - ${duty.vehicle.model}` } : null,
            pickupPoint: duty.pickupPoint || '',
            isDirectBooking: duty.isDirectBooking !== false,
            bookingId: duty.bookingId || null,
            bookingRef: duty.bookingRef || null,
            leadId: duty.leadId || null
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                company: selectedCompany._id,
                driver: formData.driver?.value || null,
                vehicle: formData.vehicle?.value || null,
                revenue: Number(formData.revenue) || 0,
                status: (formData.driver || formData.customDriverName) ? 'Assigned' : 'Pending'
            };

            if (editingDutyId) {
                const res = await axios.put(`/api/drs/${editingDutyId}`, payload);
                setDuties(prev => prev.map(d => d._id === editingDutyId ? res.data : d));
            } else {
                const res = await axios.post('/api/drs', payload);
                setDuties(prev => [...prev, res.data]);
            }

            setShowModal(false);
        } catch (error) {
            console.error('Error saving DRS duty:', error);
            alert('Failed to save duty. Please check fields.');
        }
    };

    const customSelectStyles = {
        control: (base, state) => ({
            ...base,
            background: 'rgba(0,0,0,0.3)',
            borderColor: state.isFocused ? 'var(--primary)' : 'rgba(255,255,255,0.12)',
            color: 'white',
            minHeight: '38px',
            borderRadius: '8px',
            boxShadow: 'none',
            fontSize: '13px',
            '&:hover': {
                borderColor: 'var(--primary)'
            }
        }),
        singleValue: (base) => ({ ...base, color: 'white', fontSize: '13px' }),
        input: (base) => ({ ...base, color: 'white', fontSize: '13px' }),
        menu: (base) => ({ 
            ...base, 
            background: '#0f172a', 
            zIndex: 99999,
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
        }),
        option: (base, state) => ({
            ...base,
            background: state.isFocused ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: state.isSelected ? 'var(--primary)' : 'white',
            cursor: 'pointer',
            fontSize: '12px',
            '&:hover': {
                background: 'rgba(255,255,255,0.12)'
            }
        }),
        placeholder: (base) => ({ ...base, color: 'rgba(255,255,255,0.4)', fontSize: '12px' })
    };

    const inputStyle = {
        width: '100%', 
        padding: '10px 12px', 
        borderRadius: '8px', 
        border: '1px solid rgba(255,255,255,0.12)', 
        background: 'rgba(0,0,0,0.25)', 
        color: 'white', 
        outline: 'none',
        fontSize: '13px',
        transition: 'border-color 0.2s'
    };

    return (
        <div className="container-fluid" style={{ minHeight: '100vh', padding: '30px 20px', position: 'relative' }}>
            <SEO title="DRS Schedule - LogKaro" />

            {/* TOP HEADER & LIVE DRS DATE NAVIGATION */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '18px',
                marginBottom: '20px',
                background: 'rgba(255,255,255,0.02)',
                padding: '16px 22px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.06)'
            }}>
                {/* Left: Title & Subtitle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        background: 'rgba(251, 191, 36, 0.12)',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'var(--primary)'
                    }}>
                        <Calendar size={22} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'white', margin: 0, letterSpacing: '-0.3px' }}>
                                Daily Rental Sheet <span className="text-gradient-yellow">(DRS)</span>
                            </h1>
                            <span style={{
                                background: 'rgba(34, 197, 94, 0.15)',
                                color: '#4ade80',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '800'
                            }}>
                                LIVE OPERATIONS
                            </span>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', margin: '2px 0 0 0' }}>
                            Time-ordered automatic duty dispatch & fleet assignments
                        </p>
                    </div>
                </div>

                {/* Center: Live DRS Date Navigation Bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(0,0,0,0.35)',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <button
                        onClick={() => changeDate(-1)}
                        title="Previous Day"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: 'white',
                            padding: '6px 8px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <div 
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            background: viewMode === 'date' ? 'rgba(251, 191, 36, 0.12)' : 'transparent',
                            borderRadius: '8px',
                            border: viewMode === 'date' ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid transparent'
                        }}
                        onClick={(e) => {
                            const input = e.currentTarget.querySelector('input');
                            if (input && input.showPicker) input.showPicker();
                        }}
                    >
                        <Calendar size={15} color="var(--primary)" />
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setViewMode('date');
                            }}
                            onClick={(e) => e.target.showPicker && e.target.showPicker()}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                outline: 'none',
                                fontSize: '13px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                width: '130px'
                            }}
                        />
                    </div>

                    <button
                        onClick={() => changeDate(1)}
                        title="Next Day"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: 'white',
                            padding: '6px 8px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <ChevronRight size={16} />
                    </button>

                    <button
                        onClick={setToday}
                        style={{
                            padding: '5px 12px',
                            background: viewMode === 'date' && selectedDate === new Date().toISOString().split('T')[0] ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                            color: viewMode === 'date' && selectedDate === new Date().toISOString().split('T')[0] ? '#000' : 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '800',
                            cursor: 'pointer'
                        }}
                    >
                        Today
                    </button>

                    <button
                        onClick={() => setViewMode(viewMode === 'all' ? 'date' : 'all')}
                        style={{
                            padding: '5px 12px',
                            background: viewMode === 'all' ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                            color: viewMode === 'all' ? '#000' : 'rgba(255,255,255,0.7)',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        {viewMode === 'all' ? '✓ All Dates' : 'All Dates'}
                    </button>
                </div>

                {/* Right: Search & Add Direct Duty Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(0,0,0,0.35)',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <Search size={15} color="rgba(255,255,255,0.4)" />
                        <input 
                            type="text" 
                            placeholder="Search duty, guest, driver..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                padding: '8px 10px',
                                outline: 'none',
                                fontSize: '13px',
                                width: '200px'
                            }} 
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={openAddModal}
                        style={{
                            padding: '10px 20px',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            color: '#000',
                            border: 'none',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontWeight: '800',
                            fontSize: '13px',
                            boxShadow: '0 4px 14px rgba(251, 191, 36, 0.25)'
                        }}
                    >
                        <Plus size={18} /> + Add Direct Duty
                    </motion.button>
                </div>
            </div>

            {/* SPREADSHEET TABLE MATCHING LIVE DRS (media_1788857977063.jpg) */}
            <div className="glass-card" style={{ padding: '0', overflowX: 'auto', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <table style={{ width: '100%', color: 'white', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.45)', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                        <tr>
                            {/* 1. Date */}
                            <th style={{ padding: '14px 16px', fontWeight: '800', color: 'var(--primary)', width: '90px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Date
                            </th>
                            {/* 2. So. No. */}
                            <th style={{ padding: '14px 12px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', width: '70px', fontSize: '12px', textAlign: 'center' }}>
                                So. No.
                            </th>
                            {/* 3. Hotel */}
                            <th style={{ padding: '14px 16px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', width: '150px', fontSize: '12px' }}>
                                Hotel
                            </th>
                            {/* 4. Guest */}
                            <th style={{ padding: '14px 16px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', width: '160px', fontSize: '12px' }}>
                                Guest
                            </th>
                            {/* 5. Guest Mob */}
                            <th style={{ padding: '14px 16px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', width: '130px', fontSize: '12px' }}>
                                Guest Mob
                            </th>
                            {/* 6. Time */}
                            <th style={{ padding: '14px 14px', fontWeight: '800', color: '#86efac', width: '90px', fontSize: '12px', textAlign: 'center' }}>
                                Time
                            </th>
                            {/* 7. Duty */}
                            <th style={{ padding: '14px 16px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                                Duty
                            </th>
                            {/* 8. Amount (Header displays Total Sum like 23083 in spreadsheet) */}
                            <th style={{ padding: '14px 16px', fontWeight: '900', color: 'var(--primary)', width: '120px', fontSize: '13px', textAlign: 'right' }}>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginBottom: '2px' }}>TOTAL FARE</div>
                                ₹{totalRevenue.toLocaleString('en-IN')}
                            </th>
                            {/* 9. C/Out */}
                            <th style={{ padding: '14px 14px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', width: '100px', fontSize: '12px', textAlign: 'center' }}>
                                C/Out
                            </th>
                            {/* 10. Car Type */}
                            <th style={{ padding: '14px 16px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', width: '160px', fontSize: '12px' }}>
                                Car Type
                            </th>
                            {/* 11. Driver Name */}
                            <th style={{ padding: '14px 16px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', width: '160px', fontSize: '12px' }}>
                                Driver Name
                            </th>
                            {/* 12. Actions */}
                            <th style={{ padding: '14px 14px', fontWeight: '800', color: 'rgba(255,255,255,0.6)', width: '80px', fontSize: '12px', textAlign: 'center' }}>
                                Action
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="12" style={{ textAlign: 'center', padding: '50px' }}>
                                    <div className="loader"></div>
                                </td>
                            </tr>
                        ) : processedDuties.length === 0 ? (
                            <tr>
                                <td colSpan="12" style={{ textAlign: 'center', padding: '60px 20px' }}>
                                    <div style={{ color: 'rgba(255,255,255,0.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                        <Calendar size={42} />
                                        <p style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>No duties scheduled for this date</p>
                                        <button
                                            onClick={openAddModal}
                                            style={{
                                                marginTop: '8px',
                                                padding: '8px 18px',
                                                background: 'var(--primary)',
                                                color: '#000',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontWeight: '800',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            + Add First Duty
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            processedDuties.map((duty, index) => {
                                const isApg = String(duty.time || '').toUpperCase() === 'APG';
                                const isTba = String(duty.time || '').toUpperCase() === 'TBA';
                                const carDisplay = duty.vehicle ? `${duty.vehicle.carNumber} (${duty.vehicle.model || duty.carType})` : (duty.customCarNumber || duty.carType || '-');
                                const driverDisplay = duty.driver ? duty.driver.name : (duty.customDriverName || '-');

                                return (
                                    <tr 
                                        key={duty._id} 
                                        style={{ 
                                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                                            background: index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                                            transition: 'background 0.2s'
                                        }}
                                        className="drs-row-hover"
                                    >
                                        {/* 1. Date (Yellow highlighted cell badge like 1-09) */}
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            <span style={{
                                                background: '#fef08a',
                                                color: '#854d0e',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontWeight: '900',
                                                fontSize: '12px',
                                                display: 'inline-block',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {formatTableDate(duty.date)}
                                            </span>
                                        </td>

                                        {/* 2. So. No. (Automatically ordered based on time) */}
                                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: '800', color: 'rgba(255,255,255,0.9)', verticalAlign: 'middle', fontSize: '13px' }}>
                                            {index + 1}
                                        </td>

                                        {/* 3. Hotel */}
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontWeight: '700', fontSize: '13px', color: '#f1f5f9' }}>
                                            {duty.hotel || <span style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Direct Walk-In</span>}
                                        </td>

                                        {/* 4. Guest */}
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            <div style={{ fontWeight: '800', fontSize: '13px', color: 'white' }}>
                                                {duty.clientName}
                                            </div>
                                            {duty.bookingId && (
                                                <div style={{ fontSize: '10px', color: '#60a5fa', marginTop: '2px', fontWeight: '700' }}>
                                                    {duty.bookingId}
                                                </div>
                                            )}
                                        </td>

                                        {/* 5. Guest Mob */}
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            {duty.mobileNumber ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.85)' }}>
                                                        {duty.mobileNumber}
                                                    </span>
                                                    <a 
                                                        href={`https://wa.me/91${duty.mobileNumber.replace(/\D/g, '')}`} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        title="WhatsApp Guest"
                                                        style={{ color: '#4ade80', display: 'flex', alignItems: 'center' }}
                                                    >
                                                        <MessageSquare size={12} />
                                                    </a>
                                                    <a 
                                                        href={`tel:${duty.mobileNumber}`} 
                                                        title="Call Guest"
                                                        style={{ color: '#60a5fa', display: 'flex', alignItems: 'center' }}
                                                    >
                                                        <Phone size={12} />
                                                    </a>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>-</span>
                                            )}
                                        </td>

                                        {/* 6. Time (Soft green badge like spreadsheet) */}
                                        <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                                            <span style={{
                                                background: isApg ? 'rgba(234, 179, 8, 0.2)' : isTba ? 'rgba(148, 163, 184, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                                color: isApg ? '#facc15' : isTba ? '#cbd5e1' : '#4ade80',
                                                border: `1px solid ${isApg ? 'rgba(234, 179, 8, 0.4)' : isTba ? 'rgba(148, 163, 184, 0.4)' : 'rgba(34, 197, 94, 0.4)'}`,
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontWeight: '900',
                                                fontSize: '12px',
                                                letterSpacing: '0.5px',
                                                display: 'inline-block'
                                            }}>
                                                {duty.time || '09:00'}
                                            </span>
                                        </td>

                                        {/* 7. Duty */}
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: '13px', color: '#f8fafc', fontWeight: '600' }}>
                                                {duty.duty || duty.itinerary || 'Standard Duty'}
                                            </div>
                                            {duty.pickupPoint && (
                                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <MapPin size={10} color="var(--primary)" /> {duty.pickupPoint}
                                                </div>
                                            )}
                                        </td>

                                        {/* 8. Amount (Fare in ₹) */}
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right', fontWeight: '900', fontSize: '13px', color: '#f8fafc' }}>
                                            {duty.revenue > 0 ? `₹${Number(duty.revenue).toLocaleString('en-IN')}` : (
                                                <span style={{ color: 'rgba(255,255,255,0.3)' }}>-</span>
                                            )}
                                        </td>

                                        {/* 9. C/Out */}
                                        <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                                            {duty.cOut ? (
                                                <span style={{
                                                    background: 'rgba(255,255,255,0.06)',
                                                    padding: '3px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '11px',
                                                    color: 'rgba(255,255,255,0.8)'
                                                }}>
                                                    {duty.cOut}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'rgba(255,255,255,0.25)' }}>-</span>
                                            )}
                                        </td>

                                        {/* 10. Car Type */}
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            <div style={{ fontWeight: '700', fontSize: '12px', color: '#e2e8f0' }}>
                                                {carDisplay}
                                            </div>
                                        </td>

                                        {/* 11. Driver Name */}
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            <div style={{ fontWeight: '700', fontSize: '12px', color: '#e2e8f0' }}>
                                                {driverDisplay}
                                            </div>
                                        </td>

                                        {/* 12. Actions */}
                                        <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                <button
                                                    onClick={() => openEditModal(duty)}
                                                    title="Edit Duty"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.06)',
                                                        border: 'none',
                                                        color: 'white',
                                                        padding: '6px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(duty._id)}
                                                    title="Delete Duty"
                                                    style={{
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        border: 'none',
                                                        color: '#ef4444',
                                                        padding: '6px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* ADD / EDIT DIRECT DUTY MODAL */}
            <AnimatePresence>
                {showModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0,0,0,0.75)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 99999
                    }}>
                        <motion.div
                            initial={{ y: 30, opacity: 0, scale: 0.96 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 20, opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.18 }}
                            className="glass-card"
                            style={{
                                width: '92%',
                                maxWidth: '680px',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                background: '#0b1120',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '20px',
                                padding: '24px 28px'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        background: 'rgba(251, 191, 36, 0.15)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--primary)'
                                    }}>
                                        <Plus size={20} />
                                    </div>
                                    <div>
                                        <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '900' }}>
                                            {editingDutyId ? 'Edit DRS Duty' : 'Add Direct Duty (Quick Entry)'}
                                        </h2>
                                        <p style={{ color: 'rgba(255,255,255,0.45)', margin: '2px 0 0 0', fontSize: '11px' }}>
                                            Direct entry without creating client/lead. Automatically sorts by time in DRS.
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', padding: '6px', borderRadius: '50%' }}>
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Optional System Link (Bookings/Leads) Toggle */}
                            <div style={{ marginBottom: '16px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowSystemLinkAccordion(!showSystemLinkAccordion)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--primary)',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: 0
                                    }}
                                >
                                    {showSystemLinkAccordion ? '▲ Hide System Booking Link' : '▼ Auto-link from existing Booking or Lead (Optional)'}
                                </button>

                                {showSystemLinkAccordion && (
                                    <div style={{ marginTop: '10px', background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '10px', padding: '12px' }}>
                                        <Select 
                                            placeholder="🔍 Search Booking, Lead, or Client..."
                                            options={systemSourceOptions}
                                            value={selectedSource}
                                            onChange={handleSourceSelect}
                                            isClearable
                                            styles={customSelectStyles}
                                            menuPortalTarget={document.body}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Main Form Fields */}
                            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                {/* 1. Date */}
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '700' }}>
                                        Duty Date <span style={{ color: 'var(--primary)' }}>*</span>
                                    </label>
                                    <input 
                                        required 
                                        type="date" 
                                        value={formData.date} 
                                        onChange={e => setFormData({ ...formData, date: e.target.value })} 
                                        onClick={e => e.target.showPicker && e.target.showPicker()} 
                                        style={{ ...inputStyle, cursor: 'pointer' }} 
                                    />
                                </div>

                                {/* 2. Time (with quick click tags) */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: '700' }}>
                                            Time <span style={{ color: 'var(--primary)' }}>*</span>
                                        </label>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {['APG', 'TBA'].map(t => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, time: t })}
                                                    style={{
                                                        background: formData.time === t ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                                                        color: formData.time === t ? '#000' : 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '1px 6px',
                                                        fontSize: '10px',
                                                        fontWeight: '800',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <input 
                                        required 
                                        type="text" 
                                        value={formData.time} 
                                        onChange={e => setFormData({ ...formData, time: e.target.value })} 
                                        style={inputStyle} 
                                        placeholder="e.g. 05:30, 09:30, 13:00, APG" 
                                    />
                                    {/* Quick common times */}
                                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                                        {['05:30', '07:30', '09:00', '11:00', '13:00', '16:30'].map(tm => (
                                            <button
                                                key={tm}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, time: tm })}
                                                style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    color: 'rgba(255,255,255,0.6)',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '2px 6px',
                                                    fontSize: '10px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {tm}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. Hotel / Source */}
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '700' }}>
                                        Hotel / Source
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.hotel} 
                                        onChange={e => setFormData({ ...formData, hotel: e.target.value })} 
                                        style={inputStyle} 
                                        placeholder="e.g. Marriott, Yatree Ads" 
                                    />
                                    {/* Quick Hotel tags */}
                                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                                        {['Marriott', 'Yatree Ads', 'Yatree Ads - Repeat', 'Direct', 'Walk-in'].map(h => (
                                            <button
                                                key={h}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, hotel: h })}
                                                style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    color: 'rgba(255,255,255,0.6)',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '2px 6px',
                                                    fontSize: '10px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {h}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 4. Guest Name */}
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '700' }}>
                                        Guest Name <span style={{ color: 'var(--primary)' }}>*</span>
                                    </label>
                                    <input 
                                        required 
                                        type="text" 
                                        value={formData.clientName} 
                                        onChange={e => setFormData({ ...formData, clientName: e.target.value })} 
                                        style={inputStyle} 
                                        placeholder="e.g. Ms. Mehek, Mr. Abdullah" 
                                    />
                                </div>

                                {/* 5. Guest Mobile */}
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '700' }}>
                                        Guest Mobile Number
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.mobileNumber} 
                                        onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })} 
                                        style={inputStyle} 
                                        placeholder="e.g. 9930145246 (optional)" 
                                    />
                                </div>

                                {/* 6. Duty / Itinerary */}
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '700' }}>
                                        Duty / Route <span style={{ color: 'var(--primary)' }}>*</span>
                                    </label>
                                    <input 
                                        required 
                                        type="text" 
                                        value={formData.duty} 
                                        onChange={e => setFormData({ ...formData, duty: e.target.value })} 
                                        style={inputStyle} 
                                        placeholder="e.g. AP Drop, City Local, Station Pickup" 
                                    />
                                    {/* Quick Duty tags */}
                                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                                        {['AP Drop', 'AP Pick', 'City Local', 'Station Pickup', 'Outstation'].map(d => (
                                            <button
                                                key={d}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, duty: d })}
                                                style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    color: 'rgba(255,255,255,0.6)',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '2px 6px',
                                                    fontSize: '10px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 7. Amount / Fare (₹) */}
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '700' }}>
                                        Amount / Fare (₹)
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <IndianRupee size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                                        <input 
                                            type="number" 
                                            min="0" 
                                            value={formData.revenue} 
                                            onChange={e => setFormData({ ...formData, revenue: e.target.value })} 
                                            style={{ ...inputStyle, paddingLeft: '30px' }} 
                                            placeholder="0 or Cash" 
                                        />
                                    </div>
                                </div>

                                {/* 8. C/Out (Remarks / Notes) */}
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '700' }}>
                                        C/Out (Remarks / Status)
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.cOut} 
                                        onChange={e => setFormData({ ...formData, cOut: e.target.value })} 
                                        style={inputStyle} 
                                        placeholder="e.g. Car Out, Done, Waiting" 
                                    />
                                </div>

                                {/* 9. Car Type / Vehicle */}
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '700' }}>
                                        Car Type / Vehicle Number
                                    </label>
                                    <div style={{ marginBottom: '6px' }}>
                                        <Select 
                                            placeholder="Choose Fleet Vehicle..."
                                            options={vehicleOptions}
                                            value={formData.vehicle}
                                            onChange={opt => setFormData({ ...formData, vehicle: opt, customCarNumber: opt ? opt.label : '' })}
                                            styles={customSelectStyles}
                                            isClearable
                                            menuPortalTarget={document.body}
                                        />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={formData.customCarNumber || formData.carType} 
                                        onChange={e => setFormData({ ...formData, customCarNumber: e.target.value, carType: e.target.value })} 
                                        style={inputStyle} 
                                        placeholder="Or type custom (e.g. Crysta - 9821, Sedan - 9836)" 
                                    />
                                </div>

                                {/* 10. Driver Name */}
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '700' }}>
                                        Driver Name
                                    </label>
                                    <div style={{ marginBottom: '6px' }}>
                                        <Select 
                                            placeholder="Choose Driver from Fleet..."
                                            options={driverOptions}
                                            value={formData.driver}
                                            onChange={opt => setFormData({ ...formData, driver: opt, customDriverName: opt ? opt.label.split(' (')[0] : '' })}
                                            styles={customSelectStyles}
                                            isClearable
                                            menuPortalTarget={document.body}
                                        />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={formData.customDriverName} 
                                        onChange={e => setFormData({ ...formData, customDriverName: e.target.value })} 
                                        style={inputStyle} 
                                        placeholder="Or type custom driver (e.g. Gopal, Salim (T))" 
                                    />
                                </div>

                                {/* Modal Actions */}
                                <div style={{ gridColumn: '1 / -1', marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowModal(false)} 
                                        style={{ 
                                            padding: '10px 20px', 
                                            background: 'transparent', 
                                            color: 'white', 
                                            border: '1px solid rgba(255,255,255,0.2)', 
                                            borderRadius: '8px', 
                                            cursor: 'pointer', 
                                            fontWeight: '600',
                                            fontSize: '13px'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        style={{ 
                                            padding: '10px 28px', 
                                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
                                            color: '#000', 
                                            border: 'none', 
                                            borderRadius: '8px', 
                                            cursor: 'pointer', 
                                            fontWeight: '900', 
                                            fontSize: '13px', 
                                            boxShadow: '0 4px 14px rgba(251, 191, 36, 0.3)' 
                                        }}
                                    >
                                        {editingDutyId ? 'Save Changes' : 'Save & Add to DRS'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
