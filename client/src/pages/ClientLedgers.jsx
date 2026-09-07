import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, Search, Download, ExternalLink, Filter, Wallet, 
    IndianRupee, Calendar, FileText, ChevronRight, X, Plus
} from 'lucide-react';
import axios from '../api/axios';
import { useCompany } from '../context/CompanyContext';

const ClientLedgers = () => {
    const { selectedCompany } = useCompany();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentData, setPaymentData] = useState({ amount: '', description: '', date: '' });

    const fetchClients = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/clients/company/${selectedCompany._id}`);
            setClients(data);
        } catch (error) {
            console.error('Failed to fetch clients:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, [selectedCompany]);

    const fetchLedger = async (clientId) => {
        setLedgerLoading(true);
        try {
            const { data } = await axios.get(`/api/clients/${clientId}/ledger`);
            setLedgerEntries(data);
        } catch (error) {
            console.error('Failed to fetch ledger:', error);
        } finally {
            setLedgerLoading(false);
        }
    };

    const handleClientClick = (client) => {
        setSelectedClient(client);
        fetchLedger(client._id);
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`/api/clients/${selectedClient._id}/payment`, paymentData);
            setShowPaymentModal(false);
            setPaymentData({ amount: '', description: '', date: '' });
            fetchLedger(selectedClient._id);
            fetchClients(); // Update balance in main list
        } catch (error) {
            alert('Error adding payment');
        }
    };

    const filteredClients = clients.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.mobile.includes(searchTerm)
    );

    return (
        <div style={{ padding: '30px', maxWidth: '1600px', margin: '0 auto', color: 'white' }}>
            <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ padding: '12px', background: 'var(--primary)', borderRadius: '16px', color: '#000' }}>
                            <Wallet size={28} />
                        </div>
                        Client Ledgers & Billing
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '16px' }}>Manage client accounts, track GST billing, and record payments.</p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0 15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Search size={18} color="rgba(255,255,255,0.5)" />
                        <input 
                            type="text" 
                            placeholder="Search client or mobile..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'white', padding: '12px 10px', outline: 'none', width: '250px' }}
                        />
                    </div>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: selectedClient ? '400px 1fr' : '1fr', gap: '30px', transition: 'all 0.3s ease' }}>
                {/* Clients List */}
                <div className="premium-glass" style={{ padding: '20px', borderRadius: '24px', height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', padding: '0 10px' }}>Active Clients ({filteredClients.length})</h3>
                    
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading clients...</div>
                    ) : filteredClients.map(client => (
                        <motion.div
                            key={client._id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleClientClick(client)}
                            style={{
                                padding: '20px',
                                background: selectedClient?._id === client._id ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${selectedClient?._id === client._id ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}`,
                                borderRadius: '16px',
                                marginBottom: '15px',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <div>
                                <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: '700' }}>{client.name}</h4>
                                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{client.mobile}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Due Balance</div>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: client.balance > 0 ? '#f87171' : '#4ade80' }}>
                                    ₹{client.balance.toLocaleString('en-IN')}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Selected Client Ledger */}
                <AnimatePresence>
                    {selectedClient && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="premium-glass"
                            style={{ padding: '30px', borderRadius: '24px', height: 'calc(100vh - 200px)', overflowY: 'auto' }}
                        >
                            {/* Client Header Info */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', paddingBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <div>
                                    <h2 style={{ fontSize: '28px', fontWeight: '900', margin: '0 0 10px 0' }}>{selectedClient.name}</h2>
                                    <div style={{ display: 'flex', gap: '20px', color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                                        <span>📱 {selectedClient.mobile}</span>
                                        {selectedClient.gstNumber && <span>🏢 GST: {selectedClient.gstNumber}</span>}
                                    </div>
                                </div>
                                <button onClick={() => setSelectedClient(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Summary Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Total Billed</div>
                                    <div style={{ fontSize: '24px', fontWeight: '800' }}>₹{selectedClient.totalBilled.toLocaleString('en-IN')}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Total Received</div>
                                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#4ade80' }}>₹{selectedClient.totalPaid.toLocaleString('en-IN')}</div>
                                </div>
                                <div style={{ background: 'rgba(248, 113, 113, 0.1)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(248, 113, 113, 0.2)' }}>
                                    <div style={{ fontSize: '13px', color: '#fca5a5', marginBottom: '8px' }}>Pending Balance</div>
                                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#f87171' }}>₹{selectedClient.balance.toLocaleString('en-IN')}</div>
                                </div>
                            </div>

                            {/* Actions & Ledger Table */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Statement of Account</h3>
                                <button onClick={() => setShowPaymentModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
                                    <Plus size={16} /> Record Payment
                                </button>
                            </div>

                            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left' }}>
                                            <th style={{ padding: '15px 20px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Date</th>
                                            <th style={{ padding: '15px 20px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Particulars</th>
                                            <th style={{ padding: '15px 20px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Type</th>
                                            <th style={{ padding: '15px 20px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>Debit (Bill)</th>
                                            <th style={{ padding: '15px 20px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>Credit (Paid)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledgerLoading ? (
                                            <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading transactions...</td></tr>
                                        ) : ledgerEntries.length === 0 ? (
                                            <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>No transactions found.</td></tr>
                                        ) : (
                                            ledgerEntries.map((entry, idx) => (
                                                <tr key={entry._id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '15px 20px', fontSize: '14px' }}>{new Date(entry.date).toLocaleDateString()}</td>
                                                    <td style={{ padding: '15px 20px', fontSize: '14px' }}>
                                                        <div>{entry.description}</div>
                                                        {entry.type === 'Bill' && (
                                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                                                Base: ₹{entry.taxableAmount} | GST: ₹{entry.gstAmount}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '15px 20px', fontSize: '14px' }}>
                                                        <span style={{ 
                                                            padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                                                            background: entry.type === 'Bill' ? 'rgba(59, 130, 246, 0.2)' : 
                                                                        entry.type === 'Fuel' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                                            color: entry.type === 'Bill' ? '#60a5fa' : 
                                                                   entry.type === 'Fuel' ? '#fbbf24' : '#34d399'
                                                        }}>
                                                            {entry.type}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '15px 20px', fontSize: '14px', fontWeight: '700', textAlign: 'right' }}>
                                                        {entry.type === 'Bill' ? `₹${entry.amount.toLocaleString('en-IN')}` : '-'}
                                                    </td>
                                                    <td style={{ padding: '15px 20px', fontSize: '14px', fontWeight: '700', textAlign: 'right', color: '#4ade80' }}>
                                                        {entry.type !== 'Bill' ? `₹${entry.amount.toLocaleString('en-IN')}` : '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Payment Modal */}
            <AnimatePresence>
                {showPaymentModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="premium-glass" style={{ width: '400px', padding: '30px', borderRadius: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Record Payment</h3>
                                <button onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20}/></button>
                            </div>
                            <form onSubmit={handleAddPayment}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Amount (₹)</label>
                                    <input required type="number" value={paymentData.amount} onChange={e => setPaymentData({...paymentData, amount: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }} />
                                </div>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Date</label>
                                    <input required type="date" value={paymentData.date} onChange={e => setPaymentData({...paymentData, date: e.target.value})} onClick={e=>e.target.showPicker()} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }} />
                                </div>
                                <div style={{ marginBottom: '25px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Description / Ref</label>
                                    <input required type="text" placeholder="e.g. Bank Transfer Ref: 123456" value={paymentData.description} onChange={e => setPaymentData({...paymentData, description: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white' }} />
                                </div>
                                <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: '800', fontSize: '15px', cursor: 'pointer' }}>Save Payment</button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ClientLedgers;
