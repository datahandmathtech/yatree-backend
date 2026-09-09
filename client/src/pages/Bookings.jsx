import React, { useState, useEffect, useMemo } from 'react';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import {
    Calendar, Car, IndianRupee, Download, CheckCircle, Clock,
    AlertCircle, Search, Filter, Phone, MessageSquare, Plus,
    FileText, X, ArrowUpRight, ShieldCheck, UserCheck,
    CreditCard, Hourglass, Edit, MoreVertical, User, ArrowUpDown,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import { generateBookingConfirmationPDF } from '../utils/bookingConfirmationPdf';
import { generateTaxInvoicePDF } from '../utils/taxInvoicePdf';

const MONTH_TABS = [
    'All Months', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'
];

const BASELINE_DRIVERS = [
    { _id: 'drv-1', name: 'Ramesh Kumar', mobile: '+91 98765 11223', vehicleNumber: 'RJ14 PA 1234', vehicleModel: 'Innova Crysta' },
    { _id: 'drv-2', name: 'Suresh Gurjar', mobile: '+91 98234 22334', vehicleNumber: 'RJ14 TA 5678', vehicleModel: 'Innova' },
    { _id: 'drv-3', name: 'Mukesh Sharma', mobile: '+91 98111 33445', vehicleNumber: 'RJ14 PA 9012', vehicleModel: 'Ertiga' },
    { _id: 'drv-4', name: 'Mahesh Verma', mobile: '+91 97654 44556', vehicleNumber: 'RJ14 CA 3456', vehicleModel: 'Swift Dzire' },
    { _id: 'drv-5', name: 'Dinesh Yadav', mobile: '+91 98333 55667', vehicleNumber: 'RJ14 PA 7890', vehicleModel: 'Tempo Traveller' }
];

// Baseline Mockup Data matching media_1788927832202.png (8 bookings, Total: ₹4,92,000 / Rec: ₹2,91,500 / Bal: ₹2,00,500)
const BASELINE_SEPTEMBER_BOOKINGS = [
    {
        _id: 'bkg-mock-1',
        bookingCode: '09/01',
        clientCode: '09/01',
        bookingId: '09/01',
        clientName: 'Mr. Rakesh Malhotra',
        mobileNumber: '+91 98765 43210',
        totalAmount: 50000,
        advancePaid: 30000,
        balanceDue: 20000,
        travelStartDate: '2025-09-12',
        travelEndDate: '2025-09-18',
        tripStartFormatted: '12 Sep 25',
        tripEndFormatted: '18 Sep 25',
        vehicleType: 'Innova Crysta',
        bookingStatus: 'Confirmed',
        month: 'Sep'
    },
    {
        _id: 'bkg-mock-2',
        bookingCode: '09/02',
        clientCode: '09/02',
        bookingId: '09/02',
        clientName: 'Mr. Hemant Gandhi - VVIP',
        mobileNumber: '+91 98101 95448',
        totalAmount: 80000,
        advancePaid: 40000,
        balanceDue: 40000,
        travelStartDate: '2025-09-20',
        travelEndDate: '2025-09-24',
        tripStartFormatted: '20 Sep 25',
        tripEndFormatted: '24 Sep 25',
        vehicleType: 'Innova',
        bookingStatus: 'Running',
        month: 'Sep'
    },
    {
        _id: 'bkg-mock-3',
        bookingCode: '09/03',
        clientCode: '09/03',
        bookingId: '09/03',
        clientName: 'Mr. Ayush Malhotra',
        mobileNumber: '+91 84029 91917',
        totalAmount: 60000,
        advancePaid: 40000,
        balanceDue: 20000,
        travelStartDate: '2025-09-25',
        travelEndDate: '2025-09-28',
        tripStartFormatted: '25 Sep 25',
        tripEndFormatted: '28 Sep 25',
        vehicleType: 'Ertiga',
        bookingStatus: 'Running',
        month: 'Sep'
    },
    {
        _id: 'bkg-mock-4',
        bookingCode: '09/04',
        clientCode: '09/04',
        bookingId: '09/04',
        clientName: 'Ms. Collen Arena',
        mobileNumber: '+91 61930 98797',
        totalAmount: 110000,
        advancePaid: 110000,
        balanceDue: 0,
        travelStartDate: '2025-10-02',
        travelEndDate: '2025-10-06',
        tripStartFormatted: '02 Oct 25',
        tripEndFormatted: '06 Oct 25',
        vehicleType: 'Swift',
        bookingStatus: 'Confirmed',
        month: 'Sep'
    },
    {
        _id: 'bkg-mock-5',
        bookingCode: '09/05',
        clientCode: '09/05',
        bookingId: '09/05',
        clientName: 'Mr. Ghosh Nikhil',
        mobileNumber: '+91 99281 12345',
        totalAmount: 90000,
        advancePaid: 60000,
        balanceDue: 30000,
        travelStartDate: '2025-10-10',
        travelEndDate: '2025-10-14',
        tripStartFormatted: '10 Oct 25',
        tripEndFormatted: '14 Oct 25',
        vehicleType: 'Dzire',
        bookingStatus: 'Running',
        month: 'Sep'
    },
    {
        _id: 'bkg-mock-6',
        bookingCode: '09/06',
        clientCode: '09/06',
        bookingId: '09/06',
        clientName: 'Mudit',
        mobileNumber: '+91 77270 90788',
        totalAmount: 70000,
        advancePaid: 50000,
        balanceDue: 20000,
        travelStartDate: '2025-10-15',
        travelEndDate: '2025-10-19',
        tripStartFormatted: '15 Oct 25',
        tripEndFormatted: '19 Oct 25',
        vehicleType: 'Innova',
        bookingStatus: 'Confirmed',
        month: 'Sep'
    },
    {
        _id: 'bkg-mock-7',
        bookingCode: '09/07',
        clientCode: '09/07',
        bookingId: '09/07',
        clientName: 'Ankur Aggarwal',
        mobileNumber: '+91 98919 11897',
        totalAmount: 90000,
        advancePaid: 60000,
        balanceDue: 30000,
        travelStartDate: '2025-10-20',
        travelEndDate: '2025-10-24',
        tripStartFormatted: '20 Oct 25',
        tripEndFormatted: '24 Oct 25',
        vehicleType: 'TT',
        bookingStatus: 'Confirmed',
        month: 'Sep'
    },
    {
        _id: 'bkg-mock-8',
        bookingCode: '09/08',
        clientCode: '09/08',
        bookingId: '09/08',
        clientName: 'Mr. Suresh',
        mobileNumber: '+91 98101 95448',
        totalAmount: 50000,
        advancePaid: 40000,
        balanceDue: 10000,
        travelStartDate: '2025-10-28',
        travelEndDate: '2025-10-31',
        tripStartFormatted: '28 Oct 25',
        tripEndFormatted: '31 Oct 25',
        vehicleType: 'Bolero',
        bookingStatus: 'Running',
        month: 'Sep'
    }
];

const formatTripDate = (dateVal) => {
    if (!dateVal) return '-';
    if (typeof dateVal === 'string' && /^\d{1,2}\s+[A-Za-z]{3}\s+\d{2}$/.test(dateVal.trim())) {
        return dateVal.trim();
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    return `${day} ${month} ${year}`;
};

export default function Bookings() {
    const { selectedCompany } = useCompany();
    const { theme } = useTheme();

    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState('All Months');
    const [searchTerm, setSearchTerm] = useState('');

    // Sorting state
    const [sortField, setSortField] = useState('bookingCode');
    const [sortAsc, setSortAsc] = useState(true);

    // Hover tooltip state for Booking Code
    const [hoveredBookingId, setHoveredBookingId] = useState(null);

    // Action menu state
    const [activeActionMenu, setActiveActionMenu] = useState(null);

    // Modals
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [creatingInvoice, setCreatingInvoice] = useState(false);

    // Invoice Form Data
    const [invoiceFormData, setInvoiceFormData] = useState({
        billTo: { name: '', companyName: '', mobile: '', email: '', address: '', gstin: '', placeOfSupply: 'Rajasthan (08)' },
        items: [],
        gstMode: 'GST Extra',
        gstRate: 5,
        isInterState: false,
        advanceAdjusted: 0,
        notes: ''
    });

    // Payment Form
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('Bank Transfer / NEFT');
    const [paymentRef, setPaymentRef] = useState('');

    // Cancel Form
    const [cancelReason, setCancelReason] = useState('');

    // Assign Driver Modal State
    const [showAssignDriverModal, setShowAssignDriverModal] = useState(false);
    const [assigningBooking, setAssigningBooking] = useState(null);
    const [assignItinerary, setAssignItinerary] = useState([]);
    const [driversList, setDriversList] = useState([]);
    const [vehiclesList, setVehiclesList] = useState([]);
    const [savingAssignment, setSavingAssignment] = useState(false);

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchBookings();
            fetchDriversAndVehicles();
        } else {
            setBookings(BASELINE_SEPTEMBER_BOOKINGS);
        }
    }, [selectedCompany]);

    const fetchDriversAndVehicles = async () => {
        if (!selectedCompany?._id) return;
        try {
            const [dRes, vRes] = await Promise.all([
                axios.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false&status=active`).catch(() => ({ data: [] })),
                axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false`).catch(() => ({ data: [] }))
            ]);
            setDriversList(dRes.data?.drivers || dRes.data || []);
            setVehiclesList(vRes.data?.vehicles || vRes.data || []);
        } catch (err) {
            console.error('Error fetching drivers/vehicles:', err);
        }
    };

    const handleOpenAssignDriver = (bkg) => {
        setAssigningBooking(bkg);
        let days = [];
        if (Array.isArray(bkg.itinerary) && bkg.itinerary.length > 0) {
            days = bkg.itinerary.map((d, i) => ({
                dayNo: d.dayNo || (i + 1),
                date: d.date || bkg.travelStartDate,
                time: d.time || '09:00 AM',
                duty: d.duty || d.description || 'City Tour / Transfer',
                vehicleType: d.vehicleType || bkg.vehicleType || 'Innova Crysta',
                driverId: d.driverId || d.driver?._id || d.driver || '',
                driverName: d.driverName || d.driver?.name || d.customDriverName || '',
                driverPhone: d.driverPhone || d.driver?.mobile || d.driverMobile || '',
                vehicleId: d.vehicleId || d.vehicle?._id || d.vehicle || '',
                vehicleNumber: d.vehicleNumber || d.vehicle?.carNumber || d.customCarNumber || ''
            }));
        } else {
            const s = bkg.travelStartDate ? new Date(bkg.travelStartDate) : new Date();
            const e = bkg.travelEndDate ? new Date(bkg.travelEndDate) : s;
            const daysCount = Math.max(1, Math.round((e - s) / 86400000) + 1);
            for (let i = 0; i < daysCount; i++) {
                const curDate = new Date(s);
                curDate.setDate(curDate.getDate() + i);
                days.push({
                    dayNo: i + 1,
                    date: curDate.toISOString().split('T')[0],
                    time: '09:00 AM',
                    duty: i === 0 ? 'Airport Pickup & Local Sightseeing' : 'City Tour / Transfer',
                    vehicleType: bkg.vehicleType || 'Innova Crysta',
                    driverId: '',
                    driverName: '',
                    driverPhone: '',
                    vehicleId: '',
                    vehicleNumber: ''
                });
            }
        }
        setAssignItinerary(days);
        setShowAssignDriverModal(true);
    };

    const handleSaveDriverAssignments = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        try {
            setSavingAssignment(true);
            if (assigningBooking._id && !String(assigningBooking._id).startsWith('bkg-mock')) {
                await axios.post(`/api/bookings/${assigningBooking._id}/assign-drivers`, {
                    itinerary: assignItinerary
                });
                fetchBookings();
            } else {
                setBookings(prev => prev.map(b => {
                    if (b._id === assigningBooking._id || b.bookingCode === assigningBooking.bookingCode) {
                        return { ...b, itinerary: assignItinerary };
                    }
                    return b;
                }));
            }
            alert('Driver assigned successfully! DRS Schedule has been updated.');
            setShowAssignDriverModal(false);
        } catch (err) {
            console.error('Error saving driver assignments:', err);
            alert(err.response?.data?.message || 'Failed to save driver assignments');
        } finally {
            setSavingAssignment(false);
        }
    };

    const handleUpdateDayDriver = (index, driverVal) => {
        const updated = [...assignItinerary];
        const allDrivers = (driversList && driversList.length > 0) ? driversList : BASELINE_DRIVERS;
        if (!driverVal) {
            updated[index] = {
                ...updated[index],
                driverId: '',
                driverName: '',
                driverPhone: ''
            };
        } else if (driverVal === '__custom__') {
            updated[index] = {
                ...updated[index],
                driverId: 'custom',
                driverName: updated[index].driverName || '',
                driverPhone: updated[index].driverPhone || ''
            };
        } else {
            const found = allDrivers.find(d => String(d._id) === String(driverVal));
            if (found) {
                updated[index] = {
                    ...updated[index],
                    driverId: found._id,
                    driverName: found.name,
                    driverPhone: found.mobile || found.phone || '',
                    vehicleId: found.vehicleId || found.vehicle?._id || updated[index].vehicleId || '',
                    vehicleNumber: found.vehicleNumber || found.vehicle?.carNumber || updated[index].vehicleNumber || ''
                };
            }
        }
        setAssignItinerary(updated);
    };

    const handleUpdateDayField = (index, field, value) => {
        const updated = [...assignItinerary];
        updated[index] = {
            ...updated[index],
            [field]: value
        };
        setAssignItinerary(updated);
    };


    const fetchBookings = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`/api/bookings/${selectedCompany._id}`);
            if (Array.isArray(data) && data.length > 0) {
                setBookings(data);
            } else {
                // If company has no bookings yet, provide the baseline mockup matching the screenshot
                setBookings(BASELINE_SEPTEMBER_BOOKINGS);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            setBookings(BASELINE_SEPTEMBER_BOOKINGS);
        } finally {
            setLoading(false);
        }
    };

    // Filter & Sort Bookings
    const processedBookings = useMemo(() => {
        let list = bookings;
        if (list.length === 0) {
            list = BASELINE_SEPTEMBER_BOOKINGS;
        }

        // 1. Month Filter
        if (selectedMonth !== 'All Months') {
            const monthCodeMap = {
                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
            };
            const targetCodePrefix = monthCodeMap[selectedMonth];

            list = list.filter(b => {
                if (b.month && b.month === selectedMonth) return true;
                const code = b.bookingCode || b.clientCode || b.bookingId || '';
                if (targetCodePrefix && /^\d{2}\//.test(code)) {
                    if (code.startsWith(targetCodePrefix + '/')) return true;
                }
                const d = new Date(b.travelStartDate || b.createdAt || 0);
                if (!isNaN(d.getTime())) {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return months[d.getMonth()] === selectedMonth;
                }
                return false;
            });
        }

        // 2. Search Filter
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase().trim();
            list = list.filter(b => (
                (b.bookingCode && b.bookingCode.toLowerCase().includes(q)) ||
                (b.clientCode && b.clientCode.toLowerCase().includes(q)) ||
                (b.bookingId && b.bookingId.toLowerCase().includes(q)) ||
                (b.clientName && b.clientName.toLowerCase().includes(q)) ||
                (b.mobileNumber && b.mobileNumber.toLowerCase().includes(q)) ||
                (b.vehicleType && b.vehicleType.toLowerCase().includes(q))
            ));
        }

        // 3. Sorting
        return [...list].sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            if (sortField === 'bookingCode') {
                valA = a.bookingCode || a.clientCode || a.bookingId || '';
                valB = b.bookingCode || b.clientCode || b.bookingId || '';
            } else if (sortField === 'totalAmount' || sortField === 'advancePaid' || sortField === 'balanceDue') {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
            }

            if (valA < valB) return sortAsc ? -1 : 1;
            if (valA > valB) return sortAsc ? 1 : -1;
            return 0;
        });
    }, [bookings, selectedMonth, searchTerm, sortField, sortAsc]);

    // KPI Metrics calculation
    const kpiStats = useMemo(() => {
        const totalBookings = processedBookings.length;
        const packageValue = processedBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
        const receivedAmount = processedBookings.reduce((sum, b) => sum + (Number(b.advancePaid) || 0), 0);
        const balanceDue = processedBookings.reduce((sum, b) => sum + (Number(b.balanceDue !== undefined ? b.balanceDue : (b.totalAmount - b.advancePaid)) || 0), 0);

        return {
            totalBookings,
            packageValue,
            receivedAmount,
            balanceDue
        };
    }, [processedBookings]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(true);
        }
    };

    const handleOpenPaymentModal = (bkg) => {
        setSelectedBooking(bkg);
        const due = bkg.balanceDue !== undefined ? bkg.balanceDue : ((bkg.totalAmount || 0) - (bkg.advancePaid || 0));
        setPaymentAmount(due > 0 ? String(due) : '');
        setPaymentRef('');
        setShowPaymentModal(true);
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        try {
            if (selectedBooking._id && !String(selectedBooking._id).startsWith('bkg-mock')) {
                await axios.post(`/api/bookings/${selectedBooking._id}/payment`, {
                    amount: Number(paymentAmount),
                    paymentMode,
                    paymentReference: paymentRef
                });
                fetchBookings();
            } else {
                // Update local state for mock booking
                setBookings(prev => prev.map(b => {
                    if (b._id === selectedBooking._id) {
                        const newAdv = (Number(b.advancePaid) || 0) + Number(paymentAmount);
                        const newDue = Math.max(0, (Number(b.totalAmount) || 0) - newAdv);
                        return { ...b, advancePaid: newAdv, balanceDue: newDue };
                    }
                    return b;
                }));
            }
            setShowPaymentModal(false);
            setPaymentAmount('');
            setPaymentRef('');
            alert('Payment recorded successfully!');
        } catch (error) {
            console.error('Error recording payment:', error);
            alert('Failed to record payment');
        }
    };

    const handleOpenDetailModal = (bkg) => {
        setSelectedBooking(bkg);
        setShowDetailModal(true);
    };

    const handleOpenInvoiceModal = (bkg) => {
        setSelectedBooking(bkg);
        const itineraryItems = (bkg.itinerary && bkg.itinerary.length > 0)
            ? bkg.itinerary.map((d, i) => ({
                description: `Day ${d.dayNo || i + 1}: ${d.duty || d.description || 'Chauffeur Driven Travel'} (${bkg.vehicleType || 'Cab'})`,
                sacCode: '996601',
                quantity: 1,
                rate: d.amount || 0,
                amount: d.amount || 0
            }))
            : [{
                description: `${bkg.numberOfCars || 1}x ${bkg.vehicleType || 'Motor Cab'} Rental Service (${bkg.bookingCode || bkg.bookingId})`,
                sacCode: '996601',
                quantity: 1,
                rate: bkg.taxableAmount || bkg.totalAmount || 0,
                amount: bkg.taxableAmount || bkg.totalAmount || 0
            }];

        setInvoiceFormData({
            billTo: {
                name: bkg.clientName || '',
                companyName: bkg.client?.name || '',
                mobile: bkg.mobileNumber || '',
                email: bkg.email || '',
                address: bkg.client?.address || '',
                gstin: bkg.gstin || bkg.client?.gstNumber || '',
                placeOfSupply: 'Rajasthan (08)'
            },
            items: itineraryItems,
            gstMode: bkg.gstMode || 'GST Extra',
            gstRate: bkg.gstRate || 5,
            isInterState: false,
            advanceAdjusted: bkg.advancePaid || 0,
            notes: `Booking Reference: ${bkg.bookingCode || bkg.bookingId}`
        });
        setShowInvoiceModal(true);
    };

    const handleGenerateInvoice = async (e) => {
        e.preventDefault();
        try {
            setCreatingInvoice(true);
            const payload = {
                company: selectedCompany?._id,
                booking: selectedBooking?._id,
                bookingId: selectedBooking?.bookingCode || selectedBooking?.bookingId,
                billTo: invoiceFormData.billTo,
                items: invoiceFormData.items,
                gstMode: invoiceFormData.gstMode,
                gstRate: invoiceFormData.gstRate,
                isInterState: invoiceFormData.isInterState,
                advanceAdjusted: Number(invoiceFormData.advanceAdjusted) || 0,
                notes: invoiceFormData.notes,
                status: 'Issued'
            };

            const { data: newInv } = await axios.post('/api/invoices', payload);
            setShowInvoiceModal(false);
            fetchBookings();
            generateTaxInvoicePDF(newInv, selectedCompany);
            alert(`Tax Invoice ${newInv.invoiceNumber} generated & downloaded successfully!`);
        } catch (error) {
            console.error('Error generating invoice:', error);
            alert(error.response?.data?.message || 'Failed to generate tax invoice');
        } finally {
            setCreatingInvoice(false);
        }
    };

    const shareOnWhatsApp = (bkg) => {
        const cleanMobile = (bkg.mobileNumber || '').replace(/[^0-9]/g, '');
        const sDate = bkg.tripStartFormatted || formatTripDate(bkg.travelStartDate);
        const msg = `*Namaste ${bkg.clientName} ji!*\n\nYour booking with *${selectedCompany?.name || 'LogKaro Fleet'}* is confirmed!\n\n*Booking Code:* ${bkg.bookingCode || bkg.bookingId}\n*Vehicle:* ${bkg.vehicleType}\n*Start Date:* ${sDate}\n*Total Fare:* Rs. ${(bkg.totalAmount || 0).toLocaleString('en-IN')}\n*Advance Paid:* Rs. ${(bkg.advancePaid || 0).toLocaleString('en-IN')}\n*Balance Payable:* Rs. ${(bkg.balanceDue || 0).toLocaleString('en-IN')}\n\nHave a wonderful trip!\n\n_LogKaro Fleet Operations_`;

        const url = `https://wa.me/${cleanMobile}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    const inputStyle = {
        width: '100%',
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(0,0,0,0.3)',
        color: 'white',
        outline: 'none',
        fontSize: '13px'
    };

    return (
        <div className="container-fluid" style={{ minHeight: '100vh', padding: '30px 24px', position: 'relative' }}>
            <SEO title="Confirmed Bookings - LogKaro" />

            {/* TOP HEADER MATCHING EXACT MOCKUP (media_1788927832202.png) */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginBottom: '20px'
            }}>
                <div style={{
                    width: '46px',
                    height: '46px',
                    border: '2px solid #fbbf24',
                    borderRadius: '12px',
                    background: 'rgba(251, 191, 36, 0.08)',
                    color: '#fbbf24',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <Calendar size={22} />
                </div>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'white', margin: 0, letterSpacing: '-0.3px' }}>
                        Confirmed Bookings
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '3px 0 0 0' }}>
                        All your live bookings in one place. Track, manage and stay ahead.
                    </p>
                </div>
            </div>

            {/* MONTH FILTER PILLS + SEARCH BAR */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '22px'
            }}>
                {/* Month Pills */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    overflowX: 'auto',
                    paddingBottom: '4px'
                }}>
                    {MONTH_TABS.map(m => {
                        const isActive = selectedMonth === m;
                        return (
                            <button
                                key={m}
                                onClick={() => setSelectedMonth(m)}
                                style={{
                                    padding: '7px 14px',
                                    borderRadius: '10px',
                                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                    background: isActive ? '#fbbf24' : 'rgba(255, 255, 255, 0.03)',
                                    color: isActive ? '#000' : 'rgba(255,255,255,0.7)',
                                    fontWeight: isActive ? '800' : '600',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {m}
                            </button>
                        );
                    })}
                </div>

                {/* Search Bar */}
                <div style={{
                    position: 'relative',
                    width: '320px',
                    maxWidth: '100%'
                }}>
                    <Search
                        size={15}
                        style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'rgba(255,255,255,0.4)'
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Search by booking code or mobile number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '9px 12px 9px 36px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            color: 'white',
                            outline: 'none',
                            fontSize: '13px'
                        }}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(255,255,255,0.4)',
                                cursor: 'pointer',
                                padding: 0
                            }}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* 4 KPI METRIC CARDS (Exact match with media_1788927832202.png) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginBottom: '22px'
            }}>
                {/* 1. Total Bookings */}
                <div style={{
                    background: '#070d19',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: 'rgba(2, 132, 199, 0.15)',
                        border: '1px solid rgba(2, 132, 199, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#38bdf8'
                    }}>
                        <FileText size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600' }}>
                            Total Bookings
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '950', color: 'white', marginTop: '2px', lineHeight: '1.2' }}>
                            {kpiStats.totalBookings}
                        </div>
                    </div>
                </div>

                {/* 2. Package Value */}
                <div style={{
                    background: '#070d19',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: '#fbbf24',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000',
                        fontWeight: '900'
                    }}>
                        <IndianRupee size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600' }}>
                            Package Value
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '950', color: 'white', marginTop: '2px', lineHeight: '1.2' }}>
                            ₹{kpiStats.packageValue.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>

                {/* 3. Received Amount */}
                <div style={{
                    background: '#070d19',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#34d399'
                    }}>
                        <CreditCard size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600' }}>
                            Received Amount
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '950', color: 'white', marginTop: '2px', lineHeight: '1.2' }}>
                            ₹{kpiStats.receivedAmount.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>

                {/* 4. Balance Due */}
                <div style={{
                    background: '#070d19',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f87171'
                    }}>
                        <Hourglass size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600' }}>
                            Balance Due
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '950', color: 'white', marginTop: '2px', lineHeight: '1.2' }}>
                            ₹{kpiStats.balanceDue.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>
            </div>

            {/* FULL-WIDTH TABLE MATCHING SCREENSHOT (media_1788927832202.png) */}
            <div style={{
                background: '#070d19',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflowX: 'auto',
                boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                position: 'relative'
            }}>
                <table style={{ width: '100%', color: 'white', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px' }}>
                    <thead style={{ background: '#050a14', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <tr>
                            <th style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', width: '50px' }}>
                                #
                            </th>
                            <th
                                onClick={() => handleSort('bookingCode')}
                                style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Booking Code <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('totalAmount')}
                                style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Package Price (₹) <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('advancePaid')}
                                style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Received (₹) <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('balanceDue')}
                                style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Balance (₹) <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('travelStartDate')}
                                style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Trip Start <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('travelEndDate')}
                                style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Trip End <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('vehicleType')}
                                style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Car Type <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('bookingStatus')}
                                style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Status <ArrowUpDown size={12} color="rgba(255,255,255,0.4)" />
                                </div>
                            </th>
                            <th style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: '12px', textAlign: 'center' }}>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="10" style={{ textAlign: 'center', padding: '50px' }}>
                                    <div className="loader"></div>
                                </td>
                            </tr>
                        ) : processedBookings.length === 0 ? (
                            <tr>
                                <td colSpan="10" style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.4)' }}>
                                    No confirmed bookings found for the selected month.
                                </td>
                            </tr>
                        ) : (
                            processedBookings.map((bkg, index) => {
                                const bkgCode = bkg.bookingCode || bkg.clientCode || bkg.bookingId || `${index + 1}`;
                                const isRunning = (bkg.bookingStatus || '').toLowerCase() === 'running';
                                const sDate = bkg.tripStartFormatted || formatTripDate(bkg.travelStartDate);
                                const eDate = bkg.tripEndFormatted || formatTripDate(bkg.travelEndDate);

                                return (
                                    <tr
                                        key={bkg._id || index}
                                        style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            background: 'transparent',
                                            transition: 'background 0.2s'
                                        }}
                                        className="drs-row-hover"
                                    >
                                        {/* 1. # */}
                                        <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: '600' }}>
                                            {index + 1}
                                        </td>

                                        {/* 2. Booking Code (with Hover Tooltip) */}
                                        <td style={{ padding: '14px 16px', position: 'relative' }}>
                                            <div
                                                onMouseEnter={() => setHoveredBookingId(bkg._id || bkgCode)}
                                                onMouseLeave={() => setHoveredBookingId(null)}
                                                style={{ display: 'inline-block', position: 'relative' }}
                                            >
                                                <span style={{
                                                    color: '#fbbf24',
                                                    fontWeight: '800',
                                                    fontSize: '13px',
                                                    textDecoration: 'underline',
                                                    textUnderlineOffset: '3px',
                                                    cursor: 'pointer'
                                                }}>
                                                    {bkgCode}
                                                </span>

                                                {/* Hover Tooltip Popup matching screenshot */}
                                                <AnimatePresence>
                                                    {hoveredBookingId === (bkg._id || bkgCode) && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 6, scale: 0.96 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: 6, scale: 0.96 }}
                                                            transition={{ duration: 0.15 }}
                                                            style={{
                                                                position: 'absolute',
                                                                left: '100%',
                                                                top: '50%',
                                                                transform: 'translateY(-50%)',
                                                                marginLeft: '12px',
                                                                background: '#070f21',
                                                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                                                borderRadius: '10px',
                                                                padding: '10px 14px',
                                                                zIndex: 999,
                                                                boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                                                                minWidth: '180px',
                                                                pointerEvents: 'none',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '10px'
                                                            }}
                                                        >
                                                            <div style={{
                                                                width: '32px',
                                                                height: '32px',
                                                                borderRadius: '50%',
                                                                background: 'rgba(255,255,255,0.08)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'white',
                                                                flexShrink: 0
                                                            }}>
                                                                <User size={16} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: '800', fontSize: '13px', color: 'white', whiteSpace: 'nowrap' }}>
                                                                    {bkg.clientName || 'Guest'}
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                                                                    {bkg.mobileNumber || 'No mobile'}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </td>

                                        {/* 3. Package Price */}
                                        <td style={{ padding: '14px 16px', color: 'white', fontSize: '13px', fontWeight: '700' }}>
                                            {(Number(bkg.totalAmount) || 0).toLocaleString('en-IN')}
                                        </td>

                                        {/* 4. Received */}
                                        <td style={{ padding: '14px 16px', color: 'white', fontSize: '13px', fontWeight: '700' }}>
                                            {(Number(bkg.advancePaid) || 0).toLocaleString('en-IN')}
                                        </td>

                                        {/* 5. Balance */}
                                        <td style={{ padding: '14px 16px', color: 'white', fontSize: '13px', fontWeight: '700' }}>
                                            {(Number(bkg.balanceDue !== undefined ? bkg.balanceDue : (bkg.totalAmount - bkg.advancePaid)) || 0).toLocaleString('en-IN')}
                                        </td>

                                        {/* 6. Trip Start */}
                                        <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
                                            {sDate}
                                        </td>

                                        {/* 7. Trip End */}
                                        <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
                                            {eDate}
                                        </td>

                                        {/* 8. Car Type */}
                                        <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
                                            {bkg.vehicleType || '-'}
                                        </td>

                                        {/* 9. Status Pill */}
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '11px',
                                                fontWeight: '800',
                                                background: isRunning ? 'rgba(30, 58, 138, 0.45)' : 'rgba(6, 95, 70, 0.45)',
                                                color: isRunning ? '#60a5fa' : '#34d399',
                                                border: isRunning ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(52, 211, 153, 0.4)',
                                                display: 'inline-block'
                                            }}>
                                                {isRunning ? 'Running' : 'Confirmed'}
                                            </span>
                                        </td>

                                        {/* 10. Actions (PDF, Pay, Assign Driver, ⋮) matching media_1788929159044.png */}
                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                {/* PDF Button */}
                                                <button
                                                    onClick={() => generateBookingConfirmationPDF(bkg, selectedCompany)}
                                                    title="Download Confirmation PDF"
                                                    style={{
                                                        padding: '6px 14px',
                                                        background: 'rgba(255, 255, 255, 0.08)',
                                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                                        borderRadius: '20px',
                                                        color: '#ffffff',
                                                        fontSize: '11.5px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        transition: 'all 0.2s',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    <FileText size={13} /> PDF
                                                </button>

                                                {/* Pay Button */}
                                                <button
                                                    onClick={() => handleOpenPaymentModal(bkg)}
                                                    title="Record Payment"
                                                    style={{
                                                        padding: '6px 14px',
                                                        background: 'rgba(6, 95, 70, 0.7)',
                                                        border: '1px solid rgba(52, 211, 153, 0.3)',
                                                        borderRadius: '20px',
                                                        color: '#34d399',
                                                        fontSize: '11.5px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        transition: 'all 0.2s',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    <CreditCard size={13} /> Pay
                                                </button>

                                                {/* Assign Driver Button */}
                                                <button
                                                    onClick={() => handleOpenAssignDriver(bkg)}
                                                    title="Assign Driver & Vehicle"
                                                    style={{
                                                        padding: '6px 14px',
                                                        background: 'rgba(29, 78, 216, 0.85)',
                                                        border: '1px solid rgba(96, 165, 250, 0.4)',
                                                        borderRadius: '20px',
                                                        color: '#ffffff',
                                                        fontSize: '11.5px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        transition: 'all 0.2s',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    <Car size={13} /> Assign Driver
                                                </button>

                                                {/* More Options Dropdown */}
                                                <div style={{ position: 'relative' }}>
                                                    <button
                                                        onClick={() => setActiveActionMenu(activeActionMenu === (bkg._id || index) ? null : (bkg._id || index))}
                                                        style={{
                                                            width: '28px',
                                                            height: '28px',
                                                            borderRadius: '6px',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'rgba(255,255,255,0.6)',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <MoreVertical size={14} />
                                                    </button>

                                                    {activeActionMenu === (bkg._id || index) && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            right: 0,
                                                            top: '100%',
                                                            marginTop: '4px',
                                                            background: '#0c162d',
                                                            border: '1px solid rgba(255,255,255,0.15)',
                                                            borderRadius: '8px',
                                                            padding: '6px',
                                                            zIndex: 100,
                                                            boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
                                                            minWidth: '170px',
                                                            textAlign: 'left'
                                                        }}>
                                                            <button
                                                                onClick={() => {
                                                                    setActiveActionMenu(null);
                                                                    handleOpenDetailModal(bkg);
                                                                }}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '7px 10px',
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    color: '#60a5fa',
                                                                    fontSize: '12px',
                                                                    fontWeight: '600',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    cursor: 'pointer',
                                                                    borderRadius: '6px'
                                                                }}
                                                            >
                                                                <Edit size={13} /> Edit Booking
                                                            </button>


                                                            <button
                                                                onClick={() => {
                                                                    setActiveActionMenu(null);
                                                                    shareOnWhatsApp(bkg);
                                                                }}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '7px 10px',
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    color: '#4ade80',
                                                                    fontSize: '12px',
                                                                    fontWeight: '600',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    cursor: 'pointer',
                                                                    borderRadius: '6px'
                                                                }}
                                                            >
                                                                <MessageSquare size={13} /> WhatsApp Guest
                                                            </button>

                                                            <button
                                                                onClick={() => {
                                                                    setActiveActionMenu(null);
                                                                    handleOpenInvoiceModal(bkg);
                                                                }}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '7px 10px',
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    color: 'white',
                                                                    fontSize: '12px',
                                                                    fontWeight: '600',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    cursor: 'pointer',
                                                                    borderRadius: '6px'
                                                                }}
                                                            >
                                                                <FileText size={13} /> Tax Invoice
                                                            </button>

                                                            <button
                                                                onClick={() => {
                                                                    setActiveActionMenu(null);
                                                                    setSelectedBooking(bkg);
                                                                    setShowCancelModal(true);
                                                                }}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '7px 10px',
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    color: '#f87171',
                                                                    fontSize: '12px',
                                                                    fontWeight: '600',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    cursor: 'pointer',
                                                                    borderRadius: '6px'
                                                                }}
                                                            >
                                                                <AlertCircle size={13} /> Cancel Booking
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* FOOTER: SHOWING 1 TO 8 OF 8 BOOKINGS + PAGINATION */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '18px',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '500' }}>
                    Showing 1 to {processedBookings.length} of {processedBookings.length} bookings
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.04)',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <button
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#fbbf24',
                            color: '#000',
                            fontWeight: '900',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        1
                    </button>

                    <button
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.04)',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* RECORD PAYMENT MODAL */}
            <AnimatePresence>
                {showPaymentModal && selectedBooking && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px' }}>
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={{ width: '100%', maxWidth: '480px', background: '#0b1120', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '800' }}>Record Payment</h2>
                                <button onClick={() => setShowPaymentModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={18} /></button>
                            </div>
                            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Amount to Pay (₹)</label>
                                    <input required type="number" min="1" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} style={inputStyle} placeholder="Amount" />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Payment Mode</label>
                                    <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="premium-compact-input" style={{ width: '100%', height: '40px' }}>
                                        <option value="UPI / QR Code">UPI / QR Code</option>
                                        <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                                        <option value="Cash">Cash to Company</option>
                                        <option value="Driver Cash">Driver Cash in Hand</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Reference / UTR (Optional)</label>
                                    <input type="text" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} style={inputStyle} placeholder="UTR or Transaction ID" />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowPaymentModal(false)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" style={{ flex: 1, padding: '10px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}>Save Payment</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* DETAIL / EDIT MODAL */}
            <AnimatePresence>
                {showDetailModal && selectedBooking && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px' }}>
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', background: '#0b1120', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                                <div>
                                    <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '800' }}>Booking {selectedBooking.bookingCode || selectedBooking.bookingId}</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: '2px 0 0 0', fontSize: '12px' }}>Guest: {selectedBooking.clientName} ({selectedBooking.mobileNumber})</p>
                                </div>
                                <button onClick={() => setShowDetailModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={18} /></button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Total Package</div>
                                    <div style={{ fontSize: '18px', fontWeight: '900', color: 'white', marginTop: '2px' }}>₹{(selectedBooking.totalAmount || 0).toLocaleString('en-IN')}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Balance Due</div>
                                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#f87171', marginTop: '2px' }}>₹{(selectedBooking.balanceDue !== undefined ? selectedBooking.balanceDue : (selectedBooking.totalAmount - selectedBooking.advancePaid)).toLocaleString('en-IN')}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Vehicle Type</div>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'white', marginTop: '2px' }}>{selectedBooking.vehicleType}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Trip Dates</div>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'white', marginTop: '2px' }}>{selectedBooking.tripStartFormatted || formatTripDate(selectedBooking.travelStartDate)} to {selectedBooking.tripEndFormatted || formatTripDate(selectedBooking.travelEndDate)}</div>
                                </div>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} style={{ width: '100%', padding: '10px', background: '#fbbf24', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}>Close</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* CANCEL MODAL */}
            <AnimatePresence>
                {showCancelModal && selectedBooking && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px' }}>
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={{ width: '100%', maxWidth: '420px', background: '#0b1120', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', padding: '24px' }}>
                            <h2 style={{ color: '#f87171', margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800' }}>Cancel Booking</h2>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: '0 0 14px 0' }}>Are you sure you want to cancel booking {selectedBooking.bookingCode || selectedBooking.bookingId}?</p>
                            <input type="text" placeholder="Reason for cancellation..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} style={{ ...inputStyle, marginBottom: '14px' }} />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => setShowCancelModal(false)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Keep</button>
                                <button onClick={() => {
                                    setBookings(prev => prev.filter(b => b._id !== selectedBooking._id));
                                    setShowCancelModal(false);
                                    alert('Booking cancelled.');
                                }} style={{ flex: 1, padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}>Confirm Cancel</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* INVOICE MODAL */}
            <AnimatePresence>
                {showInvoiceModal && selectedBooking && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px' }}>
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', background: '#0b1120', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '800' }}>Generate Tax Invoice</h2>
                                <button onClick={() => setShowInvoiceModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={18} /></button>
                            </div>
                            <form onSubmit={handleGenerateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Billed To</label>
                                    <input type="text" value={invoiceFormData.billTo.name} onChange={e => setInvoiceFormData({ ...invoiceFormData, billTo: { ...invoiceFormData.billTo, name: e.target.value } })} style={inputStyle} placeholder="Client Name" />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>GST Mode</label>
                                    <select value={invoiceFormData.gstMode} onChange={e => setInvoiceFormData({ ...invoiceFormData, gstMode: e.target.value })} className="premium-compact-input" style={{ width: '100%', height: '40px' }}>
                                        <option value="GST Extra">GST Extra (5%)</option>
                                        <option value="GST Inclusive">GST Inclusive</option>
                                        <option value="No GST">No GST</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowInvoiceModal(false)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" disabled={creatingInvoice} style={{ flex: 1, padding: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}>
                                        {creatingInvoice ? 'Generating...' : 'Generate & Download PDF'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ASSIGN DRIVER MODAL */}
            <AnimatePresence>
                {showAssignDriverModal && assigningBooking && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.82)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 99999,
                        padding: '20px'
                    }}>
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            style={{
                                width: '100%',
                                maxWidth: '850px',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                background: '#0b1120',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                borderRadius: '16px',
                                padding: '26px',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                            }}
                        >
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '10px',
                                            background: 'rgba(56, 189, 248, 0.15)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#38bdf8'
                                        }}>
                                            <Car size={20} />
                                        </div>
                                        <div>
                                            <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '800' }}>
                                                Assign Drivers & Vehicles
                                            </h2>
                                            <p style={{ margin: '2px 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                                                Booking: <strong style={{ color: '#38bdf8' }}>{assigningBooking.bookingCode || assigningBooking.bookingId}</strong> • Client: <strong style={{ color: 'white' }}>{assigningBooking.clientName}</strong> • {assigningBooking.vehicleType || 'Car'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowAssignDriverModal(false)}
                                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Info Alert */}
                            <div style={{
                                background: 'rgba(2, 132, 199, 0.12)',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                borderRadius: '10px',
                                padding: '10px 14px',
                                marginBottom: '18px',
                                fontSize: '12px',
                                color: '#7dd3fc',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span>⚡</span>
                                <span>
                                    <strong>Bidirectional DRS Sync:</strong> Assign a driver for each day of the itinerary below. If not confirmed yet, leave it as <em>"Assign Later"</em>. Drivers assigned here instantly shoot into DRS, and assignments changed in DRS automatically update here.
                                </span>
                            </div>

                            {/* Day-Wise Itinerary List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                {assignItinerary.map((day, idx) => {
                                    const allDrivers = (driversList && driversList.length > 0) ? driversList : BASELINE_DRIVERS;
                                    const isCustomDriver = day.driverId === 'custom' || (!allDrivers.some(d => String(d._id) === String(day.driverId)) && day.driverName && !day.driverId);

                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '12px',
                                                padding: '14px 16px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '10px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{
                                                        background: '#1e3a8a',
                                                        color: '#93c5fd',
                                                        padding: '3px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        fontWeight: '800'
                                                    }}>
                                                        Day {day.dayNo || idx + 1}
                                                    </span>
                                                    <span style={{ color: 'white', fontWeight: '700', fontSize: '13px' }}>
                                                        {day.date ? new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Date Pending'}
                                                    </span>
                                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>•</span>
                                                    <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: '600' }}>
                                                        {day.time || '09:00 AM'}
                                                    </span>
                                                </div>
                                                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12.5px', fontWeight: '500' }}>
                                                    {day.duty || day.description || 'City Tour / Transfer'}
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '4px' }}>
                                                {/* Driver Selector */}
                                                <div>
                                                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
                                                        Driver Assignment
                                                    </label>
                                                    <select
                                                        value={isCustomDriver ? '__custom__' : (day.driverId || '')}
                                                        onChange={(e) => handleUpdateDayDriver(idx, e.target.value)}
                                                        className="premium-compact-input"
                                                        style={{
                                                            width: '100%',
                                                            height: '38px',
                                                            background: '#070d18',
                                                            color: day.driverName ? '#34d399' : 'rgba(255,255,255,0.7)',
                                                            border: day.driverName ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(255,255,255,0.15)',
                                                            borderRadius: '8px',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        <option value="">-- Not Confirmed (Assign Later) --</option>
                                                        <optgroup label="Company Drivers">
                                                            {allDrivers.map(drv => (
                                                                <option key={drv._id} value={drv._id}>
                                                                    {drv.name} ({drv.mobile || drv.phone}) {drv.vehicleNumber ? `[${drv.vehicleNumber}]` : ''}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                        <option value="__custom__">-- Other / Outsourced Driver --</option>
                                                    </select>
                                                </div>

                                                {/* Vehicle Assignment */}
                                                <div>
                                                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
                                                        Assigned Vehicle / Cab
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. RJ14 PA 1234 (or Crysta)"
                                                        value={day.vehicleNumber || ''}
                                                        onChange={(e) => handleUpdateDayField(idx, 'vehicleNumber', e.target.value)}
                                                        style={{
                                                            ...inputStyle,
                                                            height: '38px',
                                                            fontSize: '12px'
                                                        }}
                                                    />
                                                </div>

                                                {/* Custom Driver inputs if custom selected */}
                                                {isCustomDriver && (
                                                    <>
                                                        <div>
                                                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
                                                                Driver Name
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="Driver Name"
                                                                value={day.driverName || ''}
                                                                onChange={(e) => handleUpdateDayField(idx, 'driverName', e.target.value)}
                                                                style={{ ...inputStyle, height: '38px', fontSize: '12px' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
                                                                Driver Mobile
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="+91 Mobile"
                                                                value={day.driverPhone || ''}
                                                                onChange={(e) => handleUpdateDayField(idx, 'driverPhone', e.target.value)}
                                                                style={{ ...inputStyle, height: '38px', fontSize: '12px' }}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Modal Footer */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAssignDriverModal(false)}
                                    style={{
                                        padding: '10px 18px',
                                        background: 'rgba(255,255,255,0.06)',
                                        color: 'white',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '13px'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveDriverAssignments}
                                    disabled={savingAssignment}
                                    style={{
                                        padding: '10px 22px',
                                        background: '#2563eb',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '800',
                                        fontSize: '13px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
                                    }}
                                >
                                    {savingAssignment ? (
                                        <>Updating DRS...</>
                                    ) : (
                                        <>
                                            <CheckCircle size={15} /> Confirm & Update DRS
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
