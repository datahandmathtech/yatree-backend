import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ArrowUpRight, ArrowDownLeft, MapPin, Car, Fuel, ParkingSquare,
    IndianRupee, TrendingUp, Moon, Zap, Camera, CheckCircle2, Clock,
    Edit2, Trash2
} from 'lucide-react';

import { formatDateIST, formatTimeIST } from '../../utils/istUtils';

/* ─── tiny helpers ─── */
const fmt = (d) => formatDateIST(d);
const fmtTime = (t) => t ? formatTimeIST(t) : '--';

/* ─── Photo card ─── */
const PhotoCard = ({ url, label, onView }) => {
    if (!url) return null;
    return (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }} 
            onClick={() => onView ? onView(url) : window.open(url, '_blank')}>
            <div style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 2, background: 'rgba(0,0,0,0.7)', padding: '3px 8px', borderRadius: '6px', fontSize: '9px', color: 'rgba(255,255,255,0.8)', fontWeight: '800', textTransform: 'uppercase' }}>{label}</div>
            <img src={url} alt={label} style={{ width: '100%', height: '130px', objectFit: 'cover', transition: 'transform 0.3s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                loading="lazy" />
        </div>
    );
};

/* ─── Stat row ─── */
const Stat = ({ label, value, color = 'white', sub }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>{label}</span>
        <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '13px', color, fontWeight: '800' }}>{value}</span>
            {sub && <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>{sub}</div>}
        </div>
    </div>
);

