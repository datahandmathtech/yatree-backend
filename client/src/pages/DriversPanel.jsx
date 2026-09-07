import React from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { User, Car, IndianRupee, Users, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';

import Drivers from './Drivers';
import Reports from './Reports';
import DriverSalaries from './DriverSalaries';
import DriverPerformance from './DriverPerformance';

import { X } from 'lucide-react'; // Added X for modal

const Chip = ({ label, value, color, onClick }) => (
    <div 
        onClick={onClick}
        style={{ 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid rgba(255,255,255,0.08)', 
            padding: '18px 30px', 
            borderRadius: '16px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px', 
            minWidth: '180px',
            cursor: onClick ? 'pointer' : 'default',
            transition: 'background 0.2s ease',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}
        onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
        onMouseLeave={(e) => { if (onClick) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
    >
        <span style={{ fontSize: '13px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</span>
        <span style={{ fontSize: '28px', fontWeight: '950', color: color, letterSpacing: '-0.5px' }}>{value}</span>
    </div>
);

const DriversPanel = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'drivers';
    const [salaryStats, setSalaryStats] = React.useState({ sdr: 0, nights: 0, sdrBreakdown: [], nightsBreakdown: [] });
    const [showBreakdownModal, setShowBreakdownModal] = React.useState(false);
    const [breakdownType, setBreakdownType] = React.useState('DA'); // 'DA' or 'NIGHTS'

    const setActiveTab = (tab) => {
        setSearchParams({ tab });
    };

    const navItems = [
        { id: 'drivers', title: 'DRIVERS', icon: User },
        // { id: 'dutys', title: 'DUTYS', icon: Car },
        { id: 'settlement', title: 'Salaries', icon: IndianRupee },
        { id: 'performance', title: 'Performance', icon: AlertCircle }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'drivers':
                return <Drivers isSubComponent={true} />;
            case 'dutys':
                return <Reports isSubComponent={true} />;
            case 'settlement':
                return <DriverSalaries isSubComponent={true} onStatsUpdate={setSalaryStats} />;
            case 'performance':
                return <DriverPerformance />;
            default:
                return null;
        }
    };

    return (
        <div className="container-fluid" style={{ minHeight: '100vh', padding: '40px 20px', position: 'relative' }}>
            <SEO title="Drivers Dashboard" description="Access driver profiles, duty logs, and salary settlements." />

            <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'rgba(251, 191, 36, 0.1)',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'var(--primary)'
                    }}>
                        <Users size={20} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'white', letterSpacing: '-0.5px', margin: 0 }}>
                            Drivers <span className="text-gradient-yellow">Hub</span>
                        </h1>
                    </div>
                </div>

                {activeTab === 'settlement' && (
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <Chip 
                            label={`TOTAL DA (${salaryStats.sdrCount || 0})`} 
                            value={`₹ ${(salaryStats.sdr || 0).toLocaleString()}`} 
                            color="#10b981" 
                            onClick={() => { setBreakdownType('DA'); setShowBreakdownModal(true); }}
                        />
                        <Chip 
                            label={`TOTAL NIGHTS (${salaryStats.nightsCount || 0})`} 
                            value={`₹ ${(salaryStats.nights || 0).toLocaleString()}`} 
                            color="var(--primary)" 
                            onClick={() => { setBreakdownType('NIGHTS'); setShowBreakdownModal(true); }}
                        />
                    </div>
                )}
            </header>

            {/* Selection Bar (Tab Switcher) */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px',
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                width: 'fit-content',
                gap: '4px',
                marginBottom: '40px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}>
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            border: 'none',
                            background: activeTab === item.id ? 'rgba(251, 191, 36, 0.12)' : 'transparent',
                            color: activeTab === item.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.4)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontWeight: '800',
                            fontSize: '12px',
                            letterSpacing: '0.5px'
                        }}
                    >
                        <item.icon size={16} />
                        {item.title}
                    </button>
                ))}
            </div>

            {/* Dynamic Content Area */}
            <div>
                {renderContent()}
            </div>

            {/* Breakdown Modal */}
            {showBreakdownModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        style={{
                            background: '#0f172a',
                            borderRadius: '24px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            width: '100%',
                            maxWidth: '500px',
                            maxHeight: '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}
                    >
                        <div style={{ padding: '25px 30px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '20px', fontWeight: '800' }}>
                                    {breakdownType === 'DA' ? 'DA Amount' : 'Nights Amount'} Breakdown
                                </h3>
                                <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                                    Total Amount: ₹{breakdownType === 'DA' ? (salaryStats.sdr || 0).toLocaleString() : (salaryStats.nights || 0).toLocaleString()}
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowBreakdownModal(false)}
                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div style={{ padding: '20px 30px', overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
                            {(breakdownType === 'DA' ? salaryStats.sdrBreakdown : salaryStats.nightsBreakdown)?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {(breakdownType === 'DA' ? salaryStats.sdrBreakdown : salaryStats.nightsBreakdown).map((item, idx) => (
                                        <div key={idx} style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center', 
                                            padding: '15px 20px', 
                                            background: 'rgba(255,255,255,0.02)', 
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255,255,255,0.03)'
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ color: 'white', fontWeight: '700', fontSize: '15px' }}>{item.name || 'Unknown'}</span>
                                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: '600' }}>{item.count} {breakdownType === 'DA' ? 'Days' : 'Nights'}</span>
                                            </div>
                                            <span style={{ color: breakdownType === 'DA' ? '#10b981' : 'var(--primary)', fontWeight: '900', fontSize: '18px' }}>
                                                ₹{item.amount.toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)' }}>
                                    No records found for the selected period.
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};


export default DriversPanel;
