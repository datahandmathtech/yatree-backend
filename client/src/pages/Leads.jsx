import React, { useState, useEffect, useRef } from 'react';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import {
    Plus, Edit, Trash2, FileText, CheckCircle, X, Download, Briefcase,
    Calendar, Car, IndianRupee, MapPin, Search, Filter, AlertTriangle,
    Clock, Phone, ShieldCheck, Share2, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SEO from '../components/SEO';
import { generateBookingConfirmationPDF } from '../utils/bookingConfirmationPdf';

const LEAD_SOURCES = [
    'Website', 'Google Ads', 'Repeat Guest', 'Hotel', 'Referral',
    'Agent', 'Walk-in', 'Corporate', 'Social Media', 'Justdial', 'Other'
];

const GST_MODES = ['GST Inclusive', 'GST Extra', 'No GST', 'RCM'];

const LEAD_STATUSES = ['New', 'Follow-up', 'Quoted', 'Negotiation', 'Confirmed', 'Lost', 'Cancelled'];

export default function Leads() {
    const { selectedCompany } = useCompany();
    const { theme } = useTheme();

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // Create / Edit Modal
    const [showModal, setShowModal] = useState(false);
    const [editingLead, setEditingLead] = useState(null);

    // Convert to Booking Modal
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [convertingLead, setConvertingLead] = useState(null);
    const [advancePayment, setAdvancePayment] = useState('');
    const [paymentMode, setPaymentMode] = useState('UPI / QR Code');
    const [paymentRef, setPaymentRef] = useState('');
    const [adminOverride, setAdminOverride] = useState(false);
    const [adminOverrideReason, setAdminOverrideReason] = useState('');

    // Duplicate Phone Check State
    const [phoneCheckResult, setPhoneCheckResult] = useState(null);
    const phoneDebounceRef = useRef(null);

    const [formData, setFormData] = useState({
        clientName: '',
        mobileNumber: '',
        alternateMobile: '',
        email: '',
        gstin: '',
        source: 'Website',
        reference: '',
        salesPerson: '',
        leadDate: '',
        travelStartDate: '',
        travelEndDate: '',
        carType: '',
        numberOfCars: 1,
        gstMode: 'GST Inclusive',
        status: 'New',
        notes: '',
        itinerary: [],
        extraCharges: [],
        totalAmount: 0
    });

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchLeads();
        }
    }, [selectedCompany, statusFilter]);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            let url = `/api/leads/${selectedCompany._id}?status=${statusFilter}`;
            if (searchTerm) {
                url += `&search=${encodeURIComponent(searchTerm)}`;
            }
            const { data } = await axios.get(url);
            setLeads(data);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchLeads();
    };

    // Duplicate Phone Checker
    const handleMobileChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, mobileNumber: val }));

        if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);

        if (val.trim().length >= 8 && selectedCompany?._id) {
            phoneDebounceRef.current = setTimeout(async () => {
                try {
                    const { data } = await axios.get(`/api/leads/check-phone/${selectedCompany._id}?phone=${val.trim()}`);
                    if (data.exists) {
                        setPhoneCheckResult(data);
                    } else {
                        setPhoneCheckResult(null);
                    }
                } catch (err) {
                    console.error('Phone check error:', err);
                }
            }, 500);
        } else {
            setPhoneCheckResult(null);
        }
    };

    const handleOpenModal = (lead = null) => {
        setPhoneCheckResult(null);
        if (lead) {
            setEditingLead(lead);
            setFormData({
                clientName: lead.clientName,
                mobileNumber: lead.mobileNumber,
                alternateMobile: lead.alternateMobile || '',
                email: lead.email || '',
                gstin: lead.gstin || '',
                source: lead.source || 'Website',
                reference: lead.reference || '',
                salesPerson: lead.salesPerson || '',
                leadDate: lead.leadDate ? new Date(lead.leadDate).toISOString().split('T')[0] : '',
                travelStartDate: lead.travelStartDate ? new Date(lead.travelStartDate).toISOString().split('T')[0] : '',
                travelEndDate: lead.travelEndDate ? new Date(lead.travelEndDate).toISOString().split('T')[0] : '',
                carType: lead.carType,
                numberOfCars: lead.numberOfCars || 1,
                gstMode: lead.gstMode || 'GST Inclusive',
                status: lead.status || 'New',
                notes: lead.notes || '',
                itinerary: lead.itinerary || [],
                extraCharges: lead.extraCharges || [],
                totalAmount: lead.totalAmount || 0
            });
        } else {
            setEditingLead(null);
            const todayStr = new Date().toISOString().split('T')[0];
            setFormData({
                clientName: '', mobileNumber: '', alternateMobile: '', email: '', gstin: '',
                source: 'Website', reference: '', salesPerson: '',
                leadDate: todayStr, travelStartDate: '', travelEndDate: '',
                carType: 'Innova Crysta', numberOfCars: 1, gstMode: 'GST Inclusive',
                status: 'New', notes: '',
                itinerary: [
                    { dayNo: 1, date: '', time: '09:00 AM', pickupPoint: '', duty: 'Airport Pickup & Local Sightseeing', description: 'Airport Pickup & Local Sightseeing', vehicleType: 'Innova Crysta', amount: 0, inclusions: 'Fuel & Driver', exclusions: 'Toll & Parking' }
                ],
                extraCharges: [], totalAmount: 0
            });
        }
        setShowModal(true);
    };

    const addItineraryDay = () => {
        const nextDayNo = formData.itinerary.length + 1;
        setFormData(prev => ({
            ...prev,
            itinerary: [
                ...prev.itinerary,
                {
                    dayNo: nextDayNo,
                    date: '',
                    time: '09:00 AM',
                    pickupPoint: '',
                    duty: '',
                    description: '',
                    vehicleType: prev.carType || '',
                    vehicleCount: prev.numberOfCars || 1,
                    estimatedKm: 0,
                    amount: 0,
                    inclusions: 'Fuel & Driver',
                    exclusions: 'Toll, Parking, State Tax'
                }
            ]
        }));
    };

    const removeItineraryDay = (index) => {
        const newItinerary = [...formData.itinerary];
        newItinerary.splice(index, 1);
        calculateTotal(newItinerary, formData.extraCharges);
    };

    const handleItineraryChange = (index, field, value) => {
        const newItinerary = [...formData.itinerary];
        newItinerary[index][field] = field === 'amount' || field === 'estimatedKm' ? Number(value) : value;
        if (field === 'duty') {
            newItinerary[index].description = value;
        }
        calculateTotal(newItinerary, formData.extraCharges);
    };

    const calculateTotal = (itinerary, extraCharges) => {
        const sum = itinerary.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) +
            extraCharges.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
        setFormData(prev => ({ ...prev, itinerary, extraCharges, totalAmount: sum }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, company: selectedCompany._id };
            if (editingLead) {
                await axios.put(`/api/leads/single/${editingLead._id}`, payload);
            } else {
                await axios.post('/api/leads', payload);
            }
            setShowModal(false);
            fetchLeads();
        } catch (error) {
            console.error('Error saving lead:', error);
            alert('Failed to save lead: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this lead?')) {
            try {
                await axios.delete(`/api/leads/single/${id}`);
                fetchLeads();
            } catch (error) {
                console.error('Error deleting lead:', error);
                alert(error.response?.data?.message || 'Failed to delete lead');
            }
        }
    };

    // Quotation PDF Generator
    const generateQuotationPDF = (lead) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;

        // Accent header
        doc.setFillColor(245, 158, 11);
        doc.rect(0, 0, pageWidth, 4, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(15, 23, 42);
        doc.text(selectedCompany?.name || 'LOGKARO FLEET', 14, 18);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Contact: ${selectedCompany?.whatsappNumber || 'N/A'}  |  Email: ${selectedCompany?.email || 'N/A'}`, 14, 24);

        // Quote badge
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(pageWidth - 85, 10, 71, 18, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(245, 158, 11);
        doc.text('TRAVEL QUOTATION', pageWidth - 50, 17, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(lead.leadId || 'LK-QUOTATION', pageWidth - 50, 23, { align: 'center' });

        doc.setDrawColor(226, 232, 240);
        doc.line(14, 30, pageWidth - 14, 30);

        // Info box
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(`Guest Name: ${lead.clientName}`, 14, 37);
        doc.text(`Vehicle Required: ${lead.numberOfCars}x ${lead.carType}`, 120, 37);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Mobile: ${lead.mobileNumber}`, 14, 43);
        const sDate = lead.travelStartDate ? new Date(lead.travelStartDate).toLocaleDateString('en-IN') : '';
        const eDate = lead.travelEndDate ? new Date(lead.travelEndDate).toLocaleDateString('en-IN') : '';
        doc.text(`Travel Dates: ${sDate} to ${eDate}`, 120, 43);

        // Itinerary table
        const tableColumn = ["Day", "Date", "Reporting", "Pickup Point", "Duty Description", "Amount (Rs)"];
        const tableRows = (lead.itinerary || []).map((day, idx) => [
            `Day ${day.dayNo || idx + 1}`,
            day.date ? new Date(day.date).toLocaleDateString('en-IN') : 'TBA',
            day.time || '09:00 AM',
            day.pickupPoint || 'Hotel / City',
            day.duty || day.description || 'Full Day',
            `Rs. ${(day.amount || 0).toLocaleString('en-IN')}`
        ]);

        autoTable(doc, {
            startY: 48,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], fontSize: 8.5, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 3 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14 }
        });

        const finalY = (doc.lastAutoTable?.finalY || 48) + 8;

        // Total
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`Total Package Fare (${lead.gstMode || 'GST Inclusive'}): Rs. ${(lead.totalAmount || 0).toLocaleString('en-IN')}`, 14, finalY + 4);

        // Terms
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Note: Toll, State Tax & Parking extra unless specified. AC off in hills or parked vehicle.', 14, finalY + 12);

        doc.save(`${(lead.clientName || 'Guest').replace(/\s+/g, '_')}_Quotation.pdf`);
    };

    // Convert Lead to Booking
    const handleConvertSubmit = async (e) => {
        e.preventDefault();
        try {
            const adv = Number(advancePayment) || 0;
            if (adv <= 0 && !adminOverride) {
                alert('Please enter advance payment amount or check admin override');
                return;
            }

            const { data } = await axios.post(`/api/leads/${convertingLead._id}/convert`, {
                advancePayment: adv,
                paymentMode,
                paymentReference: paymentRef,
                adminOverrideReason: adminOverride ? (adminOverrideReason || 'Admin Manual Override') : ''
            });

            setShowConvertModal(false);
            fetchLeads();

            if (window.confirm(`Booking Confirmed successfully!\nBooking ID: ${data.booking?.bookingId}\n\nWould you like to download the Booking Confirmation PDF now?`)) {
                generateBookingConfirmationPDF(data.booking, selectedCompany);
            }
        } catch (error) {
            console.error('Error converting lead:', error);
            alert('Failed to convert booking: ' + (error.response?.data?.message || error.message));
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '11px 14px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.25)',
        color: 'white',
        outline: 'none',
        fontSize: '13px'
    };

    return (
        <div className="container-fluid" style={{ minHeight: '100vh', padding: '40px 20px', position: 'relative' }}>
            <SEO title="Lead & Enquiry Management" />

            {/* Header */}
            <header style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                        width: '45px',
                        height: '45px',
                        background: 'rgba(245, 158, 11, 0.12)',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'var(--primary)'
                    }}>
                        <Briefcase size={26} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'white', letterSpacing: '-0.5px', margin: 0 }}>
                            Sales <span className="text-gradient-yellow">Leads & Quotes</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px', margin: 0 }}>
                            Manage customer enquiries, build day-wise itineraries, quote packages, and convert to bookings.
                        </p>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOpenModal()}
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
                        boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
                    }}
                >
                    <Plus size={20} /> Create New Lead
                </motion.button>
            </header>

            {/* Status Tabs Bar */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '15px' }}>
                {['All', ...LEAD_STATUSES].map(st => (
                    <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            background: statusFilter === st ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                            color: statusFilter === st ? '#000' : 'rgba(255,255,255,0.7)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {st}
                    </button>
                ))}
            </div>

            {/* Search Bar */}
            <div className="glass-card" style={{ padding: '15px 20px', marginBottom: '20px', display: 'flex', gap: '12px' }}>
                <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flex: 1, gap: '10px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                        <input
                            type="text"
                            placeholder="Search by Lead ID, Guest Name, Mobile Number, or Source..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ ...inputStyle, paddingLeft: '38px' }}
                        />
                    </div>
                    <button type="submit" className="primary-btn" style={{ padding: '0 20px', borderRadius: '10px' }}>Search</button>
                </form>
            </div>

            {/* Leads Table */}
            <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
                <table style={{ width: '100%', color: 'white', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.25)' }}>
                        <tr>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Lead ID & Source</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Guest Details</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Travel Dates</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Vehicle</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Quote Fare</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>Status</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '50px' }}><div className="loader"></div></td></tr>
                        ) : leads.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '50px', color: 'rgba(255,255,255,0.5)' }}>No leads found. Create your first lead!</td></tr>
                        ) : leads.map(lead => (
                            <tr key={lead._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                {/* Lead ID & Source */}
                                <td style={{ padding: '16px 20px' }}>
                                    <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--primary)' }}>
                                        {lead.leadId || 'LK-LEAD'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                        {lead.source || 'Direct'} {lead.salesPerson ? `| By ${lead.salesPerson}` : ''}
                                    </div>
                                </td>

                                {/* Guest Details */}
                                <td style={{ padding: '16px 20px' }}>
                                    <div style={{ fontWeight: '800', fontSize: '15px' }}>{lead.clientName}</div>
                                    <div style={{ fontSize: '12px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                        <Phone size={11} /> {lead.mobileNumber}
                                    </div>
                                </td>

                                {/* Travel Dates */}
                                <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Calendar size={13} color="var(--primary)" />
                                        <span>{new Date(lead.travelStartDate).toLocaleDateString('en-IN')} - {new Date(lead.travelEndDate).toLocaleDateString('en-IN')}</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>
                                        {lead.itinerary?.length || 1} day schedule
                                    </div>
                                </td>

                                {/* Vehicle */}
                                <td style={{ padding: '16px 20px' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>
                                        <Car size={12} color="var(--primary)" /> {lead.numberOfCars}x {lead.carType}
                                    </div>
                                </td>

                                {/* Fare */}
                                <td style={{ padding: '16px 20px' }}>
                                    <div style={{ fontWeight: '900', color: 'white', fontSize: '15px' }}>₹{(lead.totalAmount || 0).toLocaleString('en-IN')}</div>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{lead.gstMode || 'GST Inclusive'}</div>
                                </td>

                                {/* Status */}
                                <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        textTransform: 'uppercase',
                                        background: lead.status === 'Confirmed' ? 'rgba(34,197,94,0.15)' : (lead.status === 'Lost' || lead.status === 'Cancelled' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'),
                                        color: lead.status === 'Confirmed' ? '#4ade80' : (lead.status === 'Lost' || lead.status === 'Cancelled' ? '#f87171' : 'var(--primary)'),
                                        border: `1px solid ${lead.status === 'Confirmed' ? 'rgba(34,197,94,0.3)' : (lead.status === 'Lost' || lead.status === 'Cancelled' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)')}`
                                    }}>
                                        {lead.status}
                                    </span>
                                    {lead.bookingId && (
                                        <div style={{ fontSize: '10px', color: '#4ade80', fontWeight: '800', marginTop: '4px' }}>
                                            {lead.bookingId}
                                        </div>
                                    )}
                                </td>

                                {/* Actions */}
                                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                        {lead.status !== 'Confirmed' ? (
                                            <button
                                                onClick={() => {
                                                    setConvertingLead(lead);
                                                    setAdvancePayment('');
                                                    setPaymentRef('');
                                                    setAdminOverride(false);
                                                    setShowConvertModal(true);
                                                }}
                                                style={{
                                                    background: 'rgba(34, 197, 94, 0.2)',
                                                    color: '#4ade80',
                                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                                    padding: '6px 12px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontWeight: '700',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                <CheckCircle size={13} /> Book
                                            </button>
                                        ) : (
                                            <span style={{ fontSize: '11px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '700', padding: '6px 0' }}>
                                                <ShieldCheck size={14} /> Confirmed
                                            </span>
                                        )}

                                        <button
                                            onClick={() => generateQuotationPDF(lead)}
                                            title="Download Quotation PDF"
                                            style={{
                                                background: 'rgba(59, 130, 246, 0.15)',
                                                color: '#60a5fa',
                                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                                padding: '6px 10px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '12px',
                                                fontWeight: '700'
                                            }}
                                        >
                                            <Download size={13} /> Quote
                                        </button>

                                        <button onClick={() => handleOpenModal(lead)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#f1f5f9', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer' }}><Edit size={14} /></button>
                                        <button onClick={() => handleDelete(lead._id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal: Create or Edit Lead */}
            <AnimatePresence>
                {showModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="glass-card" style={{ width: '92%', maxWidth: '850px', maxHeight: '92vh', overflowY: 'auto', background: '#0f172a', padding: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                                <h2 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '800' }}>{editingLead ? `Edit Lead (${editingLead.leadId || 'LK-LEAD'})` : 'Create New Lead & Quotation'}</h2>
                                <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Duplicate Phone Warning Banner */}
                                {phoneCheckResult && phoneCheckResult.exists && (
                                    <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <AlertTriangle size={18} color="#facc15" />
                                        <div style={{ fontSize: '12px', color: '#fef08a' }}>
                                            <strong>Existing Customer Detected:</strong> This phone number has {phoneCheckResult.count} previous lead(s)/booking(s) on file.
                                        </div>
                                    </div>
                                )}

                                {/* 1. Client & Enquiry Source */}
                                <div>
                                    <h3 style={{ color: 'var(--primary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>1. Client & Source Details</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Guest / Client Name *</label>
                                            <input required type="text" value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} style={inputStyle} placeholder="e.g. Rahul Sharma" />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Mobile Number *</label>
                                            <input required type="text" value={formData.mobileNumber} onChange={handleMobileChange} style={inputStyle} placeholder="e.g. 9876543210" />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Enquiry Source</label>
                                            <select value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} className="premium-compact-input" style={{ width: '100%', height: '40px' }}>
                                                {LEAD_SOURCES.map(src => <option key={src} value={src}>{src}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>GST Mode</label>
                                            <select value={formData.gstMode} onChange={e => setFormData({ ...formData, gstMode: e.target.value })} className="premium-compact-input" style={{ width: '100%', height: '40px' }}>
                                                {GST_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Tour Specs */}
                                <div>
                                    <h3 style={{ color: 'var(--primary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>2. Travel Schedule & Vehicle</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Travel Start Date *</label>
                                            <input required type="date" value={formData.travelStartDate} onChange={e => setFormData({ ...formData, travelStartDate: e.target.value })} style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Travel End Date *</label>
                                            <input required type="date" value={formData.travelEndDate} onChange={e => setFormData({ ...formData, travelEndDate: e.target.value })} style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Vehicle Model *</label>
                                            <input required type="text" placeholder="e.g. Innova Crysta" value={formData.carType} onChange={e => setFormData({ ...formData, carType: e.target.value })} style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Number of Vehicles</label>
                                            <input required type="number" min="1" value={formData.numberOfCars} onChange={e => setFormData({ ...formData, numberOfCars: Number(e.target.value) })} style={inputStyle} />
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Day-wise Itinerary */}
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <h3 style={{ color: 'white', margin: 0, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <MapPin size={16} color="var(--primary)" /> Day-wise Itinerary & Pricing
                                        </h3>
                                        <button type="button" onClick={addItineraryDay} style={{ padding: '6px 12px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--primary)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>+ Add Day</button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {formData.itinerary.map((day, idx) => (
                                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '40px 140px 100px 1fr 120px 30px', gap: '8px', alignItems: 'center' }}>
                                                <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '12px' }}>D{idx + 1}</div>
                                                <input type="date" value={day.date ? new Date(day.date).toISOString().split('T')[0] : ''} onChange={e => handleItineraryChange(idx, 'date', e.target.value)} style={{ ...inputStyle, padding: '8px' }} />
                                                <input type="text" placeholder="09:00 AM" value={day.time || ''} onChange={e => handleItineraryChange(idx, 'time', e.target.value)} style={{ ...inputStyle, padding: '8px' }} />
                                                <input required type="text" placeholder="Duty/Route (e.g. Udaipur Sightseeing)" value={day.duty || day.description} onChange={e => handleItineraryChange(idx, 'duty', e.target.value)} style={{ ...inputStyle, padding: '8px' }} />
                                                <input required type="number" min="0" placeholder="Fare ₹" value={day.amount} onChange={e => handleItineraryChange(idx, 'amount', e.target.value)} style={{ ...inputStyle, padding: '8px' }} />
                                                <button type="button" onClick={() => removeItineraryDay(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Total Fare */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '16px', background: 'rgba(245, 158, 11, 0.06)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>Total Quoted Fare ({formData.gstMode})</div>
                                        <div style={{ color: 'var(--primary)', fontSize: '26px', fontWeight: '900' }}>₹{formData.totalAmount.toLocaleString('en-IN')}</div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" className="primary-btn" style={{ padding: '10px 25px' }}>{editingLead ? 'Update Lead' : 'Save & Generate Lead'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Convert to Booking */}
            <AnimatePresence>
                {showConvertModal && convertingLead && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '90%', maxWidth: '480px', background: '#0f172a', padding: '30px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto' }}>
                                    <ShieldCheck size={26} />
                                </div>
                                <h2 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '900' }}>Confirm Booking</h2>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px' }}>
                                    Convert <strong>{convertingLead.clientName}</strong>'s enquiry into an official confirmed booking.
                                </p>
                            </div>

                            <form onSubmit={handleConvertSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Total Package Amount:</span>
                                    <span style={{ fontSize: '15px', fontWeight: '900', color: 'white' }}>₹{(convertingLead.totalAmount || 0).toLocaleString('en-IN')}</span>
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Advance Received (₹)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="e.g. 5000"
                                        value={advancePayment}
                                        onChange={e => setAdvancePayment(e.target.value)}
                                        style={{ ...inputStyle, fontSize: '16px', fontWeight: 'bold' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '4px' }}>Payment Mode</label>
                                    <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="premium-compact-input" style={{ width: '100%', height: '40px' }}>
                                        <option value="UPI / QR Code">UPI / QR Code</option>
                                        <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                                        <option value="Cash">Cash to Company</option>
                                        <option value="Driver Cash">Driver Cash in Hand</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '4px' }}>Transaction Ref / UTR (Optional)</label>
                                    <input type="text" placeholder="e.g. UTR12345678" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} style={inputStyle} />
                                </div>

                                {/* Admin Override if 0 advance */}
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={adminOverride} onChange={e => setAdminOverride(e.target.checked)} />
                                        <span>Confirm without advance (Admin Override)</span>
                                    </label>
                                    {adminOverride && (
                                        <input
                                            type="text"
                                            placeholder="Reason for zero advance (e.g. Corporate Client)..."
                                            value={adminOverrideReason}
                                            onChange={e => setAdminOverrideReason(e.target.value)}
                                            style={{ ...inputStyle, marginTop: '8px', fontSize: '12px' }}
                                        />
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowConvertModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" style={{ flex: 1, padding: '12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}>Confirm & Create DRS</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