/* ─── Section header ─── */
const SH = ({ color, icon: Icon, title, time }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${color}20`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Icon size={14} color={color} />
            </div>
            <span style={{ color, fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
        </div>
        {time && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>{time}</span>}
    </div>
);

/* ═══════════════════════════════ MAIN MODAL */
const AttendanceModal = ({ item, onClose, onEdit, onDelete }) => {
    const [viewerUrl, setViewerUrl] = React.useState(null);
    const [activeDutyIdx, setActiveDutyIdx] = React.useState(0);
    if (!item) return null;

    const isGroup = item.entryType === 'attendance_group';
    const isAttendance = item.entryType === 'attendance' || isGroup;

    const openKM = isGroup ? item.attendances[0]?.punchIn?.km : item.punchIn?.km;
    const closeKM = isGroup ? item.attendances[item.attendances.length - 1]?.punchOut?.km : item.punchOut?.km;
    const totalKM = item.totalKM ?? (typeof openKM === 'number' && typeof closeKM === 'number' ? Math.max(0, closeKM - openKM) : null);

    const salary = Number(item.dailyWage) || 0;
    const otAmt = isGroup 
        ? (item.attendances || []).reduce((sum, a) => sum + (Number(a.otAmount) || 0), 0)
        : (Number(item.otAmount) || 0);
    const otHours = isGroup
        ? (item.attendances || []).reduce((sum, a) => sum + (Number(a.otHours) || 0), 0)
        : (Number(item.otHours) || 0);

    // For single attendance
    const allowanceTA = Number(item.punchOut?.allowanceTA) || 0;
    const nightStay = Number(item.punchOut?.nightStayAmount) || 0;
    const outsideBonusTotal = Number(item.outsideTrip?.bonusAmount) || 0;
    const extraBonus = Math.max(0, outsideBonusTotal - allowanceTA - nightStay);
    const bonus = isGroup ? (item.bonusAmt || 0) : (allowanceTA + nightStay + extraBonus);

    const fuelAmt = isGroup ? (item.fuelAmt || 0) : (Number(item.fuel?.amount) || 0);
    const parkingAmt = isGroup ? (item.parkAmt || 0) : (Number(item.punchOut?.tollParkingAmount) || 0);
    const parkingBy = isGroup ? 'Mixed' : (item.punchOut?.parkingPaidBy || 'Self');

    const isCompleted = isGroup ? (item.status !== 'incomplete') : (item.status === 'completed');
    const totalPayable = salary + bonus + otAmt + (isGroup ? (item.parkAmt || 0) : (parkingBy !== 'Office' ? parkingAmt : 0));

    /* render per entry-type */
    const renderBody = () => {
        if (isGroup) return renderGroup();
        if (isAttendance) return renderAttendance(item);
        if (item.entryType === 'fuel') return renderFuel();
        if (item.entryType === 'advance') return renderAdvance();
        if (item.entryType === 'parking') return renderParking();
        if (item.entryType === 'maintenance') return renderMaintenance();
        if (item.entryType === 'borderTax') return renderBorderTax();
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                <p>Details for <strong>{item.entryType}</strong> record.</p>
                <pre style={{ fontSize: '10px', textAlign: 'left', overflow: 'auto', maxHeight: '300px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '15px' }}>
                    {JSON.stringify(item, null, 2)}
                </pre>
            </div>
        );
    };

    const renderGroup = () => (
        <div style={{ padding: '0 24px 24px' }}>
            {/* --- Consolidated Summary Bar --- */}
            <div style={{
                background: 'rgba(16,185,129,0.08)',
                borderRadius: '20px',
                padding: '18px 24px',
                border: '1px solid rgba(16,185,129,0.15)',
                margin: '20px 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ padding: '10px', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', color: '#10b981' }}>
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <div style={{ color: 'white', fontSize: '18px', fontWeight: '950' }}>{item.attendances.length} Duties Completed</div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Daily Performance Summary</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'white', fontSize: '18px', fontWeight: '950' }}>{totalKM || 0} km</div>
                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: '900' }}>TOTAL KM</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#f59e0b', fontSize: '18px', fontWeight: '950' }}>₹{fuelAmt + parkingAmt}</div>
                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: '900' }}>TOTAL EXP.</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#10b981', fontSize: '26px', fontWeight: '950' }}>₹{totalPayable.toLocaleString()}</div>
                        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', fontWeight: '800' }}>NET PAYABLE TODAY</div>
                    </div>
                </div>
            </div>

            {/* --- Duty Switcher Tabs --- */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px' }} className="no-scrollbar">
                {item.attendances.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setActiveDutyIdx(i)}
                        style={{
                            padding: '10px 18px',
                            borderRadius: '12px',
                            background: activeDutyIdx === i ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${activeDutyIdx === i ? '#10b98150' : 'rgba(255,255,255,0.06)'}`,
                            color: activeDutyIdx === i ? '#10b981' : 'rgba(255,255,255,0.5)',
                            fontSize: '12px',
                            fontWeight: '900',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: '0.2s'
                        }}
                    >
                        Duty #{i + 1}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeDutyIdx}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 20px 10px' }}>
                            <div style={{ background: '#0f172a', color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: '900', letterSpacing: '1px' }}>
                                SHOWING EVIDENCE FOR DUTY #{activeDutyIdx + 1}
                            </div>
                            
                            {item.mode === 'edit' && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => onEdit({ ...item.attendances[activeDutyIdx], isSecondary: activeDutyIdx > 0 })} style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '800' }}>
                                        <Edit2 size={12} /> Edit Duty #{activeDutyIdx + 1}
                                    </button>
                                    <button onClick={() => onDelete({ ...item.attendances[activeDutyIdx], entryType: 'attendance'})} style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '800' }}>
                                        <Trash2 size={12} /> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                            {renderAttendance(item.attendances[activeDutyIdx], true)}
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );

    const renderAttendance = (attItem, isNested = false) => {
        const aOpenKM = attItem.punchIn?.km;
        const aCloseKM = attItem.punchOut?.km;
        const aTotalKM = (typeof aOpenKM === 'number' && typeof aCloseKM === 'number' ? Math.max(0, aCloseKM - aOpenKM) : null);
        const aIsCompleted = attItem.status === 'completed';

        const aSalary = Number(attItem.dailyWage) || 0;
        const aOtAmt = Number(attItem.otAmount) || 0;
        const aOtHours = Number(attItem.otHours) || 0;
        const aAllowanceTA = Number(attItem.punchOut?.allowanceTA) || 0;
        const aNightStay = Number(attItem.punchOut?.nightStayAmount) || 0;
        const aOutsideBonusTotal = Number(attItem.outsideTrip?.bonusAmount) || 0;
        const aExtraBonus = Math.max(0, aOutsideBonusTotal - aAllowanceTA - aNightStay);
        const aBonus = aAllowanceTA + aNightStay + aExtraBonus;
        const aFuelAmt = Number(attItem.fuel?.amount) || 0;
        const aParkingAmt = Number(attItem.punchOut?.tollParkingAmount) || 0;
        const aParkingBy = attItem.punchOut?.parkingPaidBy || 'Self';
        const aTotalPayable = (isNested ? 0 : aSalary) + aBonus + aOtAmt + (aParkingBy !== 'Office' ? aParkingAmt : 0);

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', padding: isNested ? '0' : '24px' }}>
                {/* ── LEFT: Punch In ── */}
                <div style={{ background: 'rgba(16,185,129,0.04)', borderRadius: '18px', padding: '22px', border: '1px solid rgba(16,185,129,0.1)' }}>
                    <SH color="#10b981" icon={ArrowUpRight} title="Punch-In Proof" time={fmtTime(attItem.punchIn?.time)} />
                    {(attItem.punchIn?.selfie || attItem.punchIn?.kmPhoto || attItem.punchIn?.carSelfie) && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                            <PhotoCard onView={setViewerUrl} url={attItem.punchIn?.selfie} label="Driver Selfie" />
                            <PhotoCard onView={setViewerUrl} url={attItem.punchIn?.kmPhoto} label="Start KM" />
                            {attItem.punchIn?.carSelfie && <div style={{ gridColumn: '1/-1' }}><PhotoCard onView={setViewerUrl} url={attItem.punchIn.carSelfie} label="Vehicle" /></div>}
                        </div>
                    )}
                    <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '14px' }}>
                        <Stat label="Opening KM" value={aOpenKM != null ? `${aOpenKM} km` : '--'} color="#38bdf8" />
                        <Stat label="Date" value={fmt(attItem.date)} />
                        {attItem.vehicle?.carNumber && <Stat label="Vehicle" value={attItem.vehicle.carNumber} color="white" />}
                    </div>
                </div>

                {/* ── MIDDLE: Punch Out ── */}
                <div style={{ background: aIsCompleted ? 'rgba(244,63,94,0.04)' : 'rgba(245,158,11,0.03)', borderRadius: '18px', padding: '22px', border: `1px solid ${aIsCompleted ? 'rgba(244,63,94,0.1)' : 'rgba(245,158,11,0.1)'}` }}>
                    <SH color={aIsCompleted ? '#f43f5e' : '#f59e0b'} icon={ArrowDownLeft} title={aIsCompleted ? 'Punch-Out Proof' : 'On Duty'} time={fmtTime(attItem.punchOut?.time)} />
                    {aIsCompleted ? (
                        <>
                            {(attItem.punchOut?.selfie || attItem.punchOut?.kmPhoto || attItem.punchOut?.carSelfie || attItem.punchOut?.parkingReceipt) && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                                    <PhotoCard onView={setViewerUrl} url={attItem.punchOut?.selfie} label="Driver Selfie" />
                                    <PhotoCard onView={setViewerUrl} url={attItem.punchOut?.kmPhoto} label="Close KM" />
                                    <PhotoCard onView={setViewerUrl} url={attItem.punchOut?.carSelfie} label="Vehicle" />
                                    <PhotoCard onView={setViewerUrl} url={attItem.punchOut?.parkingReceipt} label="Parking Slip" />
                                </div>
                            )}
                            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '14px' }}>
                                <Stat label="Closing KM" value={aCloseKM != null ? `${aCloseKM} km` : '--'} color="#f43f5e" />
                                <Stat label="Shift Run" value={aTotalKM != null ? `${aTotalKM} km` : '--'} color="white"
                                    sub={aOpenKM != null && aCloseKM != null ? `${aOpenKM} → ${aCloseKM}` : undefined} />
                                {(attItem.remarks || attItem.punchOut?.remarks || attItem.punchIn?.remarks || attItem.punchOut?.otherRemarks) && (
                                    <Stat label="Duty Remarks" value={(attItem.punchOut?.remarks && attItem.punchOut.remarks !== 'Manual Entry' ? attItem.punchOut.remarks : '') + (attItem.punchOut?.otherRemarks ? (attItem.punchOut.remarks && attItem.punchOut.remarks !== 'Manual Entry' ? ' | ' : '') + attItem.punchOut.otherRemarks : '') || attItem.remarks || attItem.punchIn?.remarks} color="#fbbf24" />
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(245,158,11,0.03)', borderRadius: '14px', border: '1px dashed rgba(245,158,11,0.15)' }}>
                            <Clock size={32} color="rgba(245,158,11,0.4)" style={{ marginBottom: '10px' }} />
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', fontWeight: '700', margin: 0 }}>Duty still in progress…</p>
                        </div>
                    )}
                </div>

                {/* ── RIGHT: Expenses + Salary ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Fuel (This Shift) */}
                    {(aFuelAmt > 0 || (attItem.fuel?.entries && attItem.fuel.entries.length > 0)) && (
                        <div style={{ background: 'rgba(245,158,11,0.05)', borderRadius: '18px', padding: '20px', border: '1px solid rgba(245,158,11,0.1)' }}>
                            <SH color="#f59e0b" icon={Fuel} title="Fuel (This Shift)" />
                            <Stat label="Amount" value={`₹${aFuelAmt}`} color="#f59e0b" />
                            {(attItem.fuel?.entries || []).map((fe, i) => (
                                <div key={i} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '10px', marginTop: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Fill #{i + 1}</span>
                                        <span style={{ color: '#f59e0b' }}>₹{fe.amount}</span>
                                    </div>
                                    {fe.slipPhoto && <div style={{ marginTop: '8px' }}><PhotoCard onView={setViewerUrl} url={fe.slipPhoto} label="Fuel Slip" /></div>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Parking (This Shift) */}
                    {aParkingAmt > 0 && (
                        <div style={{ background: 'rgba(129,140,248,0.05)', borderRadius: '18px', padding: '20px', border: '1px solid rgba(129,140,248,0.1)' }}>
                            <SH color="#818cf8" icon={MapPin} title="Parking (This Shift)" />
                            <Stat label="Amount" value={`₹${aParkingAmt}`} color="#818cf8" />
                            <Stat label="Paid By" value={aParkingBy} color={aParkingBy === 'Office' ? '#10b981' : '#a78bfa'} />
                        </div>
                    )}

                    {/* Bonuses (This Shift) */}
                    {(aBonus > 0) && (
                        <div style={{ background: 'rgba(34,197,94,0.05)', borderRadius: '18px', padding: '20px', border: '1px solid rgba(34,197,94,0.1)' }}>
                            <SH color="#22c55e" icon={Zap} title="Bonuses (This Shift)" />
                            {aAllowanceTA > 0 && <Stat label="T/A Allowance" value={`+₹${aAllowanceTA}`} color="#22c55e" />}
                            {aNightStay > 0 && <Stat label="O.T. / Night" value={`+₹${aNightStay}`} color="#fbbf24" />}
                            {aExtraBonus > 0 && <Stat label="Extra Bonus" value={`+₹${aExtraBonus}`} color="#38bdf8" sub={attItem.outsideTrip?.tripType} />}
                        </div>
                    )}

                    {/* Duty Settlement */}
                    {!isNested && (
                        <div style={{ background: 'rgba(16,185,129,0.06)', borderRadius: '18px', padding: '20px', border: '1px solid rgba(16,185,129,0.15)' }}>
                            <SH color="#10b981" icon={IndianRupee} title="Settlement" />
                            <Stat label="Daily Wage" value={`₹${aSalary}`} color="white" />
                            {aOtAmt > 0 && <Stat label="Overtime (O/T)" value={`+₹${aOtAmt}`} color="#f87171" sub={`${aOtHours} hrs extra`} />}
                            {aBonus > 0 && <Stat label="Total Bonus" value={`+₹${aBonus}`} color="#22c55e" />}
                            {aParkingBy !== 'Office' && aParkingAmt > 0 && <Stat label="Parking (Reimburse)" value={`+₹${aParkingAmt}`} color="#818cf8" />}
                            <div style={{ borderTop: '1px solid rgba(16,185,129,0.2)', marginTop: '8px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#10b981', fontWeight: '900', fontSize: '12px', textTransform: 'uppercase' }}>Duty Payable</span>
                                <span style={{ color: '#10b981', fontWeight: '900', fontSize: '22px' }}>₹{aTotalPayable.toLocaleString()}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderFuel = () => (
        <div style={{ padding: '24px' }}>
            <div style={{ background: 'rgba(34,197,94,0.06)', borderRadius: '18px', padding: '22px', border: '1px solid rgba(34,197,94,0.12)' }}>
                <SH color="#22c55e" icon={Fuel} title="Fuel Log Details" />
                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '14px' }}>
                    <Stat label="Date" value={fmt(item.date)} />
                    <Stat label="Vehicle" value={item.vehicle?.carNumber?.split('#')[0] || '--'} color="#38bdf8" />
                    <Stat label="Driver" value={item.driver?.name || '--'} />
                    <Stat label="Fuel Type" value={item.fuelType || 'Diesel'} color="#22c55e" />
                    <Stat label="Volume" value={item.quantity ? `${item.quantity} L` : '--'} color="#f59e0b" />
                    <Stat label="Amount" value={`₹${item.amount || 0}`} color="#22c55e" />
                    <Stat label="Odometer" value={item.odometer ? `${item.odometer} KM` : '--'} />
                    <Stat label="Payment" value={item.paymentMethod || item.paymentSource || '--'} />
                </div>
                {item.slipPhoto && <div style={{ marginTop: '16px' }}><PhotoCard onView={setViewerUrl} url={item.slipPhoto} label="Fuel Slip" /></div>}
            </div>
        </div>
    );

    const renderAdvance = () => (
        <div style={{ padding: '24px' }}>
            <div style={{ background: 'rgba(99,102,241,0.06)', borderRadius: '18px', padding: '22px', border: '1px solid rgba(99,102,241,0.12)' }}>
                <SH color="#6366f1" icon={IndianRupee} title="Advance Record" />
                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '14px' }}>
                    <Stat label="Date" value={fmt(item.date)} />
                    <Stat label="Driver" value={item.driver?.name || '--'} color="white" />
                    <Stat label="Amount" value={`₹${item.amount || 0}`} color="#6366f1" />
                    <Stat label="Type" value={item.advanceType || 'Office'} />
                    <Stat label="Given By" value={item.givenBy || '--'} />
                    <Stat label="Remark" value={item.remark || '--'} color="rgba(255,255,255,0.6)" />
                    <Stat label="Status" value={item.status || 'Pending'} color={item.status === 'Settled' ? '#10b981' : '#f59e0b'} />
                </div>
            </div>
        </div>
    );

    const renderParking = () => (
        <div style={{ padding: '24px' }}>
            <div style={{ background: 'rgba(6,182,212,0.06)', borderRadius: '18px', padding: '22px', border: '1px solid rgba(6,182,212,0.12)' }}>
                <SH color="#06b6d4" icon={MapPin} title="Parking Record" />
                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '14px' }}>
                    <Stat label="Date" value={fmt(item.date)} />
                    <Stat label="Vehicle" value={item.vehicle?.carNumber?.split('#')[0] || '--'} color="#38bdf8" />
                    <Stat label="Driver" value={item.driver || '--'} />
                    <Stat label="Amount" value={`₹${item.amount || 0}`} color="#06b6d4" />
                    <Stat label="Location" value={item.location || item.notes || '--'} />
                    <Stat label="Source" value={item.source || 'Admin'} />
                    <Stat label="Status" value={item.isReimbursable ? 'Reimbursable' : 'Office Cost'} color={item.isReimbursable ? '#10b981' : '#f59e0b'} />
                </div>
                {item.slipPhoto && <div style={{ marginTop: '16px' }}><PhotoCard onView={setViewerUrl} url={item.slipPhoto} label="Parking Slip" /></div>}
            </div>
        </div>
    );

    const renderMaintenance = () => (
        <div style={{ padding: '24px' }}>
            <div style={{ background: 'rgba(239,68,68,0.06)', borderRadius: '18px', padding: '22px', border: '1px solid rgba(239,68,68,0.12)' }}>
                <SH color="#ef4444" icon={Car} title="Maintenance Record" />
                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '14px' }}>
                    <Stat label="Bill Date" value={fmt(item.billDate || item.date)} />
                    <Stat label="Vehicle" value={item.vehicle?.carNumber?.split('#')[0] || '--'} color="#38bdf8" />
                    <Stat label="Type" value={item.maintenanceType || '--'} color="#ef4444" />
                    <Stat label="Description" value={item.description || '--'} />
                    <Stat label="Amount" value={`₹${item.cost || 0}`} color="#ef4444" />
                    <Stat label="Vendor" value={item.vendor || '--'} />
                </div>
                {item.receiptPhoto && <div style={{ marginTop: '16px' }}><PhotoCard onView={setViewerUrl} url={item.receiptPhoto} label="Bill / Receipt" /></div>}
            </div>
        </div>
    );

    const renderBorderTax = () => (
        <div style={{ padding: '24px' }}>
            <div style={{ background: 'rgba(168,85,247,0.06)', borderRadius: '18px', padding: '22px', border: '1px solid rgba(168,85,247,0.12)' }}>
                <SH color="#a855f7" icon={MapPin} title="Border Tax Record" />
                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '14px' }}>
                    <Stat label="Date" value={fmt(item.date)} />
                    <Stat label="Vehicle" value={item.vehicle?.carNumber?.split('#')[0] || '--'} color="#38bdf8" />
                    <Stat label="Border Name" value={item.borderName || '--'} color="#a855f7" />
                    <Stat label="Amount" value={`₹${item.amount || 0}`} color="#a855f7" />
                    <Stat label="Remarks" value={item.remarks || '--'} />
                </div>
                {item.receiptPhoto && <div style={{ marginTop: '16px' }}><PhotoCard onView={setViewerUrl} url={item.receiptPhoto} label="Receipt" /></div>}
            </div>
        </div>
    );

    /* ── modal title ── */
    const titleMap = {
        attendance: 'Duty Evidence Report',
        fuel: 'Fuel Log Details',
        advance: 'Advance Record',
        parking: 'Parking Record',
        maintenance: 'Maintenance Record',
        borderTax: 'Border Tax Record',
        accidentLog: 'Accident Log',

        fastag: 'Fastag Recharge',
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                style={{ width: '100%', maxWidth: isAttendance ? '1100px' : '600px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(145deg, #0f172a, #080c14)', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}
            >
                {/* Header */}
                <div style={{ padding: '22px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, background: 'linear-gradient(to right, #1e293b, #0f172a)', borderRadius: '28px 28px 0 0' }}>
                    <div>
                        <h2 style={{ color: 'white', fontSize: '20px', margin: 0, fontWeight: '900', letterSpacing: '-0.5px' }}>{titleMap[item.entryType] || 'Record Details'}</h2>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: '700', margin: '3px 0 0', textTransform: 'uppercase' }}>
                            {item.driver?.name || item.driverName || ''}{(item.driver?.name || item.driverName) && item.vehicle?.carNumber ? ' · ' : ''}{item.vehicle?.carNumber || ''}
                            {fmt(item.date) !== '--' ? ` · ${fmt(item.date)}` : ''}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                {renderBody()}

                {/* Footer */}
                <div style={{ padding: '18px 28px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '10px 26px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: 'none', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}>
                        Close
                    </button>
                </div>
            </motion.div>

            {/* Lightbox Viewer */}
            <AnimatePresence>
                {viewerUrl && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setViewerUrl(null)}
                        style={{ position: 'fixed', inset: 0, zIndex: 20000, background: 'rgba(0,0,0,0.92)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px', cursor: 'zoom-out' }}
                    >
                        <motion.img 
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            src={viewerUrl} 
                            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '12px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }} 
                        />
                        <button style={{ position: 'absolute', top: '30px', right: '30px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setViewerUrl(null)}>
                            <X size={24} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AttendanceModal;
