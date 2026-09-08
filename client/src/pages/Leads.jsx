import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import {
    Plus, Edit, Trash2, FileText, CheckCircle, X, Download, Briefcase,
    Calendar, Car, IndianRupee, MapPin, Search, Filter, AlertTriangle,
    Clock, Phone, ShieldCheck, Share2, HelpCircle, User, Users,
    Globe, Building2, Repeat, CircleDot, XCircle, ChevronLeft, ChevronRight,
    TrendingUp, BarChart2, BarChart3, Info, CheckSquare, Square
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

const MONTH_TABS = ['All', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

const VEHICLE_OPTIONS = [
    'Innova Crysta',
    'Ertiga',
    'Swift Dzire',
    'Tempo Traveller (12 Seater)',
    'Tempo Traveller (17 Seater)',
    'Toyota Fortuner',
    'Sedan',
    'SUV',
    'Luxury Car',
    'Bus'
];

export default function Leads() {
    const { selectedCompany } = useCompany();
    const { theme } = useTheme();

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [monthFilter, setMonthFilter] = useState('All');
    const [sourceFilter, setSourceFilter] = useState('All');
    const [salesPersonFilter, setSalesPersonFilter] = useState('All');

    // Hover tooltip state
    const [hoveredLeadId, setHoveredLeadId] = useState(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Create / Edit Modal
    const [showModal, setShowModal] = useState(false);
    const [editingLead, setEditingLead] = useState(null);
    const [previewClientCode, setPreviewClientCode] = useState('');

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
        carType: 'Innova Crysta',
        numberOfCars: 1,
        gstMode: 'GST Inclusive',
        status: 'New',
        notes: '',
        specialRemarks: '',
        inclusions: {
            driverAllowance: true,
            nightAllowance: true,
            tollParking: true,
            gstIncluded: true
        },
        itinerary: [],
        extraCharges: [],
        totalAmount: 0
    });

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchLeads();
        }
    }, [selectedCompany, statusFilter, monthFilter]);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            let url = `/api/leads/${selectedCompany._id}?status=${statusFilter}`;
            if (monthFilter && monthFilter !== 'All') {
                url += `&month=${monthFilter}`;
            }
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
                    setPhoneCheckResult(data);
                } catch (err) {
                    console.error('Phone duplicate check error:', err);
                }
            }, 500);
        } else {
            setPhoneCheckResult(null);
        }
    };

    // Fetch next client code preview when modal opens or leadDate changes
    const fetchNextClientCodePreview = async (dateVal) => {
        if (!selectedCompany?._id) return;
        try {
            const dateParam = dateVal || new Date().toISOString().split('T')[0];
            const { data } = await axios.get(`/api/leads/next-client-code/${selectedCompany._id}?date=${dateParam}`);
            if (data?.clientCode) {
                setPreviewClientCode(data.clientCode);
            }
        } catch (err) {
            console.error('Error fetching client code preview:', err);
        }
    };

    // Auto-populate itinerary days when travel dates change
    const handleTravelDateChange = (field, value) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            const sDate = field === 'travelStartDate' ? value : prev.travelStartDate;
            const eDate = field === 'travelEndDate' ? value : prev.travelEndDate;

            if (sDate && eDate) {
                const s = new Date(sDate);
                const e = new Date(eDate);
                if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
                    const daysCount = Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1);
                    const newItinerary = [];

                    for (let i = 0; i < daysCount; i++) {
                        const curDate = new Date(s);
                        curDate.setDate(curDate.getDate() + i);
                        const dateStr = curDate.toISOString().split('T')[0];

                        // Keep existing day info if already entered
                        const existingDay = prev.itinerary[i];
                        const isApg = existingDay ? existingDay.isApg : (i % 2 === 1);
                        const rate = existingDay ? (Number(existingDay.rate) || 0) : 0;
                        const qty = existingDay ? (Number(existingDay.vehicleCount) || updated.numberOfCars || 1) : (updated.numberOfCars || 1);

                        newItinerary.push({
                            dayNo: i + 1,
                            date: dateStr,
                            time: existingDay ? existingDay.time : (isApg ? 'APG' : (i === 0 ? '09:00 AM' : '11:30 AM')),
                            isApg: isApg,
                            duty: existingDay ? existingDay.duty : (i === 0 ? 'Airport Pickup & Local Sightseeing' : 'City Tour / Transfer'),
                            description: existingDay ? existingDay.duty : (i === 0 ? 'Airport Pickup & Local Sightseeing' : 'City Tour / Transfer'),
                            vehicleType: existingDay?.vehicleType || updated.carType || 'Innova Crysta',
                            vehicleCount: qty,
                            quantity: qty,
                            rate: rate,
                            amount: existingDay ? (Number(existingDay.amount) || (qty * rate)) : (qty * rate)
                        });
                    }

                    const total = newItinerary.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
                    updated.itinerary = newItinerary;
                    updated.totalAmount = total;
                }
            }
            return updated;
        });
    };

    // Itinerary Row Field Handlers
    const handleItineraryRowChange = (index, field, value) => {
        const updated = [...formData.itinerary];
        const row = { ...updated[index] };

        if (field === 'isApg') {
            row.isApg = value;
            if (value) {
                row.time = 'APG';
            } else if (row.time === 'APG') {
                row.time = '09:00 AM';
            }
        } else if (field === 'rate' || field === 'quantity') {
            const qty = Number(field === 'quantity' ? value : (row.quantity || row.vehicleCount || 1));
            const rate = Number(field === 'rate' ? value : (row.rate || 0));
            row.rate = rate;
            row.quantity = qty;
            row.vehicleCount = qty;
            row.amount = qty * rate;
        } else if (field === 'amount') {
            row.amount = Number(value) || 0;
        } else if (field === 'duty') {
            row.duty = value;
            row.description = value;
        } else {
            row[field] = value;
        }

        updated[index] = row;
        const total = updated.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        setFormData(prev => ({ ...prev, itinerary: updated, totalAmount: total }));
    };

    const addAnotherDay = () => {
        let nextDate = '';
        const len = formData.itinerary.length;
        if (len > 0 && formData.itinerary[len - 1].date) {
            const last = new Date(formData.itinerary[len - 1].date);
            last.setDate(last.getDate() + 1);
            nextDate = last.toISOString().split('T')[0];
        } else if (formData.travelStartDate) {
            const s = new Date(formData.travelStartDate);
            s.setDate(s.getDate() + len);
            nextDate = s.toISOString().split('T')[0];
        }

        const newDay = {
            dayNo: len + 1,
            date: nextDate,
            time: '09:00 AM',
            isApg: false,
            pickupPoint: '',
            duty: 'City Tour / Transfer',
            description: 'City Tour / Transfer',
            vehicleType: formData.carType || 'Innova Crysta',
            vehicleCount: formData.numberOfCars || 1,
            quantity: formData.numberOfCars || 1,
            rate: 0,
            amount: 0
        };

        const updated = [...formData.itinerary, newDay];
        setFormData(prev => ({
            ...prev,
            itinerary: updated,
            travelEndDate: nextDate || prev.travelEndDate
        }));
    };

    const removeItineraryDay = (index) => {
        const updated = formData.itinerary
            .filter((_, i) => i !== index)
            .map((d, i) => ({ ...d, dayNo: i + 1 }));
        const total = updated.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        setFormData(prev => ({ ...prev, itinerary: updated, totalAmount: total }));
    };

    // Toggle Inclusions
    const handleInclusionToggle = (key) => {
        setFormData(prev => ({
            ...prev,
            inclusions: {
                ...prev.inclusions,
                [key]: !prev.inclusions[key]
            }
        }));
    };

    // Open Modal
    const handleOpenModal = (lead = null) => {
        setPhoneCheckResult(null);
        if (lead) {
            setEditingLead(lead);
            setPreviewClientCode(lead.clientCode || lead.leadId || '');
            setFormData({
                clientName: lead.clientName || '',
                mobileNumber: lead.mobileNumber || '',
                alternateMobile: lead.alternateMobile || '',
                email: lead.email || '',
                gstin: lead.gstin || '',
                source: lead.source || 'Website',
                reference: lead.reference || '',
                salesPerson: lead.salesPerson || '',
                leadDate: lead.leadDate ? new Date(lead.leadDate).toISOString().split('T')[0] : '',
                travelStartDate: lead.travelStartDate ? new Date(lead.travelStartDate).toISOString().split('T')[0] : '',
                travelEndDate: lead.travelEndDate ? new Date(lead.travelEndDate).toISOString().split('T')[0] : '',
                carType: lead.carType || 'Innova Crysta',
                numberOfCars: lead.numberOfCars || 1,
                gstMode: lead.gstMode || 'GST Inclusive',
                status: lead.status || 'New',
                notes: lead.notes || '',
                specialRemarks: lead.specialRemarks || '',
                inclusions: lead.inclusions || {
                    driverAllowance: true,
                    nightAllowance: true,
                    tollParking: true,
                    gstIncluded: true
                },
                itinerary: (lead.itinerary || []).map((d, i) => ({
                    dayNo: d.dayNo || i + 1,
                    date: d.date ? new Date(d.date).toISOString().split('T')[0] : '',
                    time: d.time || '09:00 AM',
                    isApg: d.isApg || d.time === 'APG',
                    duty: d.duty || d.description || 'Standard Duty',
                    description: d.duty || d.description || 'Standard Duty',
                    vehicleType: d.vehicleType || lead.carType || 'Innova Crysta',
                    vehicleCount: d.vehicleCount || lead.numberOfCars || 1,
                    quantity: d.vehicleCount || lead.numberOfCars || 1,
                    rate: d.rate || 0,
                    amount: d.amount || 0
                })),
                extraCharges: lead.extraCharges || [],
                totalAmount: lead.totalAmount || 0
            });
        } else {
            setEditingLead(null);
            const today = new Date().toISOString().split('T')[0];
            fetchNextClientCodePreview(today);

            const initialItinerary = [
                {
                    dayNo: 1,
                    date: today,
                    time: '09:00 AM',
                    isApg: false,
                    duty: 'Airport Pickup & Local Sightseeing',
                    description: 'Airport Pickup & Local Sightseeing',
                    vehicleType: 'Innova Crysta',
                    vehicleCount: 1,
                    quantity: 1,
                    rate: 0,
                    amount: 0
                },
                {
                    dayNo: 2,
                    date: today,
                    time: 'APG',
                    isApg: true,
                    duty: 'City Tour / Transfer',
                    description: 'City Tour / Transfer',
                    vehicleType: 'Innova Crysta',
                    vehicleCount: 1,
                    quantity: 1,
                    rate: 0,
                    amount: 0
                },
                {
                    dayNo: 3,
                    date: today,
                    time: '11:30 AM',
                    isApg: false,
                    duty: 'City Tour / Transfer',
                    description: 'City Tour / Transfer',
                    vehicleType: 'Innova Crysta',
                    vehicleCount: 1,
                    quantity: 1,
                    rate: 0,
                    amount: 0
                },
                {
                    dayNo: 4,
                    date: today,
                    time: 'APG',
                    isApg: true,
                    duty: 'City Tour / Transfer',
                    description: 'City Tour / Transfer',
                    vehicleType: 'Innova Crysta',
                    vehicleCount: 1,
                    quantity: 1,
                    rate: 0,
                    amount: 0
                },
                {
                    dayNo: 5,
                    date: today,
                    time: '02:15 PM',
                    isApg: false,
                    duty: 'City Tour / Transfer',
                    description: 'City Tour / Transfer',
                    vehicleType: 'Innova Crysta',
                    vehicleCount: 1,
                    quantity: 1,
                    rate: 0,
                    amount: 0
                }
            ];

            setFormData({
                clientName: '',
                mobileNumber: '',
                alternateMobile: '',
                email: '',
                gstin: '',
                source: 'Website',
                reference: '',
                salesPerson: '',
                leadDate: today,
                travelStartDate: today,
                travelEndDate: today,
                carType: 'Innova Crysta',
                numberOfCars: 1,
                gstMode: 'GST Inclusive',
                status: 'New',
                notes: '',
                specialRemarks: '',
                inclusions: {
                    driverAllowance: true,
                    nightAllowance: true,
                    tollParking: true,
                    gstIncluded: true
                },
                itinerary: initialItinerary,
                extraCharges: [],
                totalAmount: 0
            });
        }
        setShowModal(true);
    };

    // Save Lead Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                company: selectedCompany._id
            };

            if (editingLead) {
                await axios.put(`/api/leads/single/${editingLead._id}`, payload);
            } else {
                await axios.post('/api/leads', payload);
            }

            setShowModal(false);
            fetchLeads();
        } catch (error) {
            console.error('Error saving lead:', error);
            alert(error.response?.data?.message || 'Error saving lead');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this lead?')) {
            try {
                await axios.delete(`/api/leads/single/${id}`);
                fetchLeads();
            } catch (error) {
                console.error('Error deleting lead:', error);
                alert('Failed to delete lead');
            }
        }
    };

    // Generate Quotation PDF
    const generateQuotationPDF = (lead) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width || 210;

        // Top accent
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
        doc.text('TRAVEL QUOTATION', pageWidth - 50, 16, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(`Client Code: ${lead.clientCode || lead.leadId || 'N/A'}`, pageWidth - 50, 23, { align: 'center' });

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
            day.isApg ? 'APG' : (day.time || '09:00 AM'),
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

        // Special Remarks if present
        if (lead.specialRemarks) {
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(`Guest Remarks: ${lead.specialRemarks}`, 14, finalY + 11);
        }

        // Terms
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Inclusions: Driver & Night Allowance, Toll & Parking (if specified). AC off in hills/parked.', 14, finalY + (lead.specialRemarks ? 17 : 12));

        doc.save(`${(lead.clientName || 'Guest').replace(/\s+/g, '_')}_${lead.clientCode ? lead.clientCode.replace('/', '-') : 'Quotation'}.pdf`);
    };

    // Convert Lead to Booking
    const handleConvertSubmit = async (e) => {
        e.preventDefault();
        try {
            const adv = Number(advancePayment) || 0;
            if (adv <= 0 && !adminOverride) {
                alert('Please enter advance received or check admin override checkbox');
                return;
            }

            const { data } = await axios.post(`/api/leads/${convertingLead._id}/convert`, {
                advancePayment: adv,
                paymentMode,
                paymentReference: paymentRef,
                adminOverrideReason: adminOverride ? adminOverrideReason : ''
            });

            alert(`Booking confirmed successfully! Booking ID: ${data.booking?.bookingId || data.bookingId}`);
            setShowConvertModal(false);
            fetchLeads();
        } catch (error) {
            console.error('Error converting lead to booking:', error);
            alert(error.response?.data?.message || 'Failed to convert lead to booking');
        }
    };

    // Filter leads on client side
    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            if (sourceFilter !== 'All' && lead.source !== sourceFilter) return false;
            if (salesPersonFilter !== 'All' && lead.salesPerson !== salesPersonFilter) return false;
            return true;
        });
    }, [leads, sourceFilter, salesPersonFilter]);

    // Unique sales persons
    const salesPersonsList = useMemo(() => {
        const set = new Set();
        leads.forEach(l => { if (l.salesPerson) set.add(l.salesPerson); });
        return Array.from(set);
    }, [leads]);

    // KPI Summary Calculations
    const kpiData = useMemo(() => {
        let totalQuote = 0;
        let convertedQuote = 0;
        let convertedCount = 0;

        leads.forEach(l => {
            const amt = Number(l.totalAmount) || 0;
            totalQuote += amt;
            if (l.status === 'Confirmed' || l.bookingId) {
                convertedQuote += amt;
                convertedCount += 1;
            }
        });

        return {
            totalQuote,
            totalLeadsCount: leads.length,
            convertedQuote,
            convertedCount
        };
    }, [leads]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredLeads.length / itemsPerPage) || 1;
    const paginatedLeads = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredLeads.slice(start, start + itemsPerPage);
    }, [filteredLeads, currentPage]);

    // Formatters
    const formatCreatedDate = (dateVal) => {
        if (!dateVal) return 'N/A';
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatTravelMonth = (startDate, endDate) => {
        if (!startDate) return { month: 'TBA', days: 1 };
        const s = new Date(startDate);
        const mStr = isNaN(s.getTime()) ? 'TBA' : s.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        let days = 1;
        if (endDate) {
            const e = new Date(endDate);
            if (!isNaN(e.getTime()) && !isNaN(s.getTime())) {
                const diffTime = Math.abs(e - s);
                days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
            }
        }
        return { month: mStr, days };
    };

    const renderSourceIcon = (source) => {
        const s = (source || '').toLowerCase();
        if (s.includes('google')) {
            return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#f87171' }}>
                    <span style={{ fontWeight: '900', color: '#38bdf8', fontSize: '13px' }}>G</span> Google Ads
                </span>
            );
        }
        if (s.includes('referral')) {
            return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}>
                    <Share2 size={13} color="#38bdf8" /> Referral
                </span>
            );
        }
        if (s.includes('hotel')) {
            return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#facc15' }}>
                    <Building2 size={13} color="#facc15" /> Hotel
                </span>
            );
        }
        if (s.includes('repeat')) {
            return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4ade80' }}>
                    <Repeat size={13} color="#4ade80" /> Repeat Guest
                </span>
            );
        }
        if (s.includes('website')) {
            return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#818cf8' }}>
                    <Globe size={13} color="#818cf8" /> Website
                </span>
            );
        }
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.7)' }}>
                <Briefcase size={13} color="var(--primary)" /> {source || 'Direct'}
            </span>
        );
    };

    const renderStatusPill = (status) => {
        switch (status) {
            case 'Confirmed':
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '800',
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: '#4ade80',
                        border: '1px solid rgba(34, 197, 94, 0.3)'
                    }}>
                        <CheckCircle size={12} /> Confirmed
                    </span>
                );
            case 'Open':
            case 'New':
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '800',
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.3)'
                    }}>
                        <CircleDot size={12} /> {status === 'New' ? 'Open' : status}
                    </span>
                );
            case 'Converted':
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '800',
                        background: 'rgba(20, 184, 166, 0.15)',
                        color: '#2dd4bf',
                        border: '1px solid rgba(20, 184, 166, 0.3)'
                    }}>
                        <BarChart2 size={12} /> Converted
                    </span>
                );
            case 'Dead':
            case 'Lost':
            case 'Cancelled':
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '800',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}>
                        <XCircle size={12} /> {status === 'Cancelled' || status === 'Lost' ? 'Dead' : status}
                    </span>
                );
            default:
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '800',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: 'var(--primary)',
                        border: '1px solid rgba(245, 158, 11, 0.3)'
                    }}>
                        <Clock size={12} /> {status}
                    </span>
                );
        }
    };

    // Dark sleek input styles matching the reference image
    const darkInputStyle = {
        background: '#0a101d',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '8px',
        color: '#f1f5f9',
        padding: '10px 14px',
        fontSize: '13px',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box'
    };

    const labelStyle = {
        fontSize: '11px',
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.65)',
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        display: 'block',
        marginBottom: '6px'
    };

    return (
        <div className="container-fluid" style={{ padding: '24px', minHeight: '100vh', background: 'transparent' }}>
            <SEO title="Sales God - Leads & Quotes" description="Manage taxi fleet sales leads, client codes, quotes and conversions." />

            {/* 1. Header with 'Sales God' Title & KPI Summary Cards */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '20px'
            }}>
                {/* Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <BarChart3 size={24} color="var(--primary)" />
                    </div>
                    <div>
                        <h1 style={{ color: 'white', fontSize: '26px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>
                            Sales God
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '12px' }}>
                            Enterprise Lead Management & Quotation Engine
                        </p>
                    </div>
                </div>

                {/* Right side KPIs + Create Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    {/* Total Quote Card */}
                    <div style={{
                        background: 'rgba(30, 58, 138, 0.35)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '14px',
                        padding: '10px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        minWidth: '170px'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'rgba(59, 130, 246, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#60a5fa'
                        }}>
                            <FileText size={18} />
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>Total Quote</div>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>₹{kpiData.totalQuote.toLocaleString('en-IN')}</div>
                            <div style={{ fontSize: '10px', color: '#93c5fd' }}>Across {kpiData.totalLeadsCount} leads</div>
                        </div>
                    </div>

                    {/* Converted Quote Card */}
                    <div style={{
                        background: 'rgba(6, 78, 59, 0.35)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '14px',
                        padding: '10px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        minWidth: '170px'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'rgba(16, 185, 129, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#34d399'
                        }}>
                            <TrendingUp size={18} />
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>Converted Quote</div>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#4ade80' }}>₹{kpiData.convertedQuote.toLocaleString('en-IN')}</div>
                            <div style={{ fontSize: '10px', color: '#86efac' }}>From {kpiData.convertedCount} bookings</div>
                        </div>
                    </div>

                    {/* + Create a Lead Button */}
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleOpenModal()}
                        style={{
                            background: '#fbbf24',
                            color: '#000',
                            border: 'none',
                            borderRadius: '30px',
                            padding: '12px 22px',
                            fontSize: '14px',
                            fontWeight: '800',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 18px rgba(251, 191, 36, 0.35)'
                        }}
                    >
                        <Plus size={18} strokeWidth={3} /> Create a Lead
                    </motion.button>
                </div>
            </header>

            {/* 2. FY Badge & Month Tabs Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '8px',
                marginBottom: '16px'
            }}>
                <div style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    background: '#fbbf24',
                    color: '#000',
                    fontSize: '12px',
                    fontWeight: '900',
                    letterSpacing: '0.3px',
                    whiteSpace: 'nowrap'
                }}>
                    FY 26-27
                </div>

                {MONTH_TABS.map(m => {
                    const isActive = monthFilter === m;
                    return (
                        <button
                            key={m}
                            onClick={() => {
                                setMonthFilter(m);
                                setCurrentPage(1);
                            }}
                            style={{
                                padding: '8px 18px',
                                borderRadius: '20px',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: isActive ? '800' : '600',
                                cursor: 'pointer',
                                background: isActive ? '#fbbf24' : 'rgba(255,255,255,0.06)',
                                color: isActive ? '#000' : 'rgba(255,255,255,0.7)',
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {m}
                        </button>
                    );
                })}
            </div>

            {/* 3. Filter Bar: Search + Sales Person Dropdown + Source Dropdown */}
            <div className="glass-card" style={{
                padding: '14px 18px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                {/* Search Input */}
                <form onSubmit={handleSearchSubmit} style={{ flex: '1 1 300px', display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                        <input
                            type="text"
                            placeholder="Search by client code, phone number, source..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                ...darkInputStyle,
                                paddingLeft: '40px',
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: '10px'
                            }}
                        />
                    </div>
                    <button type="submit" className="primary-btn" style={{ padding: '0 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '700' }}>
                        Search
                    </button>
                </form>

                {/* Filters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Sales Person Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Users size={14} color="#38bdf8" />
                        <select
                            value={salesPersonFilter}
                            onChange={e => {
                                setSalesPersonFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                fontSize: '12px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="All" style={{ background: '#0f172a' }}>Filter by Sales Person</option>
                            {salesPersonsList.map(sp => (
                                <option key={sp} value={sp} style={{ background: '#0f172a' }}>{sp}</option>
                            ))}
                        </select>
                    </div>

                    {/* Source Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Filter size={14} color="var(--primary)" />
                        <select
                            value={sourceFilter}
                            onChange={e => {
                                setSourceFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                fontSize: '12px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="All" style={{ background: '#0f172a' }}>Filter by Source</option>
                            {LEAD_SOURCES.map(src => (
                                <option key={src} value={src} style={{ background: '#0f172a' }}>{src}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* 4. Leads Table Matching Reference Design */}
            <div className="glass-card" style={{ padding: '0', overflowX: 'auto', borderRadius: '14px' }}>
                <table style={{ width: '100%', color: 'white', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <tr>
                            <th style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.3px' }}>
                                Lead Created ↕
                            </th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.3px' }}>
                                Client Code ↕
                            </th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.3px' }}>
                                Source ↕
                            </th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.3px' }}>
                                Travel Month ↕
                            </th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.3px' }}>
                                Price ↕
                            </th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.3px' }}>
                                Status ↕
                            </th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', fontSize: '12px', color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '60px' }}>
                                    <div className="loader" style={{ margin: '0 auto' }}></div>
                                    <div style={{ marginTop: '12px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Loading leads...</div>
                                </td>
                            </tr>
                        ) : paginatedLeads.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.5)' }}>
                                    No leads found for this filter. Click <strong>+ Create a Lead</strong> to get started!
                                </td>
                            </tr>
                        ) : paginatedLeads.map((lead) => {
                            const travelInfo = formatTravelMonth(lead.travelStartDate, lead.travelEndDate);

                            return (
                                <tr key={lead._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s ease' }}>
                                    {/* 1. Lead Created */}
                                    <td style={{ padding: '16px 20px', fontSize: '13px', color: 'rgba(255,255,255,0.9)' }}>
                                        {formatCreatedDate(lead.leadDate || lead.createdAt)}
                                    </td>

                                    {/* 2. Client Code (MM/SS with Tooltip) */}
                                    <td style={{ padding: '16px 20px', position: 'relative' }}>
                                        <div
                                            style={{ position: 'relative', display: 'inline-block' }}
                                            onMouseEnter={() => setHoveredLeadId(lead._id)}
                                            onMouseLeave={() => setHoveredLeadId(null)}
                                        >
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                color: '#38bdf8',
                                                fontWeight: '900',
                                                fontSize: '15px',
                                                cursor: 'pointer'
                                            }}>
                                                <User size={15} color="#38bdf8" />
                                                <span>{lead.clientCode || lead.leadId || 'N/A'}</span>
                                            </div>

                                            {/* Hover Tooltip matching Image 1 */}
                                            {hoveredLeadId === lead._id && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '110%',
                                                    left: '0',
                                                    background: '#0a0f1d',
                                                    border: '1px solid rgba(56, 189, 248, 0.4)',
                                                    borderRadius: '8px',
                                                    padding: '8px 12px',
                                                    boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
                                                    zIndex: 100,
                                                    minWidth: '150px'
                                                }}>
                                                    <div style={{ color: '#f1f5f9', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <User size={11} color="#38bdf8" /> {lead.clientName}
                                                    </div>
                                                    <div style={{ color: '#38bdf8', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                                                        <Phone size={11} /> {lead.mobileNumber}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* 3. Source */}
                                    <td style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '600' }}>
                                        {renderSourceIcon(lead.source)}
                                    </td>

                                    {/* 4. Travel Month */}
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontSize: '13px', color: 'white', fontWeight: '700' }}>
                                            {travelInfo.month}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                            Days: {travelInfo.days}
                                        </div>
                                    </td>

                                    {/* 5. Price */}
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontWeight: '900', color: 'white', fontSize: '15px' }}>
                                            ₹{(lead.totalAmount || 0).toLocaleString('en-IN')}
                                        </div>
                                    </td>

                                    {/* 6. Status */}
                                    <td style={{ padding: '16px 20px' }}>
                                        {renderStatusPill(lead.status)}
                                    </td>

                                    {/* 7. Actions */}
                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                            {/* Book action if not confirmed */}
                                            {lead.status !== 'Confirmed' && (
                                                <button
                                                    onClick={() => {
                                                        setConvertingLead(lead);
                                                        setAdvancePayment('');
                                                        setPaymentRef('');
                                                        setAdminOverride(false);
                                                        setShowConvertModal(true);
                                                    }}
                                                    title="Convert to Confirmed Booking"
                                                    style={{
                                                        background: 'rgba(34, 197, 94, 0.2)',
                                                        color: '#4ade80',
                                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                                        padding: '6px 10px',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontWeight: '700',
                                                        fontSize: '11px'
                                                    }}
                                                >
                                                    <CheckCircle size={13} /> Book
                                                </button>
                                            )}

                                            {/* Quotation PDF */}
                                            <button
                                                onClick={() => generateQuotationPDF(lead)}
                                                title="Download Quotation PDF"
                                                style={{
                                                    background: 'rgba(59, 130, 246, 0.15)',
                                                    color: '#60a5fa',
                                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                                    padding: '6px 8px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <FileText size={14} />
                                            </button>

                                            {/* Edit */}
                                            <button
                                                onClick={() => handleOpenModal(lead)}
                                                title="Edit Lead"
                                                style={{
                                                    background: 'rgba(255,255,255,0.06)',
                                                    border: 'none',
                                                    color: '#f1f5f9',
                                                    padding: '6px 8px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <Edit size={14} />
                                            </button>

                                            {/* Delete */}
                                            <button
                                                onClick={() => handleDelete(lead._id)}
                                                title="Delete Lead"
                                                style={{
                                                    background: 'rgba(239,68,68,0.12)',
                                                    border: 'none',
                                                    color: '#ef4444',
                                                    padding: '6px 8px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* 5. Pagination Bar matching Reference Design */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 4px',
                marginTop: '10px',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '13px'
            }}>
                <div>
                    Showing {paginatedLeads.length} of {filteredLeads.length} leads
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.04)',
                            color: 'white',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: currentPage === 1 ? 0.4 : 1
                        }}
                    >
                        <ChevronLeft size={16} />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button
                            key={p}
                            onClick={() => setCurrentPage(p)}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                border: 'none',
                                background: currentPage === p ? '#fbbf24' : 'rgba(255,255,255,0.06)',
                                color: currentPage === p ? '#000' : 'white',
                                fontWeight: currentPage === p ? '800' : '600',
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            {p}
                        </button>
                    ))}

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.04)',
                            color: 'white',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: currentPage === totalPages ? 0.4 : 1
                        }}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 6. MODAL: Create / Edit Lead & Quotation (Exact Pixel Mockup Alignment)   */}
            {/* ========================================================================= */}
            <AnimatePresence>
                {showModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.82)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 9999,
                        padding: '16px'
                    }}>
                        <motion.div
                            initial={{ y: 20, opacity: 0, scale: 0.98 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 20, opacity: 0, scale: 0.98 }}
                            style={{
                                width: '100%',
                                maxWidth: '1020px',
                                maxHeight: '94vh',
                                overflowY: 'auto',
                                background: '#090f1d',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '18px',
                                padding: '26px 30px',
                                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
                                color: '#f8fafc'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '14px',
                                marginBottom: '22px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                paddingBottom: '18px'
                            }}>
                                <h2 style={{ color: 'white', margin: 0, fontSize: '22px', fontWeight: '800' }}>
                                    {editingLead ? 'Edit Lead & Quotation' : 'Create New Lead & Quotation'}
                                </h2>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {/* LEAD ID Badge */}
                                    <div style={{
                                        border: '1px solid rgba(56, 189, 248, 0.3)',
                                        background: 'rgba(56, 189, 248, 0.06)',
                                        borderRadius: '8px',
                                        padding: '6px 14px',
                                        textAlign: 'left'
                                    }}>
                                        <div style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            LEAD ID <Info size={10} color="#38bdf8" />
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: '900', color: '#38bdf8', marginTop: '2px' }}>
                                            {previewClientCode || formData.clientCode || '01/01'}
                                        </div>
                                    </div>

                                    {/* DATE OF LEAD Box */}
                                    <div style={{
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        borderRadius: '8px',
                                        padding: '6px 14px',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}>
                                        <div style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.5)' }}>
                                            DATE OF LEAD
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                            <Calendar size={13} color="var(--primary)" />
                                            <input
                                                type="date"
                                                value={formData.leadDate}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFormData({ ...formData, leadDate: val });
                                                    fetchNextClientCodePreview(val);
                                                }}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'white',
                                                    fontSize: '13px',
                                                    fontWeight: '700',
                                                    outline: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Close Button */}
                                    <button
                                        onClick={() => setShowModal(false)}
                                        style={{
                                            background: 'rgba(255,255,255,0.06)',
                                            border: 'none',
                                            color: 'rgba(255,255,255,0.8)',
                                            width: '34px',
                                            height: '34px',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Duplicate Phone Warning Banner */}
                            {phoneCheckResult && phoneCheckResult.exists && (
                                <div style={{
                                    background: 'rgba(234, 179, 8, 0.1)',
                                    border: '1px solid rgba(234, 179, 8, 0.3)',
                                    borderRadius: '10px',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    marginBottom: '20px'
                                }}>
                                    <AlertTriangle size={18} color="#facc15" />
                                    <div style={{ fontSize: '12px', color: '#fef08a' }}>
                                        <strong>Existing Customer Detected:</strong> This phone number has {phoneCheckResult.count} previous lead(s)/booking(s) on file.
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                                {/* ========================================== */}
                                {/* SECTION 1: CLIENT & SOURCE DETAILS        */}
                                {/* ========================================== */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <span style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            background: '#fbbf24',
                                            color: '#000',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: '900',
                                            fontSize: '11px'
                                        }}>
                                            1
                                        </span>
                                        <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: '800', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                                            Client & Source Details
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                                        <div>
                                            <label style={labelStyle}>Guest / Client Name *</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.clientName}
                                                onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                                                style={darkInputStyle}
                                                placeholder="e.g. Rahul Sharma"
                                            />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Mobile Number *</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.mobileNumber}
                                                onChange={handleMobileChange}
                                                style={darkInputStyle}
                                                placeholder="e.g. 9876543210"
                                            />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Enquiry Source</label>
                                            <select
                                                value={formData.source}
                                                onChange={e => setFormData({ ...formData, source: e.target.value })}
                                                style={{ ...darkInputStyle, cursor: 'pointer' }}
                                            >
                                                {LEAD_SOURCES.map(src => <option key={src} value={src} style={{ background: '#090f1d' }}>{src}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={labelStyle}>GST Mode</label>
                                            <select
                                                value={formData.gstMode}
                                                onChange={e => setFormData({ ...formData, gstMode: e.target.value })}
                                                style={{ ...darkInputStyle, cursor: 'pointer' }}
                                            >
                                                {GST_MODES.map(mode => <option key={mode} value={mode} style={{ background: '#090f1d' }}>{mode}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* ========================================== */}
                                {/* SECTION 2: TRAVEL & QUOTATION DETAILS     */}
                                {/* ========================================== */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <span style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            background: '#fbbf24',
                                            color: '#000',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: '900',
                                            fontSize: '11px'
                                        }}>
                                            2
                                        </span>
                                        <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: '800', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                                            Travel & Quotation Details
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                                        <div>
                                            <label style={labelStyle}>Travel Start Date *</label>
                                            <input
                                                required
                                                type="date"
                                                value={formData.travelStartDate}
                                                onChange={e => handleTravelDateChange('travelStartDate', e.target.value)}
                                                style={darkInputStyle}
                                            />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Travel End Date *</label>
                                            <input
                                                required
                                                type="date"
                                                value={formData.travelEndDate}
                                                onChange={e => handleTravelDateChange('travelEndDate', e.target.value)}
                                                style={darkInputStyle}
                                            />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Vehicle Model *</label>
                                            <select
                                                value={formData.carType}
                                                onChange={e => setFormData({ ...formData, carType: e.target.value })}
                                                style={{ ...darkInputStyle, cursor: 'pointer' }}
                                            >
                                                {VEHICLE_OPTIONS.map(v => (
                                                    <option key={v} value={v} style={{ background: '#090f1d' }}>{v}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Number of Vehicles *</label>
                                            <input
                                                required
                                                type="number"
                                                min="1"
                                                value={formData.numberOfCars}
                                                onChange={e => setFormData({ ...formData, numberOfCars: Number(e.target.value) || 1 })}
                                                style={darkInputStyle}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ========================================== */}
                                {/* SECTION 3: DAY-WISE ITINERARY & PRICING    */}
                                {/* ========================================== */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <span style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            background: '#fbbf24',
                                            color: '#000',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: '900',
                                            fontSize: '11px'
                                        }}>
                                            3
                                        </span>
                                        <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: '800', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                                            Day-wise Itinerary & Pricing
                                        </span>
                                    </div>

                                    {/* Day-wise Table */}
                                    <div style={{
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        overflowX: 'auto'
                                    }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '820px' }}>
                                            <thead style={{ background: '#0a101d', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                                <tr>
                                                    <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>DAY</th>
                                                    <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>DATE</th>
                                                    <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>TIME (Optional) ⓘ</th>
                                                    <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>APG ⓘ</th>
                                                    <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>ROUTE / ITINERARY</th>
                                                    <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>VEHICLE</th>
                                                    <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>QTY</th>
                                                    <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>RATE (₹)</th>
                                                    <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>AMOUNT (₹)</th>
                                                    <th style={{ padding: '12px 10px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>ACTION</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.itinerary.map((day, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        {/* DAY Badge */}
                                                        <td style={{ padding: '10px' }}>
                                                            <span style={{
                                                                background: '#fbbf24',
                                                                color: '#000',
                                                                fontWeight: '900',
                                                                fontSize: '11px',
                                                                padding: '4px 8px',
                                                                borderRadius: '6px',
                                                                display: 'inline-block'
                                                            }}>
                                                                D{day.dayNo || idx + 1}
                                                            </span>
                                                        </td>

                                                        {/* DATE */}
                                                        <td style={{ padding: '10px', minWidth: '130px' }}>
                                                            <input
                                                                type="date"
                                                                value={day.date ? new Date(day.date).toISOString().split('T')[0] : ''}
                                                                onChange={e => handleItineraryRowChange(idx, 'date', e.target.value)}
                                                                style={{ ...darkInputStyle, padding: '6px 8px', fontSize: '12px' }}
                                                            />
                                                        </td>

                                                        {/* TIME */}
                                                        <td style={{ padding: '10px', minWidth: '110px' }}>
                                                            <input
                                                                type="text"
                                                                placeholder="09:00 AM"
                                                                value={day.isApg ? 'APG' : (day.time || '')}
                                                                disabled={day.isApg}
                                                                onChange={e => handleItineraryRowChange(idx, 'time', e.target.value)}
                                                                style={{
                                                                    ...darkInputStyle,
                                                                    padding: '6px 8px',
                                                                    fontSize: '12px',
                                                                    color: day.isApg ? '#fbbf24' : 'white',
                                                                    fontWeight: day.isApg ? '800' : 'normal'
                                                                }}
                                                            />
                                                        </td>

                                                        {/* APG Checkbox */}
                                                        <td style={{ padding: '10px', textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={!!day.isApg}
                                                                onChange={e => handleItineraryRowChange(idx, 'isApg', e.target.checked)}
                                                                style={{
                                                                    width: '16px',
                                                                    height: '16px',
                                                                    accentColor: '#fbbf24',
                                                                    cursor: 'pointer'
                                                                }}
                                                            />
                                                        </td>

                                                        {/* ROUTE / ITINERARY */}
                                                        <td style={{ padding: '10px', minWidth: '220px' }}>
                                                            <input
                                                                required
                                                                type="text"
                                                                placeholder="e.g. Airport Pickup & Local Sightseeing"
                                                                value={day.duty || day.description || ''}
                                                                onChange={e => handleItineraryRowChange(idx, 'duty', e.target.value)}
                                                                style={{ ...darkInputStyle, padding: '6px 10px', fontSize: '12px' }}
                                                            />
                                                        </td>

                                                        {/* VEHICLE */}
                                                        <td style={{ padding: '10px', minWidth: '140px' }}>
                                                            <select
                                                                value={day.vehicleType || formData.carType}
                                                                onChange={e => handleItineraryRowChange(idx, 'vehicleType', e.target.value)}
                                                                style={{ ...darkInputStyle, padding: '6px 8px', fontSize: '12px', cursor: 'pointer' }}
                                                            >
                                                                {VEHICLE_OPTIONS.map(v => (
                                                                    <option key={v} value={v} style={{ background: '#090f1d' }}>{v}</option>
                                                                ))}
                                                            </select>
                                                        </td>

                                                        {/* QTY */}
                                                        <td style={{ padding: '10px', width: '65px' }}>
                                                            <input
                                                                required
                                                                type="number"
                                                                min="1"
                                                                value={day.quantity || day.vehicleCount || 1}
                                                                onChange={e => handleItineraryRowChange(idx, 'quantity', e.target.value)}
                                                                style={{ ...darkInputStyle, padding: '6px 8px', fontSize: '12px', textAlign: 'center' }}
                                                            />
                                                        </td>

                                                        {/* RATE (₹) */}
                                                        <td style={{ padding: '10px', width: '90px' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                placeholder="0"
                                                                value={day.rate ?? 0}
                                                                onChange={e => handleItineraryRowChange(idx, 'rate', e.target.value)}
                                                                style={{ ...darkInputStyle, padding: '6px 8px', fontSize: '12px', textAlign: 'right' }}
                                                            />
                                                        </td>

                                                        {/* AMOUNT (₹) */}
                                                        <td style={{ padding: '10px', width: '95px' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={day.amount ?? 0}
                                                                onChange={e => handleItineraryRowChange(idx, 'amount', e.target.value)}
                                                                style={{ ...darkInputStyle, padding: '6px 8px', fontSize: '12px', textAlign: 'right', fontWeight: '700' }}
                                                            />
                                                        </td>

                                                        {/* ACTION */}
                                                        <td style={{ padding: '10px', textAlign: 'center' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeItineraryDay(idx)}
                                                                style={{
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    color: '#ef4444',
                                                                    cursor: 'pointer',
                                                                    padding: '4px'
                                                                }}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Bottom Sub-bar: + Add Another Day & Total */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginTop: '12px',
                                        flexWrap: 'wrap',
                                        gap: '12px'
                                    }}>
                                        <button
                                            type="button"
                                            onClick={addAnotherDay}
                                            style={{
                                                background: 'rgba(245, 158, 11, 0.08)',
                                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                                color: 'var(--primary)',
                                                borderRadius: '8px',
                                                padding: '8px 18px',
                                                fontSize: '13px',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <Plus size={16} /> Add Another Day
                                        </button>

                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            background: '#0a101d',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '10px',
                                            padding: '8px 20px'
                                        }}>
                                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                                                Total Quoted Fare ({formData.gstMode})
                                            </span>
                                            <span style={{ fontSize: '22px', fontWeight: '900', color: '#fbbf24' }}>
                                                ₹{formData.totalAmount.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* ========================================== */}
                                {/* SECTION 4: REMARKS & INCLUSIONS (2-COL)   */}
                                {/* ========================================== */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                                    {/* Left: Any Remark / Special Request of Guest */}
                                    <div style={{
                                        background: '#0a101d',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        padding: '16px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'white' }}>
                                                Any Remark / Special Request of Guest
                                            </span>
                                            <Info size={13} color="rgba(255,255,255,0.4)" />
                                        </div>

                                        <textarea
                                            maxLength={500}
                                            rows={4}
                                            placeholder="e.g. Have elderly travellers, need wheelchair assistance at airport. Prefer Non-AC for hill areas. Any other special request..."
                                            value={formData.specialRemarks}
                                            onChange={e => setFormData({ ...formData, specialRemarks: e.target.value })}
                                            style={{
                                                ...darkInputStyle,
                                                resize: 'none',
                                                lineHeight: '1.5',
                                                background: 'transparent',
                                                border: 'none',
                                                padding: 0
                                            }}
                                        />

                                        <div style={{ textAlign: 'right', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
                                            {(formData.specialRemarks || '').length}/500
                                        </div>
                                    </div>

                                    {/* Right: Trip Inclusion Remarks */}
                                    <div style={{
                                        background: '#0a101d',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        padding: '16px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'white' }}>
                                                Trip Inclusion Remarks
                                            </span>
                                            <Info size={13} color="rgba(255,255,255,0.4)" />
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {[
                                                { key: 'driverAllowance', label: 'Driver allowance included' },
                                                { key: 'nightAllowance', label: 'Night allowance included' },
                                                { key: 'tollParking', label: 'Toll & parking charges included' },
                                                { key: 'gstIncluded', label: 'GST prices included' }
                                            ].map(({ key, label }) => (
                                                <label
                                                    key={key}
                                                    onClick={() => handleInclusionToggle(key)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        fontSize: '13px',
                                                        color: formData.inclusions?.[key] ? '#f1f5f9' : 'rgba(255,255,255,0.5)',
                                                        cursor: 'pointer',
                                                        userSelect: 'none'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '4px',
                                                        background: formData.inclusions?.[key] ? '#fbbf24' : 'rgba(255,255,255,0.08)',
                                                        border: `1px solid ${formData.inclusions?.[key] ? '#fbbf24' : 'rgba(255,255,255,0.2)'}`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#000',
                                                        fontSize: '12px',
                                                        fontWeight: '900'
                                                    }}>
                                                        {formData.inclusions?.[key] && '✓'}
                                                    </div>
                                                    <span>{label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* ========================================== */}
                                {/* FOOTER ACTIONS                            */}
                                {/* ========================================== */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingTop: '16px',
                                    borderTop: '1px solid rgba(255,255,255,0.08)',
                                    flexWrap: 'wrap',
                                    gap: '14px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'rgba(255,255,255,0.5)' }}>
                                        <Info size={14} color="#38bdf8" />
                                        <span>Rates and amounts are indicative. You can modify them as per the discussion with the client.</span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            style={{
                                                padding: '10px 22px',
                                                background: '#0a101d',
                                                color: 'white',
                                                border: '1px solid rgba(255,255,255,0.15)',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            style={{
                                                padding: '10px 24px',
                                                background: '#fbbf24',
                                                color: '#000',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 14px rgba(251, 191, 36, 0.3)'
                                            }}
                                        >
                                            {editingLead ? 'Update Lead' : 'Save & Generate Lead'}
                                        </button>
                                    </div>
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
                                    Convert <strong>{convertingLead.clientName}</strong> (Client Code: <strong>{convertingLead.clientCode || convertingLead.leadId}</strong>) into an official confirmed booking.
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
                                        style={{ ...darkInputStyle, fontSize: '16px', fontWeight: 'bold' }}
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
                                    <input type="text" placeholder="e.g. UTR12345678" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} style={darkInputStyle} />
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
                                            style={{ ...darkInputStyle, marginTop: '8px', fontSize: '12px' }}
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
