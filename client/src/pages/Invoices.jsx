import React, { useState, useEffect } from 'react';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import {
    FileText, IndianRupee, Download, CheckCircle, Clock,
    AlertCircle, Search, Filter, Phone, MessageSquare, Plus,
    X, ArrowUpRight, ShieldCheck, Building2, Trash2, Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import { generateTaxInvoicePDF } from '../utils/taxInvoicePdf';

export default function Invoices() {
    const { selectedCompany } = useCompany();
    const { theme } = useTheme();

    const [invoices, setInvoices] = useState([]);
    const [kpiSummary, setKpiSummary] = useState({
        totalInvoices: 0,
        totalInvoicedAmount: 0,
        totalCollectedAmount: 0,
        totalPendingAmount: 0,
        totalGstCollected: 0
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // Modals
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Status Update Form
    const [newStatus, setNewStatus] = useState('Paid');
    const [paymentMode, setPaymentMode] = useState('Bank Transfer / NEFT');
    const [paymentRef, setPaymentRef] = useState('');
    const [statusNotes, setStatusNotes] = useState('');

    // Create Direct Invoice Form
    const [createForm, setCreateForm] = useState({
        billTo: {
            name: '',
            companyName: '',
            mobile: '',
            email: '',
            address: '',
            gstin: '',
            placeOfSupply: 'Rajasthan (08)'
        },
        items: [
            { description: 'Passenger Motor Vehicle Rental & Chauffeur Services', sacCode: '996601', quantity: 1, rate: 0, amount: 0 }
        ],
        salesLedger: 'Taxi Sales',
        gstMode: 'GST Extra',
        gstRate: 5,
        isInterState: false,
        advanceAdjusted: 0,
        notes: ''
    });

    useEffect(() => {
        if (selectedCompany?._id) {
            fetchInvoices();
        }
    }, [selectedCompany, statusFilter]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            let url = `/api/invoices/${selectedCompany._id}?status=${statusFilter}`;
            if (searchTerm) {
                url += `&search=${encodeURIComponent(searchTerm)}`;
            }
            const { data } = await axios.get(url);
            setInvoices(data.invoices || []);
            if (data.kpiSummary) {
                setKpiSummary(data.kpiSummary);
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchInvoices();
    };

    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/api/invoices/${selectedInvoice._id}/status`, {
                status: newStatus,
                paymentMode,
                paymentReference: paymentRef,
                notes: statusNotes
            });
            setShowStatusModal(false);
            fetchInvoices();
        } catch (error) {
            console.error('Error updating status:', error);
            alert(error.response?.data?.message || 'Failed to update status');
        }
    };

    // Item management for Create Modal
    const handleAddItem = () => {
        setCreateForm({
            ...createForm,
            items: [
                ...createForm.items,
                { description: 'Outstation Fleet Travel / Airport Transfer', sacCode: '996601', quantity: 1, rate: 0, amount: 0 }
            ]
        });
    };

    const handleRemoveItem = (index) => {
        if (createForm.items.length <= 1) return;
        const newItems = createForm.items.filter((_, i) => i !== index);
        setCreateForm({ ...createForm, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...createForm.items];
        newItems[index][field] = value;
        if (field === 'quantity' || field === 'rate') {
            const qty = field === 'quantity' ? Number(value) : Number(newItems[index].quantity);
            const rate = field === 'rate' ? Number(value) : Number(newItems[index].rate);
            newItems[index].amount = Math.round(qty * rate);
        }
        setCreateForm({ ...createForm, items: newItems });
    };

    // Computations for Create Modal
    const itemsSum = createForm.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const rateNum = Number(createForm.gstRate) || 0;
    let modalTaxable = 0;
    let modalTax = 0;
    let modalTotal = 0;

    if (createForm.gstMode === 'GST Extra') {
        modalTaxable = itemsSum;
        modalTax = Math.round((modalTaxable * rateNum) / 100);
        modalTotal = modalTaxable + modalTax;
    } else if (createForm.gstMode === 'GST Inclusive') {
        modalTotal = itemsSum;
        modalTaxable = Math.round(modalTotal / (1 + (rateNum / 100)));
        modalTax = modalTotal - modalTaxable;
    } else {
        modalTaxable = itemsSum;
        modalTax = 0;
        modalTotal = itemsSum;
    }
    const modalNetPayable = Math.max(0, modalTotal - (Number(createForm.advanceAdjusted) || 0));

    const handleCreateDirectInvoice = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                company: selectedCompany._id,
                billTo: createForm.billTo,
                items: createForm.items,
                salesLedger: createForm.salesLedger,
                gstMode: createForm.gstMode,
                gstRate: createForm.gstRate,
                isInterState: createForm.isInterState,
                advanceAdjusted: Number(createForm.advanceAdjusted) || 0,
                notes: createForm.notes,
                status: 'Issued'
            };

            const { data: newInvoice } = await axios.post('/api/invoices', payload);
            setShowCreateModal(false);
            fetchInvoices();
            generateTaxInvoicePDF(newInvoice, selectedCompany);
            alert(`Tax Invoice ${newInvoice.invoiceNumber} generated & downloaded successfully!`);
        } catch (error) {
            console.error('Error creating invoice:', error);
            alert(error.response?.data?.message || 'Failed to create tax invoice');
        }
    };

    const shareOnWhatsApp = (inv) => {
        const clientName = inv.billTo?.name || 'Customer';
        const invNum = inv.invoiceNumber;
        const total = (inv.totalAmount || 0).toLocaleString('en-IN');
        const due = (inv.netPayable || 0).toLocaleString('en-IN');
        const text = encodeURIComponent(
            `*Namaste ${clientName} ji!*\n\n` +
            `Your GST Tax Invoice *${invNum}* has been issued by *${selectedCompany?.name || 'LogKaro Fleet'}*.\n\n` +
            `🔹 Total Invoice Value: Rs. ${total}\n` +
            `🔹 Advance Adjusted: Rs. ${(inv.advanceAdjusted || 0).toLocaleString('en-IN')}\n` +
            `🔹 *Net Balance Due: Rs. ${due}*\n\n` +
            `SAC Code: 996601 (Passenger Transport)\n` +
            `Payment Mode: NEFT / RTGS / UPI\n\n` +
            `Thank you for choosing our fleet services!\n` +
            `_LogKaro Fleet Operations_`
        );
        window.open(`https://wa.me/${inv.billTo?.mobile?.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
    };

    const inputStyle = {
        width: '100%',
        padding: '12px 14px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.3)',
        color: 'white',
        outline: 'none',
        fontSize: '13px'
    };

    return (
        <div className="container-fluid" style={{ minHeight: '100vh', padding: '40px 20px', position: 'relative', color: 'white' }}>
            <SEO title="GST Tax Invoices - LogKaro" />

            {/* Header Section */}
            <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        borderRadius: '14px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'var(--primary)'
                    }}>
                        <FileText size={26} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'white', letterSpacing: '-0.5px', margin: 0 }}>
                            GST Tax Invoices <span style={{ color: 'var(--primary)' }}>& Billing</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px', margin: 0 }}>
                            SAC 996601 Compliant Passenger Transport Tax Invoices (PRD Section 14)
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="primary-btn"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 22px',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: '800'
                        }}
                    >
                        <Plus size={16} /> Direct Tax Invoice
                    </button>
                </div>
            </header>

            {/* KPI Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '25px' }}>
                <div className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: '700' }}>Total Invoiced</span>
                        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                            <FileText size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: 'white', marginTop: '10px' }}>
                        ₹{(kpiSummary.totalInvoicedAmount || 0).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                        {kpiSummary.totalInvoices || invoices.length} Invoices Generated
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '20px', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#4ade80', textTransform: 'uppercase', fontWeight: '700' }}>Collected / Settled</span>
                        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
                            <CheckCircle size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#4ade80', marginTop: '10px' }}>
                        ₹{(kpiSummary.totalCollectedAmount || 0).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                        Advances + Full Receipts
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '20px', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#f87171', textTransform: 'uppercase', fontWeight: '700' }}>Balance Due</span>
                        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                            <AlertCircle size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#f87171', marginTop: '10px' }}>
                        ₹{(kpiSummary.totalPendingAmount || 0).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                        Outstanding Receivables
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '20px', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: '700' }}>GST Tax Amount</span>
                        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--primary)' }}>
                            <IndianRupee size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--primary)', marginTop: '10px' }}>
                        ₹{(kpiSummary.totalGstCollected || 0).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                        CGST + SGST / IGST
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                {/* Status Filter Tabs */}
                <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '5px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
                    {['All', 'Issued', 'Paid', 'Draft', 'Cancelled'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setStatusFilter(tab)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: statusFilter === tab ? '800' : '600',
                                background: statusFilter === tab ? 'var(--primary)' : 'transparent',
                                color: statusFilter === tab ? '#000' : 'rgba(255,255,255,0.6)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Search input */}
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', flex: '1 1 280px', maxWidth: '450px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                        <input
                            type="text"
                            placeholder="Search by Invoice #, Guest, Mobile, GSTIN..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ ...inputStyle, paddingLeft: '36px', height: '40px' }}
                        />
                    </div>
                    <button type="submit" className="secondary-btn" style={{ height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '12px' }}>Search</button>
                </form>
            </div>

            {/* Invoices Table */}
            <div className="glass-card" style={{ padding: '0', overflowX: 'auto', borderRadius: '20px' }}>
                <table style={{ width: '100%', color: 'white', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <tr>
                            <th style={{ padding: '16px 20px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontSize: '11px' }}>Invoice # & Date</th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontSize: '11px' }}>Billed To</th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontSize: '11px' }}>Booking Ref</th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontSize: '11px', textAlign: 'right' }}>Taxable Val</th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontSize: '11px', textAlign: 'right' }}>GST Tax</th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontSize: '11px', textAlign: 'right' }}>Total (₹)</th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontSize: '11px', textAlign: 'right' }}>Advance Adj</th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontSize: '11px', textAlign: 'right' }}>Balance Due</th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontSize: '11px', textAlign: 'center' }}>Status</th>
                            <th style={{ padding: '16px 20px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontSize: '11px', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="10" style={{ textAlign: 'center', padding: '60px' }}>
                                    <div className="loader" style={{ margin: '0 auto' }}></div>
                                    <div style={{ marginTop: '12px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Loading Tax Invoices...</div>
                                </td>
                            </tr>
                        ) : invoices.length === 0 ? (
                            <tr>
                                <td colSpan="10" style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.5)' }}>
                                    <FileText size={36} style={{ opacity: 0.3, marginBottom: '10px' }} />
                                    <div style={{ fontWeight: '700', fontSize: '15px', color: 'white' }}>No Invoices Found</div>
                                    <div style={{ fontSize: '12px', marginTop: '4px' }}>Generate invoices directly or from Confirmed Bookings.</div>
                                </td>
                            </tr>
                        ) : invoices.map(inv => (
                            <tr key={inv._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s ease' }}>
                                {/* Invoice # & Date */}
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
                                        {inv.invoiceNumber}
                                    </span>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                        {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : 'N/A'}
                                    </div>
                                </td>

                                {/* Billed To */}
                                <td style={{ padding: '16px 20px' }}>
                                    <div style={{ fontWeight: '800', fontSize: '14px', color: 'white' }}>
                                        {inv.billTo?.companyName || inv.billTo?.name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                        <Phone size={11} /> {inv.billTo?.mobile}
                                        {inv.billTo?.gstin && (
                                            <span style={{
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                background: 'rgba(245, 158, 11, 0.1)',
                                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                                color: 'var(--primary)',
                                                fontSize: '10px',
                                                fontFamily: 'monospace'
                                            }}>
                                                {inv.billTo.gstin}
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* Booking Ref */}
                                <td style={{ padding: '16px 20px' }}>
                                    {inv.bookingId ? (
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '4px 8px',
                                            background: 'rgba(59, 130, 246, 0.15)',
                                            color: '#60a5fa',
                                            border: '1px solid rgba(59, 130, 246, 0.3)',
                                            borderRadius: '6px',
                                            fontWeight: '700',
                                            fontSize: '11px'
                                        }}>
                                            {inv.bookingId}
                                        </span>
                                    ) : (
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Direct Walk-In</span>
                                    )}
                                </td>

                                {/* Taxable Value */}
                                <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '600' }}>
                                    ₹{(inv.taxableAmount || 0).toLocaleString('en-IN')}
                                </td>

                                {/* GST Tax */}
                                <td style={{ padding: '16px 20px', textAlign: 'right', color: 'rgba(255,255,255,0.6)' }}>
                                    ₹{(inv.totalTaxAmount || 0).toLocaleString('en-IN')}
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>({inv.gstRate || 5}%)</div>
                                </td>

                                {/* Total Amount */}
                                <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '800', color: 'white', fontSize: '14px' }}>
                                    ₹{(inv.totalAmount || 0).toLocaleString('en-IN')}
                                </td>

                                {/* Advance Adjusted */}
                                <td style={{ padding: '16px 20px', textAlign: 'right', color: '#4ade80', fontWeight: '700' }}>
                                    {inv.advanceAdjusted > 0 ? `(-) ₹${inv.advanceAdjusted.toLocaleString('en-IN')}` : '₹0'}
                                </td>

                                {/* Balance Due */}
                                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                    <span style={{
                                        fontWeight: '900',
                                        fontSize: '14px',
                                        color: inv.netPayable > 0 ? '#f87171' : '#4ade80'
                                    }}>
                                        ₹{(inv.netPayable || 0).toLocaleString('en-IN')}
                                    </span>
                                </td>

                                {/* Status */}
                                <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        textTransform: 'uppercase',
                                        background: inv.status === 'Paid' ? 'rgba(34, 197, 94, 0.15)' :
                                                    inv.status === 'Issued' ? 'rgba(59, 130, 246, 0.15)' :
                                                    inv.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                        color: inv.status === 'Paid' ? '#4ade80' :
                                               inv.status === 'Issued' ? '#60a5fa' :
                                               inv.status === 'Cancelled' ? '#f87171' : 'var(--primary)',
                                        border: `1px solid ${inv.status === 'Paid' ? 'rgba(34, 197, 94, 0.3)' :
                                                             inv.status === 'Issued' ? 'rgba(59, 130, 246, 0.3)' :
                                                             inv.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                                    }}>
                                        {inv.status}
                                    </span>
                                </td>

                                {/* Actions */}
                                <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                                        {/* Download PDF */}
                                        <button
                                            onClick={() => generateTaxInvoicePDF(inv, selectedCompany)}
                                            title="Download GST Tax Invoice PDF"
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
                                            onClick={() => shareOnWhatsApp(inv)}
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
                                            <MessageSquare size={13} />
                                        </button>

                                        {/* Update Status / Settle */}
                                        <button
                                            onClick={() => {
                                                setSelectedInvoice(inv);
                                                setNewStatus(inv.status === 'Issued' ? 'Paid' : inv.status);
                                                setShowStatusModal(true);
                                            }}
                                            title="Settle / Change Status"
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                color: 'white',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                padding: '6px 10px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '12px'
                                            }}
                                        >
                                            <CheckCircle size={13} />
                                        </button>

                                        {/* View Details */}
                                        <button
                                            onClick={() => {
                                                setSelectedInvoice(inv);
                                                setShowDetailModal(true);
                                            }}
                                            title="View Invoice Details"
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                color: 'white',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                padding: '6px 10px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '12px'
                                            }}
                                        >
                                            <ArrowUpRight size={13} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal: Direct Tax Invoice Creation */}
            <AnimatePresence>
                {showCreateModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px' }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px', marginBottom: '20px' }}>
                                <div>
                                    <h2 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <FileText size={22} color="var(--primary)" />
                                        Generate Direct GST Tax Invoice
                                    </h2>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0', fontSize: '12px' }}>
                                        SAC Code 996601 | Sequential Format: LK-INV-2026-XXXXX
                                    </p>
                                </div>
                                <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={22} /></button>
                            </div>

                            <form onSubmit={handleCreateDirectInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                {/* Receiver / Billed To Section */}
                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '12px' }}>
                                        Receiver Details (Billed To)
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Guest / Contact Name *</label>
                                            <input required type="text" placeholder="e.g. Rahul Sharma" value={createForm.billTo.name} onChange={e => setCreateForm({ ...createForm, billTo: { ...createForm.billTo, name: e.target.value } })} style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Company / Organization</label>
                                            <input type="text" placeholder="e.g. Handmath Technologies" value={createForm.billTo.companyName} onChange={e => setCreateForm({ ...createForm, billTo: { ...createForm.billTo, companyName: e.target.value } })} style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Mobile Number *</label>
                                            <input required type="text" placeholder="e.g. 9876543210" value={createForm.billTo.mobile} onChange={e => setCreateForm({ ...createForm, billTo: { ...createForm.billTo, mobile: e.target.value } })} style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Email ID</label>
                                            <input type="email" placeholder="client@example.com" value={createForm.billTo.email} onChange={e => setCreateForm({ ...createForm, billTo: { ...createForm.billTo, email: e.target.value } })} style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Client GSTIN (Optional)</label>
                                            <input type="text" placeholder="08AAAAA0000A1Z5" value={createForm.billTo.gstin} onChange={e => setCreateForm({ ...createForm, billTo: { ...createForm.billTo, gstin: e.target.value.toUpperCase() } })} style={{ ...inputStyle, textTransform: 'uppercase' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Place of Supply (State)</label>
                                            <input type="text" value={createForm.billTo.placeOfSupply} onChange={e => setCreateForm({ ...createForm, billTo: { ...createForm.billTo, placeOfSupply: e.target.value } })} style={inputStyle} />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Billing Address</label>
                                            <input type="text" placeholder="Office / Hotel / Residential Address" value={createForm.billTo.address} onChange={e => setCreateForm({ ...createForm, billTo: { ...createForm.billTo, address: e.target.value } })} style={inputStyle} />
                                        </div>
                                    </div>
                                </div>

                                {/* Service Line Items */}
                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase' }}>
                                            Service Line Items (SAC 996601)
                                        </div>
                                        <button type="button" onClick={handleAddItem} className="secondary-btn" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Plus size={13} /> Add Item
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {createForm.items.map((item, idx) => (
                                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 70px 100px 100px 36px', gap: '8px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '10px' }}>
                                                <input
                                                    type="text"
                                                    placeholder="Description of service..."
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                                    style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="SAC"
                                                    value={item.sacCode}
                                                    onChange={(e) => handleItemChange(idx, 'sacCode', e.target.value)}
                                                    style={{ ...inputStyle, padding: '8px 6px', fontSize: '11px', textAlign: 'center', fontFamily: 'monospace' }}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Qty"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                                    style={{ ...inputStyle, padding: '8px 6px', fontSize: '12px', textAlign: 'center' }}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Rate ₹"
                                                    value={item.rate || ''}
                                                    onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                                                    style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', textAlign: 'right' }}
                                                />
                                                <div style={{ textAlign: 'right', fontWeight: '800', fontSize: '13px', color: 'white' }}>
                                                    ₹{(item.amount || 0).toLocaleString('en-IN')}
                                                </div>
                                                {createForm.items.length > 1 ? (
                                                    <button type="button" onClick={() => handleRemoveItem(idx)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}>
                                                        <Trash2 size={15} />
                                                    </button>
                                                ) : <div />}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Commercials & Calculation Preview */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase' }}>
                                            Tax & Commercial Settings
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <div>
                                                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>GST Mode</label>
                                                <select
                                                    value={createForm.gstMode}
                                                    onChange={(e) => setCreateForm({ ...createForm, gstMode: e.target.value })}
                                                    className="premium-compact-input"
                                                    style={{ width: '100%', height: '42px' }}
                                                >
                                                    <option value="GST Extra">GST Extra (On Top)</option>
                                                    <option value="GST Inclusive">GST Inclusive</option>
                                                    <option value="No GST">No GST / Cash Memo</option>
                                                    <option value="RCM">RCM (Reverse Charge)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>GST Rate (%)</label>
                                                <select
                                                    value={createForm.gstRate}
                                                    onChange={(e) => setCreateForm({ ...createForm, gstRate: Number(e.target.value) })}
                                                    className="premium-compact-input"
                                                    style={{ width: '100%', height: '42px' }}
                                                >
                                                    <option value={5}>5% (SAC 996601 Transport)</option>
                                                    <option value={12}>12% (With ITC)</option>
                                                    <option value={18}>18% (Corporate / Package)</option>
                                                    <option value={0}>0%</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
                                            <input
                                                type="checkbox"
                                                id="interstateCheck"
                                                checked={createForm.isInterState}
                                                onChange={(e) => setCreateForm({ ...createForm, isInterState: e.target.checked })}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                            <label htmlFor="interstateCheck" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', cursor: 'pointer' }}>
                                                Inter-State Supply (Apply IGST instead of CGST+SGST)
                                            </label>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Less: Advance Paid / Adjusted (₹)</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={createForm.advanceAdjusted || ''}
                                                onChange={(e) => setCreateForm({ ...createForm, advanceAdjusted: e.target.value })}
                                                style={inputStyle}
                                            />
                                        </div>
                                    </div>

                                    {/* Preview Calculation Box */}
                                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '12px' }}>
                                                Invoice Calculation Preview
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)' }}>
                                                    <span>Taxable Value:</span>
                                                    <span style={{ fontWeight: '700', color: 'white' }}>₹{modalTaxable.toLocaleString('en-IN')}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)' }}>
                                                    <span>Total GST ({createForm.gstRate}%):</span>
                                                    <span style={{ fontWeight: '700', color: 'var(--primary)' }}>₹{modalTax.toLocaleString('en-IN')}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', fontWeight: '800' }}>
                                                    <span>Invoice Total:</span>
                                                    <span style={{ color: 'white' }}>₹{modalTotal.toLocaleString('en-IN')}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80', fontWeight: '700' }}>
                                                    <span>Less: Advance Adjusted:</span>
                                                    <span>(-) ₹{(Number(createForm.advanceAdjusted) || 0).toLocaleString('en-IN')}</span>
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    borderTop: '1px solid rgba(255,255,255,0.1)',
                                                    padding: '10px 12px',
                                                    borderRadius: '10px',
                                                    background: 'rgba(245, 158, 11, 0.15)',
                                                    color: 'var(--primary)',
                                                    fontWeight: '900',
                                                    fontSize: '15px'
                                                }}>
                                                    <span>Net Balance Due:</span>
                                                    <span>₹{modalNetPayable.toLocaleString('en-IN')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            className="primary-btn"
                                            style={{
                                                marginTop: '16px',
                                                height: '46px',
                                                borderRadius: '12px',
                                                fontWeight: '800',
                                                fontSize: '13px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <ShieldCheck size={18} /> Issue Tax Invoice & Download PDF
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Status Update & Settle */}
            <AnimatePresence>
                {showStatusModal && selectedInvoice && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px' }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '100%', maxWidth: '480px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '25px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '16px' }}>
                                <h3 style={{ color: 'white', margin: 0, fontSize: '17px', fontWeight: '800' }}>Update Invoice Status</h3>
                                <button onClick={() => setShowStatusModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            <form onSubmit={handleUpdateStatus} style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                                <div>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase' }}>Invoice Number</div>
                                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary)', marginTop: '2px' }}>{selectedInvoice.invoiceNumber}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '2px' }}>
                                        Net Balance Due: ₹{(selectedInvoice.netPayable || 0).toLocaleString('en-IN')}
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Target Status</label>
                                    <select
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value)}
                                        className="premium-compact-input"
                                        style={{ width: '100%', height: '42px' }}
                                    >
                                        <option value="Paid">Paid (Full Settlement)</option>
                                        <option value="Issued">Issued</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>

                                {newStatus === 'Paid' && (
                                    <>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Payment Mode</label>
                                            <select
                                                value={paymentMode}
                                                onChange={(e) => setPaymentMode(e.target.value)}
                                                className="premium-compact-input"
                                                style={{ width: '100%', height: '42px' }}
                                            >
                                                <option value="Bank Transfer / NEFT">Bank Transfer / NEFT / IMPS</option>
                                                <option value="UPI / QR">UPI / QR Code</option>
                                                <option value="Cash">Cash</option>
                                                <option value="Cheque">Cheque</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Payment Reference / UTR</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. UTR12345678"
                                                value={paymentRef}
                                                onChange={(e) => setPaymentRef(e.target.value)}
                                                style={inputStyle}
                                            />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Remarks / Note</label>
                                    <input
                                        type="text"
                                        placeholder="Optional internal remark"
                                        value={statusNotes}
                                        onChange={(e) => setStatusNotes(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowStatusModal(false)} className="secondary-btn" style={{ flex: 1, padding: '12px' }}>Cancel</button>
                                    <button type="submit" className="primary-btn" style={{ flex: 1, padding: '12px', fontWeight: '800' }}>Confirm Update</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Invoice Detail Inspection */}
            <AnimatePresence>
                {showDetailModal && selectedInvoice && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px' }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card" style={{ width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '25px', fontSize: '13px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '14px', marginBottom: '18px' }}>
                                <div>
                                    <h3 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FileText size={20} color="var(--primary)" />
                                        Invoice {selectedInvoice.invoiceNumber}
                                    </h3>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '2px' }}>
                                        Date: {new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-IN')} | Ref: {selectedInvoice.bookingId || 'Direct Walk-In'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => generateTaxInvoicePDF(selectedInvoice, selectedCompany)} className="primary-btn" style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Download size={13} /> PDF
                                    </button>
                                    <button onClick={() => setShowDetailModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {/* Receiver Details */}
                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '6px' }}>Billed To</div>
                                    <div style={{ fontWeight: '800', fontSize: '15px', color: 'white' }}>{selectedInvoice.billTo?.companyName || selectedInvoice.billTo?.name}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>Mobile: {selectedInvoice.billTo?.mobile} {selectedInvoice.billTo?.email && `| Email: ${selectedInvoice.billTo.email}`}</div>
                                    {selectedInvoice.billTo?.gstin && <div style={{ color: 'var(--primary)', fontFamily: 'monospace', marginTop: '4px' }}>GSTIN: {selectedInvoice.billTo.gstin}</div>}
                                    {selectedInvoice.billTo?.address && <div style={{ color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{selectedInvoice.billTo.address}</div>}
                                </div>

                                {/* Items Table */}
                                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <thead style={{ background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.6)' }}>
                                            <tr>
                                                <th style={{ padding: '10px 14px' }}>Service Description</th>
                                                <th style={{ padding: '10px 14px', textAlign: 'center' }}>SAC</th>
                                                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Qty</th>
                                                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Rate</th>
                                                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody style={{ background: 'rgba(0,0,0,0.2)' }}>
                                            {selectedInvoice.items?.map((item, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '10px 14px', color: 'white', fontWeight: '600' }}>{item.description}</td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>{item.sacCode}</td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>{item.quantity}</td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>₹{(item.rate || 0).toLocaleString('en-IN')}</td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800', color: 'white' }}>₹{(item.amount || 0).toLocaleString('en-IN')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Summary Grid */}
                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Taxable</div>
                                        <div style={{ fontWeight: '800', color: 'white', marginTop: '4px' }}>₹{(selectedInvoice.taxableAmount || 0).toLocaleString('en-IN')}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>GST ({selectedInvoice.gstRate || 5}%)</div>
                                        <div style={{ fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>₹{(selectedInvoice.totalTaxAmount || 0).toLocaleString('en-IN')}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Total</div>
                                        <div style={{ fontWeight: '800', color: 'white', marginTop: '4px' }}>₹{(selectedInvoice.totalAmount || 0).toLocaleString('en-IN')}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Balance Due</div>
                                        <div style={{ fontWeight: '900', color: selectedInvoice.netPayable > 0 ? '#f87171' : '#4ade80', marginTop: '4px' }}>
                                            ₹{(selectedInvoice.netPayable || 0).toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
