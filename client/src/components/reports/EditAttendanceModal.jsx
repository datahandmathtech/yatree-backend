import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Clock } from 'lucide-react';
import { toISTDateTimeString, formatDateIST, formatDateTimeIST } from '../../utils/istUtils';

const EditAttendanceModal = ({ item, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        remarks: item.punchOut?.otherRemarks || (item.punchOut?.remarks && item.punchOut.remarks !== 'Manual Entry' ? item.punchOut.remarks : '') || item.remarks || '',
        status: item.status || 'incomplete',
        startKm: item.punchIn?.km || 0,
        endKm: item.punchOut?.km || 0,
        date: item.date || '',
        dailyWage: item.isSecondary ? 0 : (item.dailyWage || 0),
        allowanceTA: item.punchOut?.allowanceTA || 0,
        nightStayAmount: item.punchOut?.nightStayAmount || 0,
        parkingAmount: item.punchOut?.tollParkingAmount || 0,
        punchInTime: toISTDateTimeString(item.punchIn?.time),
        punchOutTime: toISTDateTimeString(item.punchOut?.time),
        tripType: item.outsideTrip?.tripType || (item.outsideTrip?.occurred ? 'Same Day Return' : 'City Local')
    });

    const handleTypeChange = (newType) => {
        let ta = formData.allowanceTA;
        if (newType === 'City Local') ta = 0;
        else if (newType === 'Same Day Return') ta = 100;
        else if (newType === 'Night Hold') ta = 500;
        
        setFormData({ ...formData, tripType: newType, allowanceTA: ta });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            bonusAmount: Number(formData.allowanceTA || 0) + Number(formData.nightStayAmount || 0)
        };
        onUpdate(item._id, payload);
    };

    return (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 11000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="glass-card modal-content"
                style={{ width: '100%', maxWidth: '450px', maxHeight: '95vh', overflowY: 'auto', padding: '25px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>Edit Log Entry</h2>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', padding: '8px', borderRadius: '50%', display: 'flex', cursor: 'pointer' }}>
                        <X size={18} />
                    </button>
                </div>
                
                <div style={{ marginBottom: '25px', padding: '12px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '15px' }}>
                    <p style={{ margin: 0, fontSize: '9px', color: 'rgba(255,255,255,0.35)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Driver / Service Provider</p>
                    <p style={{ margin: '4px 0 0', color: '#fbbf24', fontSize: '15px', fontWeight: '800' }}>{item.driver?.name || 'Unknown Driver'}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '10px', color: 'rgba(14,165,233,0.7)', fontWeight: '700' }}>{item.vehicle?.carNumber?.split('#')[0] || 'No Vehicle'}</p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Duty Type (Selection)</label>
                    <select 
                        className="input-field"
                        value={formData.tripType}
                        onChange={(e) => handleTypeChange(e.target.value)}
                        style={{ width: '100%', height: '48px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', color: 'white', fontWeight: '800' }}
                    >
                        <option value="City Local" style={{ background: '#0f172a' }}>City Local (Base Only)</option>
                        <option value="Same Day Return" style={{ background: '#0f172a' }}>Same Day Return (+100 TA)</option>
                        <option value="Night Hold" style={{ background: '#0f172a' }}>Night Hold (+500 TA)</option>
                    </select>
                    <p style={{ margin: '6px 0 0', fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Changing this will auto-adjust the T/A amount.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
                    <div className="form-group">
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Duty Date</label>
                        <input
                            type="date"
                            className="input-field"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            style={{ width: '100%', marginBottom: 0, height: '48px', cursor: 'pointer' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}><Clock size={10} style={{marginRight: '4px'}}/> Punch In</label>
                            <input
                                type="datetime-local"
                                className="input-field"
                                value={formData.punchInTime}
                                onChange={(e) => setFormData({ ...formData, punchInTime: e.target.value })}
                                style={{ width: '100%', marginBottom: 0, height: '48px', cursor: 'pointer', fontSize: '12px' }}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}><Clock size={10} style={{marginRight: '4px'}}/> Punch Out</label>
                            <input
                                type="datetime-local"
                                className="input-field"
                                value={formData.punchOutTime}
                                onChange={(e) => setFormData({ ...formData, punchOutTime: e.target.value })}
                                style={{ width: '100%', marginBottom: 0, height: '48px', cursor: 'pointer', fontSize: '12px' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Start KM</label>
                            <input
                                type="number"
                                className="input-field"
                                value={formData.startKm}
                                onChange={(e) => setFormData({ ...formData, startKm: e.target.value })}
                                style={{ width: '100%', marginBottom: 0, height: '48px' }}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>End KM</label>
                            <input
                                type="number"
                                className="input-field"
                                value={formData.endKm}
                                onChange={(e) => setFormData({ ...formData, endKm: e.target.value })}
                                style={{ width: '100%', marginBottom: 0, height: '48px' }}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Daily Wage (Base Pay)</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="number"
                                className="input-field"
                                value={formData.dailyWage}
                                onChange={(e) => setFormData({ ...formData, dailyWage: e.target.value })}
                                disabled={item.isSecondary}
                                style={{ width: '100%', marginBottom: 0, height: '48px', opacity: item.isSecondary ? 0.5 : 1 }}
                            />
                            {item.isSecondary && (
                                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#fbbf24', fontWeight: '800' }}>
                                    Salary already included in Duty #1
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Financial Adjustments Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>T/A (₹)</label>
                            <input
                                type="number"
                                className="input-field"
                                value={formData.allowanceTA}
                                onChange={(e) => setFormData({ ...formData, allowanceTA: e.target.value })}
                                style={{ width: '100%', marginBottom: 0, height: '48px' }}
                                placeholder="0"
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Night (₹)</label>
                            <input
                                type="number"
                                className="input-field"
                                value={formData.nightStayAmount}
                                onChange={(e) => setFormData({ ...formData, nightStayAmount: e.target.value })}
                                style={{ width: '100%', marginBottom: 0, height: '48px' }}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Parking & Toll (₹)</label>
                        <input
                            type="number"
                            className="input-field"
                            value={formData.parkingAmount}
                            onChange={(e) => setFormData({ ...formData, parkingAmount: e.target.value })}
                            style={{ width: '100%', marginBottom: 0, height: '48px' }}
                            placeholder="0"
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Duty Remarks / Destination</label>
                        <textarea
                            className="input-field"
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            style={{ width: '100%', minHeight: '80px', marginBottom: 0, paddingTop: '12px' }}
                        />
                    </div>

                    <button type="submit" className="btn-primary" style={{ height: '52px', fontWeight: '900', marginTop: '10px', fontSize: '14px' }}>
                        SAVE UPDATED DETAILS
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default EditAttendanceModal;
