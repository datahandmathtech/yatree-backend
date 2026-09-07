import React, { useState, useEffect } from 'react';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import {
    Calendar, Car, IndianRupee, Download, CheckCircle, Clock,
    AlertCircle, Search, Filter, Phone, MessageSquare, Plus,
    FileText, X, ArrowUpRight, ShieldCheck, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { generateBookingConfirmationPDF } from '../utils/bookingConfirmationPdf';
import { generateTaxInvoicePDF } from '../utils/taxInvoicePdf';

export default function Bookings() {
    const { selectedCompany } = useCompany();
    const { theme } = useTheme();

    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [paymentFilter, setPaymentFilter] = useState('All');

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

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchBookings();
        }
    }, [selectedCompany, statusFilter, paymentFilter]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            let url = `/api/bookings/${selectedCompany._id}?status=${statusFilter}&paymentStatus=${paymentFilter}`;
            if (searchTerm) {
                url += `&search=${encodeURIComponent(searchTerm)}`;
            }
            const { data } = await axios.get(url);
            setBookings(data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchBookings();
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`/api/bookings/${selectedBooking._id}/payment`, {
                amount: Number(paymentAmount),
                paymentMode,
                paymentReference: paymentRef
            });
            setShowPaymentModal(false);
            setPaymentAmount('');
            setPaymentRef('');
            fetchBookings();
            alert('Payment recorded successfully!');
        } catch (error) {
            console.error('Error recording payment:', error);
            alert('Failed to record payment');
        }
    };

    const handleCancelBooking = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`/api/bookings/${selectedBooking._id}/cancel`, {
                reason: cancelReason
            });
            setShowCancelModal(false);
            setCancelReason('');
            fetchBookings();
            alert('Booking and linked DRS duties cancelled.');
        } catch (error) {
            console.error('Error cancelling booking:', error);
            alert('Failed to cancel booking');
        }
    };

    const shareOnWhatsApp = (bkg) => {
        const cleanMobile = (bkg.mobileNumber || '').replace(/[^0-9]/g, '');
        const sDate = bkg.travelStartDate ? new Date(bkg.travelStartDate).toLocaleDateString('en-IN') : '';
        const msg = `*Namaste ${bkg.clientName} ji!*\n\nYour booking with *${selectedCompany?.name || 'LogKaro Fleet'}* has been confirmed!\n\n*Booking ID:* ${bkg.bookingId}\n*Vehicle:* ${bkg.numberOfCars}x ${bkg.vehicleType}\n*Start Date:* ${sDate}\n*Total Fare:* Rs. ${bkg.totalAmount?.toLocaleString('en-IN')}\n*Advance Paid:* Rs. ${bkg.advancePaid?.toLocaleString('en-IN')}\n*Balance Payable:* Rs. ${bkg.balanceDue?.toLocaleString('en-IN')}\n\nOur operations team will coordinate your chauffeur details prior to departure. Have a wonderful trip!\n\n_LogKaro Fleet Operations_`;

        const url = `https://wa.me/${cleanMobile}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
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
                description: `${bkg.numberOfCars || 1}x ${bkg.vehicleType || 'Motor Cab'} Rental Service (${bkg.bookingId})`,
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
            notes: `Booking Reference: ${bkg.bookingId}`
        });
        setShowInvoiceModal(true);
    };

    const handleGenerateInvoice = async (e) => {
        e.preventDefault();
        try {
            setCreatingInvoice(true);
            const payload = {
                company: selectedCompany._id,
                booking: selectedBooking._id,
                bookingId: selectedBooking.bookingId,
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

    const inputStyle = {
        width: '100%',
        padding: '12px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.2)',
        color: 'white',
        outline: 'none',
        fontSize: '14px'
    };

    return (
        <div className="container-fluid" style={{ minHeight: '100vh', padding: '40px 20px', position: 'relative' }}>
            <SEO title="Confirmed Bookings" />

            {/* Header */}
            <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                        width: '45px',
                        height: '45px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: '#4ade80'
                    }}>
                        <ShieldCheck size={26} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'white', letterSpacing: '-0.5px', margin: 0 }}>
                            Confirmed <span style={{ color: '#4ade80' }}>Bookings</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px', margin: 0 }}>
                            Track confirmed reservations, balance collections, day schedules, and confirmation PDFs.
                        </p>
                    </div>
                </div>

                {/* Total Stats summary */}
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div className="glass-card" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Active Bookings</div>
                            <div style={{ fontSize: '20px', fontWeight: '900', color: 'white' }}>{bookings.length}</div>
                        </div>
                    </div>
                    <div className="glass-card" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: '#f87171', textTransform: 'uppercase' }}>Total Balance Due</div>
                            <div style={{ fontSize: '20px', fontWeight: '900', color: '#f87171' }}>
                                ₹{bookings.reduce((sum, b) => sum + (b.balanceDue || 0), 0).toLocaleString('en-IN')}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Filter & Search Bar */}
            <div className="glass-card" style={{ padding: '15px 20px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                <form onSubmit={handleSearch} style={{ flex: '1 1 300px', display: 'flex', gap: '10px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                        <input
                            type="text"
                            placeholder="Search by Booking ID, Guest Name, Mobile..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ ...inputStyle, paddingLeft: '38px' }}
                        />
                    </div>
                    <button type="submit" className="primary-btn" style={{ height: '42px', padding: '0 20px', borderRadius: '10px' }}>Search</button>
                </form>

                {/* Status Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Status:</span>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="premium-compact-input"
                        style={{ height: '42px' }}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>

                {/* Payment Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Payment:</span>
                    <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="premium-compact-input"
                        style={{ height: '42px' }}
                    >
                        <option value="All">All Payment</option>
                        <option value="Advance Received">Advance Received</option>
                        <option value="Partial">Partial</option>
                        <option value="Full Received">Full Received</option>
                    </select>
                </div>
            </div>

            {/* Bookings Table */}
            <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
                <table style={{ width: '100%', color: 'white', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.25)' }}>
                        <tr>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Booking ID</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Guest Details</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Dates & Vehicle</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Commercials</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>Payment</th>
                            <th style={{ padding: '16px 20px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '50px' }}><div className="loader"></div></td></tr>
                        ) : bookings.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '50px', color: 'rgba(255,255,255,0.5)' }}>No confirmed bookings found.</td></tr>
                        ) : bookings.map(bkg => (
                            <tr key={bkg._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                {/* Booking ID */}
                                <td style={{ padding: '16px 20px' }}>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '4px 8px',
                                        background: 'rgba(245, 158, 11, 0.15)',
                                        color: 'var(--primary)',
                                        border: '1px solid rgba(245, 158, 11, 0.3)',
                                        borderRadius: '6px',
                                        fontWeight: '800',
                                        fontSize: '12px'
                                    }}>
                                        {bkg.bookingId}
                                    </span>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                        {bkg.bookingDate ? new Date(bkg.bookingDate).toLocaleDateString('en-IN') : ''}
                                    </div>
                                </td>

                                {/* Guest Details */}
                                <td style={{ padding: '16px 20px' }}>
                                    <div style={{ fontWeight: '800', fontSize: '15px' }}>{bkg.clientName}</div>
                                    <div style={{ fontSize: '12px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                        <Phone size={11} /> {bkg.mobileNumber}
                                    </div>
                                    {bkg.source && (
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                            Source: {bkg.source}
                                        </div>
                                    )}
                                </td>

                                {/* Dates & Vehicle */}
                                <td style={{ padding: '16px 20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                        <Calendar size={13} color="var(--primary)" />
                                        <span>{new Date(bkg.travelStartDate).toLocaleDateString('en-IN')} - {new Date(bkg.travelEndDate).toLocaleDateString('en-IN')}</span>
                                    </div>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', marginTop: '4px' }}>
                                        <Car size={12} color="var(--primary)" /> {bkg.numberOfCars}x {bkg.vehicleType}
                                    </div>
                                </td>

                                {/* Commercials */}
                                <td style={{ padding: '16px 20px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>₹{(bkg.totalAmount || 0).toLocaleString('en-IN')}</div>
                                    <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '2px' }}>Adv: ₹{(bkg.advancePaid || 0).toLocaleString('en-IN')}</div>
                                    <div style={{ fontSize: '11px', color: (bkg.balanceDue > 0 ? '#f87171' : 'rgba(255,255,255,0.4)'), fontWeight: '700' }}>
                                        Bal: ₹{(bkg.balanceDue || 0).toLocaleString('en-IN')}
                                    </div>
                                </td>

                                {/* Payment Status */}
                                <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        textTransform: 'uppercase',
                                        background: bkg.balanceDue <= 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                        color: bkg.balanceDue <= 0 ? '#4ade80' : 'var(--primary)',
                                        border: `1px solid ${bkg.balanceDue <= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                                    }}>
                                        {bkg.balanceDue <= 0 ? 'PAID' : `DUE ₹${bkg.balanceDue?.toLocaleString('en-IN')}`}
                                    </span>
                                </td>

                                {/* Actions */}
                                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                        {/* Download Confirmation PDF */}
                                        <button
                                            onClick={() => generateBookingConfirmationPDF(bkg, selectedCompany)}
                                            title="Download Confirmation PDF"
                                            style={{
                                                background: 'rgba(245, 158, 11, 0.15)',
                                                color: 'var(--primary)',
                                                border: '1px solid rgba(245, 158, 11, 0.3)',
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
                                            <Download size={13} /> PDF
                                        </button>

                                        {/* WhatsApp Share */}
                                        <button
                                            onClick={() => shareOnWhatsApp(bkg)}
                                            title="Share on WhatsApp"
                                            style={{
                                                background: 'rgba(34, 197, 94, 0.15)',
                                                color: '#4ade80',
                                                border: '1px solid rgba(34, 197, 94, 0.3)',
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
                                            <MessageSquare size={13} /> WhatsApp
                                        </button>

                                        {/* Generate GST Tax Invoice */}
                                        <button
                                            onClick={() => handleOpenInvoiceModal(bkg)}
                                            title="Generate GST Tax Invoice"
                                            style={{
                                                background: 'rgba(234, 179, 8, 0.15)',
                                                color: '#facc15',
                                                border: '1px solid rgba(234, 179, 8, 0.3)',
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
                                            <FileText size={13} /> Invoice
                                        </button>

                                        {/* Record Payment */}
                                        {bkg.balanceDue > 0 && (
                                            <button
                                                onClick={() => {
                                                    setSelectedBooking(bkg);
                                                    setPaymentAmount(bkg.balanceDue || '');
                                                    setShowPaymentModal(true);
                                                }}
                                                title="Record Guest Payment"
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
                                                <IndianRupee size={13} /> Pay
                                            </button>
                                        )}

                                        {/* View Details */}
                                        <button
                                            onClick={() => {
                                                setSelectedBooking(bkg);
                                                setShowDetailModal(true);
                                            }}
                                            title="View Booking Itinerary & Details"
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                color: 'white',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                padding: '6px 10px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '12px'
                                            }}
                                        >
                                            <FileText size={13} />
                                        </button>

                                        {/* Jump to DRS Schedule */}
                                        <Link to="/admin/drs" style={{ textDecoration: 'none' }}>
                                            <button
                                                title="View or Assign in DRS Schedule"
                                                style={{
                                                    background: 'rgba(168, 85, 247, 0.15)',
                                                    color: '#c084fc',
                                                    border: '1px solid rgba(168, 85, 247, 0.3)',
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
                                                <Calendar size={13} /> DRS
                                            </button>
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal: View Details */}
            <AnimatePresence>
                {showDetailModal && selectedBooking && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '90%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', background: '#0f172a', padding: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px', marginBottom: '20px' }}>
                                <div>
                                    <h2 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '800' }}>Booking: {selectedBooking.bookingId}</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0', fontSize: '13px' }}>Client: {selectedBooking.clientName} ({selectedBooking.mobileNumber})</p>
                                </div>
                                <button onClick={() => setShowDetailModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            <h3 style={{ color: 'var(--primary)', fontSize: '14px', marginBottom: '10px' }}>Day-wise Itinerary & Schedule</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '25px' }}>
                                {(selectedBooking.itinerary || []).map((day, i) => (
                                    <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '13px', color: 'white' }}>Day {day.dayNo || i + 1}: {day.duty || day.description}</div>
                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                                                {day.date ? new Date(day.date).toLocaleDateString('en-IN') : 'TBA'} | Pickup: {day.pickupPoint || 'As advised'} @ {day.time || '09:00 AM'}
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '14px' }}>₹{(day.amount || 0).toLocaleString('en-IN')}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button onClick={() => generateBookingConfirmationPDF(selectedBooking, selectedCompany)} className="primary-btn" style={{ padding: '10px 20px', fontSize: '13px' }}>
                                    <Download size={15} /> Download PDF
                                </button>
                                <button onClick={() => setShowDetailModal(false)} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Close</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Record Payment */}
            <AnimatePresence>
                {showPaymentModal && selectedBooking && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '90%', maxWidth: '460px', background: '#0f172a', padding: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px', marginBottom: '20px' }}>
                                <div>
                                    <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '800' }}>Record Payment</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0', fontSize: '12px' }}>Booking: {selectedBooking.bookingId} | Balance: ₹{selectedBooking.balanceDue?.toLocaleString('en-IN')}</p>
                                </div>
                                <button onClick={() => setShowPaymentModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>Payment Amount (₹)</label>
                                    <input required type="number" min="1" max={selectedBooking.balanceDue} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>Payment Mode</label>
                                    <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="premium-compact-input" style={{ width: '100%', height: '42px' }}>
                                        <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                                        <option value="UPI / QR Code">UPI / QR Code</option>
                                        <option value="Cash">Cash to Company</option>
                                        <option value="Driver Cash">Driver Cash in Hand</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>Reference / UTR / Remarks</label>
                                    <input type="text" placeholder="e.g. UTR12345678" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} style={inputStyle} />
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowPaymentModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" style={{ flex: 1, padding: '12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}>Save Payment</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Generate GST Tax Invoice */}
            <AnimatePresence>
                {showInvoiceModal && selectedBooking && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', background: '#0f172a', padding: '25px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px', marginBottom: '20px' }}>
                                <div>
                                    <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FileText size={20} color="#facc15" /> Generate GST Tax Invoice
                                    </h2>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0', fontSize: '12px' }}>
                                        Booking: {selectedBooking.bookingId} | Guest: {selectedBooking.clientName}
                                    </p>
                                </div>
                                <button onClick={() => setShowInvoiceModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            <form onSubmit={handleGenerateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {/* Billed To Details */}
                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#facc15', textTransform: 'uppercase', marginBottom: '10px' }}>Receiver (Billed To) Details</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Client / Company Name *</label>
                                            <input required type="text" value={invoiceFormData.billTo.name} onChange={e => setInvoiceFormData({ ...invoiceFormData, billTo: { ...invoiceFormData.billTo, name: e.target.value } })} style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Mobile Number *</label>
                                            <input required type="text" value={invoiceFormData.billTo.mobile} onChange={e => setInvoiceFormData({ ...invoiceFormData, billTo: { ...invoiceFormData.billTo, mobile: e.target.value } })} style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Client GSTIN (Optional)</label>
                                            <input type="text" placeholder="e.g. 08AAAAA0000A1Z5" value={invoiceFormData.billTo.gstin} onChange={e => setInvoiceFormData({ ...invoiceFormData, billTo: { ...invoiceFormData.billTo, gstin: e.target.value.toUpperCase() } })} style={{ ...inputStyle, textTransform: 'uppercase' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Place of Supply</label>
                                            <input type="text" value={invoiceFormData.billTo.placeOfSupply} onChange={e => setInvoiceFormData({ ...invoiceFormData, billTo: { ...invoiceFormData.billTo, placeOfSupply: e.target.value } })} style={inputStyle} />
                                        </div>
                                    </div>
                                </div>

                                {/* Tax & Commercials */}
                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#facc15', textTransform: 'uppercase', marginBottom: '10px' }}>Tax & Payment Structure (SAC 996601)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>GST Mode</label>
                                            <select value={invoiceFormData.gstMode} onChange={e => setInvoiceFormData({ ...invoiceFormData, gstMode: e.target.value })} className="premium-compact-input" style={{ width: '100%', height: '40px' }}>
                                                <option value="GST Extra">GST Extra (Added to base)</option>
                                                <option value="GST Inclusive">GST Inclusive (Included)</option>
                                                <option value="No GST">No GST / Cash Memo</option>
                                                <option value="RCM">RCM (Reverse Charge)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>GST Rate (%)</label>
                                            <select value={invoiceFormData.gstRate} onChange={e => setInvoiceFormData({ ...invoiceFormData, gstRate: Number(e.target.value) })} className="premium-compact-input" style={{ width: '100%', height: '40px' }}>
                                                <option value={5}>5% (SAC 996601 Transport)</option>
                                                <option value={12}>12% (With ITC)</option>
                                                <option value={18}>18% (Corporate / Package)</option>
                                                <option value={0}>0%</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '10px' }}>
                                        <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Advance Paid by Guest (To Deduct) (₹)</label>
                                        <input type="number" value={invoiceFormData.advanceAdjusted} onChange={e => setInvoiceFormData({ ...invoiceFormData, advanceAdjusted: e.target.value })} style={inputStyle} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                    <button type="button" onClick={() => setShowInvoiceModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" disabled={creatingInvoice} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#0f172a', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <FileText size={16} /> {creatingInvoice ? 'Generating Invoice...' : 'Generate & Download PDF'}
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
