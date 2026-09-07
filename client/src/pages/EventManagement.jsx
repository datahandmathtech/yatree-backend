import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../api/axios';
import {
    Calendar, Plus, Search, Trash2, Edit, ChevronLeft, ChevronRight, Car, PlusCircle,
    User, MapPin, Target, Briefcase, X, Save, FileSpreadsheet, Users, Building2, TruckIcon, Wallet, Navigation, Download, FileText, IndianRupee, ArrowRight, Check
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany } from '../context/CompanyContext';
import SEO from '../components/SEO';
import * as XLSX from 'xlsx-js-style';
import PremiumDateInput from '../components/common/PremiumDateInput';
import {
    todayIST,
    toISTDateString,
    firstDayOfMonthIST,
    formatDateIST,
    nowIST,
    formatTimeIST,
    currentTimeIST
} from '../utils/istUtils';

const renderTime = (t) => {
    if (!t || t === 'undefined') return '—';
    const [h, m] = t.split(':');
    if (!h || !m) return t;
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hr12 = hour % 12 || 12;
    return `${hr12}:${m} ${ampm}`;
};

const VEHICLE_SUB_CATEGORIES = {
    Sedan: ['Compact Sedan', 'Luxury Sedan'],
    SUV: ['Ertiga', 'Innova', 'Innova Crysta', 'Fortuner'],
    Tempo: ['Tempo 12 Seater', 'Tempo 17 Seater', 'Urbania 12 Seater', 'Urbania 17 Seater'],
    Bus: ['Bus 35 Seater', 'Bus 45 Seater', 'Bus 50 Seater']
};

const isPDService = (serviceName) => {
    if (!serviceName) return false;
    const name = serviceName.toLowerCase();
    return name.includes('p/d') || 
           name.includes('pickup & drop') || 
           name.includes('pick/drop') || 
           name.includes('airport') || 
           name.includes('rsd') || 
           name.includes('bus stand');
};

const EventManagement = () => {
    const { selectedCompany } = useCompany();
    const location = useLocation();
    const [events, setEvents] = useState([]); // This will store ONLY events for CURRENT tab for easier usage in existing map
    const [allMasterEvents, setAllMasterEvents] = useState([]); // This will store ALL events for counts
    const [vehicles, setVehicles] = useState([]);
    const [allVehiclesMaster, setAllVehiclesMaster] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [clientFilter, setClientFilter] = useState('All');
    const [sourceFilter, setSourceFilter] = useState('All');

    const [selectedMonth, setSelectedMonth] = useState('All'); // 1-12 or 'All'
    const [selectedYear, setSelectedYear] = useState(new Date().getMonth() < 3 ? new Date().getFullYear() - 1 : new Date().getFullYear());
    const [selectedDay, setSelectedDay] = useState('All');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [statusTab, setStatusTab] = useState('Running');
    const [selectedEventDetails, setSelectedEventDetails] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [dutyFilter, setDutyFilter] = useState('All');
    const [dutyDateFilter, setDutyDateFilter] = useState('All');
    
    // Rate Card State
    const [showRateCardModal, setShowRateCardModal] = useState(false);
    const [selectedEventForRates, setSelectedEventForRates] = useState(null);
    const [isRateFormOpen, setIsRateFormOpen] = useState(false);
    const [rateCardFormData, setRateCardFormData] = useState({
        serviceName: '', vehicleType: '', baseRate: '',
        baseKms: '', baseHours: '', extraKmRate: '', extraHourRate: '', driverAllowance: ''
    });
    const [selectedVehicleTypes, setSelectedVehicleTypes] = useState([]);
    const [multiRateCardsData, setMultiRateCardsData] = useState({});
    
    // New states for Sub-Categories and PDF Customizer
    const [selectedSubTypes, setSelectedSubTypes] = useState([]);
    const [showPDFCustomizerModal, setShowPDFCustomizerModal] = useState(false);
    const [pdfCols, setPdfCols] = useState([]);
    const [pdfRows, setPdfRows] = useState([]);
    const [pdfTerms, setPdfTerms] = useState([
        "All rates are strictly subject to vehicle availability at the time of final confirmation.",
        "Toll, Tax, and Parking charges will be charged on actuals unless explicitly mentioned.",
        "Any changes in the itinerary may result in a change of quoted rates."
    ]);
    const [savedPdfTermsList, setSavedPdfTermsList] = useState([]);
    const [newTermText, setNewTermText] = useState("");

    useEffect(() => {
        const storedTerms = localStorage.getItem("fleetCrmPdfTerms");
        if (storedTerms) {
            try {
                const parsed = JSON.parse(storedTerms);
                setSavedPdfTermsList(parsed);
                setPdfTerms(parsed); // By default, select all saved terms
            } catch(e) {}
        } else {
            const defaultTerms = [
                "All rates are strictly subject to vehicle availability at the time of final confirmation.",
                "Toll, Tax, and Parking charges will be charged on actuals unless explicitly mentioned.",
                "Any changes in the itinerary may result in a change of quoted rates."
            ];
            setSavedPdfTermsList(defaultTerms);
            localStorage.setItem("fleetCrmPdfTerms", JSON.stringify(defaultTerms));
        }
    }, []);

    const [newColCategory, setNewColCategory] = useState('');
    const [newRowService, setNewRowService] = useState('');
    const [customServiceText, setCustomServiceText] = useState('');
        const [customInputValues, setCustomInputValues] = useState({});
    const [showAddCustomVehicleModal, setShowAddCustomVehicleModal] = useState(false);
    const [customVehicleCategory, setCustomVehicleCategory] = useState('');
    const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
    const [newCustomCategoryName, setNewCustomCategoryName] = useState('');
    const [customVehicleName, setCustomVehicleName] = useState('');
    const [pricingStep, setPricingStep] = useState(1);
    

    useEffect(() => {
        if (selectedMonth === 'All') {
            const safeYear = isNaN(selectedYear) ? new Date().getFullYear() : selectedYear;
            const start = `${safeYear}-04-01`;
            const end = `${safeYear + 1}-03-31`;
            setFromDate(start);
            setToDate(end);
        } else {
            const safeYear = isNaN(selectedYear) ? new Date().getFullYear() : selectedYear;
            const safeMonth = isNaN(selectedMonth) ? new Date().getMonth() + 1 : selectedMonth;
            const calendarYear = (safeMonth >= 1 && safeMonth <= 3) ? safeYear + 1 : safeYear;
            
            try {
                if (selectedDay === 'All') {
                    const start = toISTDateString(new Date(calendarYear, safeMonth - 1, 1));
                    const end = toISTDateString(new Date(calendarYear, safeMonth, 0));
                    setFromDate(start);
                    setToDate(end);
                } else {
                    const safeDay = isNaN(parseInt(selectedDay)) ? 1 : parseInt(selectedDay);
                    const d = toISTDateString(new Date(calendarYear, safeMonth - 1, safeDay));
                    setFromDate(d);
                    setToDate(d);
                }
            } catch (e) {
                console.error("Date calculation error:", e);
                const todayStr = toISTDateString(new Date());
                setFromDate(todayStr);
                setToDate(todayStr);
            }
        }
    }, [selectedMonth, selectedYear, selectedDay]);

    // Handle 'Completed' tab defaulting to 'All Months'
    useEffect(() => {
        if (statusTab === 'Close') {
            setSelectedMonth('All');
            setSelectedDay('All');
        }
    }, [statusTab]);

    const shiftMonth = (amount) => {
        let newMonth = selectedMonth + amount;
        let newYear = selectedYear;
        if (newMonth < 0) { newMonth = 11; newYear--; }
        if (newMonth > 11) { newMonth = 0; newYear++; }
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
    };

    const getToday = () => todayIST();

    const [monthlyTarget, setMonthlyTarget] = useState(0);
    const [showEventModal, setShowEventModal] = useState(false);
    const [showDutyModal, setShowDutyModal] = useState(false);
    const [isEditingEvent, setIsEditingEvent] = useState(false);
    const [isEditingDuty, setIsEditingDuty] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    const handleOpenDuty = () => {
        setIsEditingDuty(false);
        let defaultDate = '';
        if (selectedDay !== 'All') {
            defaultDate = toISTDateString(new Date(selectedYear, selectedMonth, parseInt(selectedDay)));
        } else {
            const now = new Date();
            if (now.getMonth() === selectedMonth && now.getFullYear() === selectedYear) {
                defaultDate = todayIST();
            } else {
                defaultDate = toISTDateString(new Date(selectedYear, selectedMonth, 1));
            }
        }
        setDutyFormData({ carNumber: '', model: '', dropLocation: '', date: defaultDate, eventId: '', dutyAmount: '', ownerName: '', buyAmount: '', driverName: '', vehicleSource: 'Fleet', dutyType: '', dutyTime: currentTimeIST(), remarks: '', guestName: '', serviceId: '' });
        setShowDutyModal(true);
    };

    const handleOpenEvent = () => {
        setIsEditingEvent(false);
        let defaultDate = '';
        if (selectedDay !== 'All') {
            defaultDate = toISTDateString(new Date(selectedYear, selectedMonth, parseInt(selectedDay)));
        } else {
            const now = new Date();
            if (now.getMonth() === selectedMonth && now.getFullYear() === selectedYear) {
                defaultDate = todayIST();
            } else {
                defaultDate = toISTDateString(new Date(selectedYear, selectedMonth, 1));
            }
        }
        setEventFormData({
            name: '',
            client: '',
            date: defaultDate,
            location: '',
            description: '',
            proformaAmount: '',
            status: 'Upcoming'
        });
        setShowEventModal(true);
    };

    const handleEditEvent = (ev) => {
        setIsEditingEvent(true);
        setSelectedId(ev._id);
        setEventFormData({
            name: ev.name,
            client: ev.client,
            date: toISTDateString(new Date(ev.date)),
            location: ev.location || '',
            description: ev.description || '',
            proformaAmount: ev.proformaAmount || '',
            status: ev.status || 'Upcoming'
        });
        setShowEventModal(true);
    };

    const fetchEventDetails = async (eventId) => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/events/details/${eventId}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setSelectedEventDetails(data);
            setShowDetailsModal(true);
        } catch (err) { alert('Error fetching details'); }
    };

    const [eventFormData, setEventFormData] = useState({
        name: '', client: '', date: '', location: '', description: '',
        proformaAmount: '',
        status: 'Upcoming'
    });
    const [dutyFormData, setDutyFormData] = useState({
        carNumber: '', model: '', dropLocation: '', date: '',
        eventId: '', dutyAmount: '', ownerName: '', buyAmount: '', driverName: '', vehicleSource: 'Fleet',
        dutyType: '', dutyTime: '', remarks: '', guestName: '', serviceId: ''
    });

    useEffect(() => {
        if (selectedCompany?._id) {
            const savedTarget = localStorage.getItem(`eventTarget_${selectedCompany._id}`);
            if (savedTarget) setMonthlyTarget(Number(savedTarget));
            fetchEvents();
            fetchVehicles();
            fetchMasterVehicles();
        }
    }, [selectedCompany, fromDate, toDate, statusTab]);

    // ── AI AGENT SEARCH INTEGRATION ──
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchParam = params.get('search') || params.get('name') || params.get('event');
        const clientParam = params.get('client');
        const monthParam = params.get('month');
        const yearParam = params.get('year');
        const dayParam = params.get('day');
        const tabParam = params.get('tab') || params.get('status');

        if (searchParam) setSearchTerm(searchParam);
        if (clientParam) setClientFilter(clientParam);
        if (monthParam) setSelectedMonth(monthParam === 'All' ? 'All' : (parseInt(monthParam) || 'All'));
        if (yearParam) setSelectedYear(parseInt(yearParam) || new Date().getFullYear());
        if (dayParam) setSelectedDay(dayParam === 'All' ? 'All' : (parseInt(dayParam) || 'All'));
        if (tabParam) setStatusTab(tabParam);
    }, [location.search]);

    const fetchEvents = async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/events/${selectedCompany._id}?from=${fromDate}&to=${toDate}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });

            const todayStr = todayIST();
            const allWithVisualStatus = (data || []).map(e => {
                const evDate = toISTDateString(new Date(e.date));
                let visualStatus = e.status || 'Upcoming';
                if (visualStatus === 'Upcoming' && evDate <= todayStr) visualStatus = 'Running';
                return { ...e, visualStatus };
            });
            setAllMasterEvents(allWithVisualStatus);
        } catch (err) { console.error(err); }
    };

    const filteredMasterByDate = React.useMemo(() => {
        return allMasterEvents.filter(e => {
            const evDate = toISTDateString(new Date(e.date));
            return evDate >= fromDate && evDate <= toDate;
        });
    }, [allMasterEvents, fromDate, toDate]);

    const currentTabEvents = React.useMemo(() => {
        const currentTargetStatus = statusTab === 'Start' ? 'Upcoming' : statusTab === 'Close' ? 'Closed' : 'Running';
        return filteredMasterByDate.filter(e => e.visualStatus === currentTargetStatus);
    }, [filteredMasterByDate, statusTab]);

    useEffect(() => {
        setEvents(currentTabEvents);
    }, [currentTabEvents]);

    const fetchVehicles = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const headers = { Authorization: `Bearer ${userInfo.token}` };

            // 1. Fetch Outside Duties
            const outsideRes = await axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=event_all&from=${fromDate}&to=${toDate}`, { headers });
            const outsideDuties = (outsideRes.data.vehicles || [])
                .filter(v => v.eventId)
                .map(v => ({
                    ...v,
                    vehicleSource: v.vehicleSource || 'External'
                }));

            // 2. Fetch Fleet Attendance for the same range
            const attendanceRes = await axios.get(`/api/admin/reports/${selectedCompany._id}?from=${fromDate}&to=${toDate}`, { headers });

            const attendanceDuties = (attendanceRes.data.attendance || [])
                .filter(a => a.eventId)
                .map(a => ({
                    _id: a._id,
                    carNumber: a.vehicle?.carNumber || 'N/A',
                    model: a.vehicle?.model || 'N/A',
                    driverName: a.driver?.name || 'N/A',
                    vehicleSource: 'Fleet',
                    eventId: a.eventId?._id || a.eventId,
                    dutyAmount: a.dailyWage || 0,
                    dropLocation: a.dropLocation || '',
                    date: a.date,
                    isAttendance: true,
                    dutyType: a.dutyType || a.punchOut?.remarks || 'Fleet Duty',
                    dutyTime: a.dutyTime || '',
                    remarks: a.remarks || '',
                    guestName: a.guestName || ''
                }));

            setVehicles([...outsideDuties, ...attendanceDuties]);
        } catch (err) {
            console.error('Fetch duties error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMasterVehicles = async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=fleet`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setAllVehiclesMaster(data.vehicles || []);
        } catch (err) { console.error(err); }
    };

    const shiftDays = (n) => {
        let baseDate;
        if (selectedDay === 'All') {
            baseDate = new Date(selectedYear, selectedMonth, 1);
        } else {
            baseDate = new Date(selectedYear, selectedMonth, parseInt(selectedDay));
        }

        baseDate.setDate(baseDate.getDate() + n);

        setSelectedYear(baseDate.getFullYear());
        setSelectedMonth(baseDate.getMonth());
        setSelectedDay(baseDate.getDate().toString());
    };

    const handleCarNumberChange = (val) => {
        const upVal = val.toUpperCase();
        const normVal = upVal.replace(/[^A-Z0-9]/g, '');

        const existingFleet = allVehiclesMaster.find(v => (v.carNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === normVal);
        if (existingFleet) {
            setDutyFormData(prev => ({ 
                ...prev, 
                carNumber: upVal, 
                model: existingFleet.model || prev.model, 
                driverName: existingFleet.currentDriver?.name || prev.driverName,
                vehicleSource: 'Fleet' 
            }));
            return;
        }

        const existingDuty = vehicles.find(v => (v.carNumber || '').split('#')[0].toUpperCase().replace(/[^A-Z0-9]/g, '') === normVal);
        if (existingDuty) {
            setDutyFormData(prev => ({ 
                ...prev, 
                carNumber: upVal, 
                model: existingDuty.model || prev.model, 
                driverName: existingDuty.driverName || existingDuty.ownerName || prev.driverName,
                vehicleSource: existingDuty.vehicleSource || 'External' 
            }));
        } else {
            setDutyFormData(prev => ({ ...prev, carNumber: upVal }));
        }
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            if (isEditingEvent) {
                await axios.put(`/api/admin/events/${selectedId}`, eventFormData, { headers: { Authorization: `Bearer ${userInfo.token}` } });
            } else {
                await axios.post('/api/admin/events', { ...eventFormData, companyId: selectedCompany._id }, { headers: { Authorization: `Bearer ${userInfo.token}` } });
            }
            setShowEventModal(false);
            fetchEvents();
            alert('Event saved successfully');
        } catch (err) { alert('Error saving event'); }
    };

    const handleDeleteEvent = async (id) => {
        if (!window.confirm('Are you sure you want to delete this event? This will also remove associated external car duties.')) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.delete(`/api/admin/events/${id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            fetchEvents();
            alert('Event deleted successfully');
        } catch (err) { alert('Error deleting event'); }
    };

    // --- Rate Card Handlers ---
    const handleSaveRateCard = async (e) => {
        e.preventDefault();
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const config = { headers: { Authorization: "Bearer " + userInfo.token } };
            
            if (rateCardFormData._id) {
                // Update existing rate card
                const isPD = isPDService(rateCardFormData.serviceName);
                const payload = {
                    ...rateCardFormData,
                    baseKms: isPD ? 0 : (rateCardFormData.baseKms || 0),
                    baseHours: isPD ? 0 : (rateCardFormData.baseHours || 0),
                    extraKmRate: isPD ? 0 : (rateCardFormData.extraKmRate || 0),
                    extraHourRate: isPD ? 0 : (rateCardFormData.extraHourRate || 0),
                    driverAllowance: isPD ? 0 : (rateCardFormData.driverAllowance || 0)
                };
                await axios.put("/api/admin/events/" + selectedEventForRates._id + "/ratecard/" + rateCardFormData._id, payload, config);
            } else {
                // Add new rate cards (multiple)
                const isPD = isPDService(rateCardFormData.serviceName);
                const promises = selectedSubTypes.map(key => {
                    const [type, model] = key.split('|');
                    const data = multiRateCardsData[key];
                    const payload = {
                        serviceName: rateCardFormData.serviceName,
                        vehicleType: type,
                        vehicleModel: model,
                        baseRate: data.baseRate,
                        baseKms: isPD ? 0 : (data.baseKms || 0),
                        baseHours: isPD ? 0 : (data.baseHours || 0),
                        extraKmRate: isPD ? 0 : (data.extraKmRate || 0),
                        extraHourRate: isPD ? 0 : (data.extraHourRate || 0),
                        driverAllowance: isPD ? 0 : (data.driverAllowance || 0)
                    };
                    return axios.post("/api/admin/events/" + selectedEventForRates._id + "/ratecard", payload, config);
                });
                await Promise.all(promises);
            }
            fetchEvents();
            // Refetch the selected event details so the modal updates immediately
            const res = await axios.get("/api/admin/events/details/" + selectedEventForRates._id, config);
            setSelectedEventForRates(res.data.event);
            setRateCardFormData({ serviceName: '', vehicleType: '', vehicleModel: '', baseRate: '', baseKms: '', baseHours: '', extraKmRate: '', extraHourRate: '', driverAllowance: '' });
            setSelectedSubTypes([]);
            setMultiRateCardsData({});
            setIsRateFormOpen(false);
        } catch (error) {
            console.error('Error saving rate card', error);
            alert('Error saving rate card');
        }
    };

    const handleDeleteRateCard = async (rateId) => {
        if (!window.confirm('Are you sure you want to delete this rate card?')) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.delete(`/api/admin/events/${selectedEventForRates._id}/ratecard/${rateId}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            fetchEvents();
            const res = await axios.get(`/api/admin/events/details/${selectedEventForRates._id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setSelectedEventForRates(res.data.event);
        } catch (error) {
            console.error('Error deleting rate card', error);
            alert('Error deleting rate card');
        }
    };

    const handleDownloadRateCardPDF = async () => {
        if (!selectedEventForRates || !selectedEventForRates.rateCard || selectedEventForRates.rateCard.length === 0) {
            alert('No rate cards available to download.');
            return;
        }
        handleOpenPDFCustomizer();
    };

    const handleOpenPDFCustomizer = () => {
        if (!selectedEventForRates || !selectedEventForRates.rateCard || selectedEventForRates.rateCard.length === 0) {
            alert('No rate cards available to export.');
            return;
        }

        const rateCard = selectedEventForRates.rateCard || [];
        
        // Extract columns (unique vehicle type / model)
        const cols = [];
        rateCard.forEach(r => {
            const name = r.vehicleModel || r.vehicleType || 'Any';
            if (!cols.some(c => c.name === name)) {
                cols.push({
                    name: name,
                    type: r.vehicleType || '',
                    model: r.vehicleModel || ''
                });
            }
        });

        // Extract rows (services)
        const rows = [];
        const uniqueServices = [...new Set(rateCard.map(r => r.serviceName))];
        
        uniqueServices.forEach(s => {
            const rowData = { serviceName: s };
            cols.forEach(c => {
                const entry = rateCard.find(r => r.serviceName === s && (r.vehicleModel === c.model && r.vehicleType === c.type));
                rowData[c.name] = entry ? entry.baseRate : '';
            });
            rows.push({ type: 'service', data: rowData });
        });

        // Extra charge rows
        const extraKmData = { serviceName: 'Extra KM Rate' };
        const extraHrData = { serviceName: 'Extra Hour Rate' };
        const allowanceData = { serviceName: 'Driver Allowance' };

        let hasExtraKm = false;
        let hasExtraHr = false;
        let hasAllowance = false;

        cols.forEach(c => {
            const entries = rateCard.filter(r => (r.vehicleModel === c.model && r.vehicleType === c.type));
            const extraKm = entries.find(r => r.extraKmRate)?.extraKmRate;
            const extraHr = entries.find(r => r.extraHourRate)?.extraHourRate;
            const allowance = entries.find(r => r.driverAllowance)?.driverAllowance;

            if (extraKm) { extraKmData[c.name] = extraKm; hasExtraKm = true; }
            if (extraHr) { extraHrData[c.name] = extraHr; hasExtraHr = true; }
            if (allowance) { allowanceData[c.name] = allowance; hasAllowance = true; }
        });

        if (hasExtraKm) rows.push({ type: 'extraKm', data: extraKmData });
        if (hasExtraHr) rows.push({ type: 'extraHr', data: extraHrData });
        if (hasAllowance) rows.push({ type: 'allowance', data: allowanceData });

        setPdfCols(cols);
        setPdfRows(rows);
        setNewColCategory('');
        setNewRowService('');
        setCustomServiceText('');
        setShowPDFCustomizerModal(true);
    };

    const generateCustomPDFExport = async (cols, rows) => {
        if (!selectedEventForRates) return;

        const loadImage = (url) => {
            return new Promise((resolve, reject) => {
                if (!url) return resolve(null);
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                const finalUrl = url.startsWith('/') ? (axios.defaults.baseURL || '') + url : url;
                img.onload = () => resolve(img);
                img.onerror = reject;
                if (finalUrl.startsWith('http')) {
                    img.src = "/api/admin/proxy-image?url=" + encodeURIComponent(finalUrl);
                } else {
                    img.src = finalUrl;
                }
            });
        };

        const orientation = cols.length > 5 ? 'landscape' : 'portrait';
        const doc = new jsPDF(orientation);
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // --- 1. PREMIUM HEADER SECTION ---
        doc.setFillColor(15, 23, 42); // Slate 900
        doc.rect(0, 0, pageWidth, 55, 'F');
        
        doc.setFillColor(245, 158, 11);
        doc.rect(0, 55, pageWidth, 2, 'F'); // Gold Border
        
        let logoOffset = 18;
        try {
            const logoSrc = selectedCompany?.logoUrl || '/logos/logo.png';
            const logoImg = await loadImage(logoSrc);
            
            if (logoImg) {
                // White rounded box for logo
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(14, 10, 36, 36, 4, 4, 'F');
                doc.addImage(logoImg, 'PNG', 16, 12, 32, 32);
                logoOffset = 58;
                
                // Add centered watermark
                doc.setGState(new doc.GState({ opacity: 0.04 }));
                const watermarkSize = orientation === 'portrait' ? 120 : 150;
                doc.addImage(logoImg, 'PNG', (pageWidth - watermarkSize) / 2, (pageHeight - watermarkSize) / 2, watermarkSize, watermarkSize);
                doc.setGState(new doc.GState({ opacity: 1.0 }));
            }
        } catch (e) {
            console.warn('Could not load logo image for PDF', e);
        }

        // Title Text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text((selectedCompany?.name || 'YATREE DESTINATION').toUpperCase(), logoOffset, 25);
        
        // Subtitle
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(200, 200, 200);
        doc.text('Premium Fleet Management & Travel Solutions', logoOffset, 33);
        
        doc.setTextColor(245, 158, 11);
        doc.setFontSize(9);
        doc.text(selectedCompany?.website || 'www.yatreedestination.com', logoOffset, 40);
        
        // Right side info
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('RATE CARD', pageWidth - 14, 25, { align: 'right' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(220, 220, 220);
        doc.text("DATE: " + new Date().toLocaleDateString('en-IN'), pageWidth - 14, 33, { align: 'right' });

        // --- 2. EVENT SPECIFICATIONS SECTION ---
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('EVENT SPECIFICATIONS', 14, 72);
        
        doc.setDrawColor(245, 158, 11);
        doc.setLineWidth(1);
        doc.line(14, 75, 70, 75);

        // Spec box
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 80, pageWidth - 28, 25, 4, 4, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.roundedRect(14, 80, pageWidth - 28, 25, 4, 4, 'S');

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text('EVENT NAME', 20, 88);
        doc.text('CLIENT', 80, 88);
        doc.text('EVENT DATE', 140, 88);
        
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(selectedEventForRates.name.toUpperCase(), 20, 96);
        doc.text((selectedEventForRates.client || 'N/A').toUpperCase(), 80, 96);
        const eventDateStr = selectedEventForRates.date ? new Date(selectedEventForRates.date).toLocaleDateString('en-IN') : 'N/A';
        doc.text(eventDateStr, 140, 96);

        // Stats
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text('TOTAL SERVICES', pageWidth - 20, 88, { align: 'right' });
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        const serviceCount = rows.filter(r => r.type === 'service').length;
        doc.text(serviceCount + " Configured", pageWidth - 20, 96, { align: 'right' });

        // --- 3. DYNAMIC TABLE SECTION ---
        const head = [['S.NO.', 'SERVICES / PARTICULARS', ...cols.map(c => c.name.toUpperCase())]];
        
        const body = [];
        rows.forEach((r, idx) => {
            const isExtra = r.type !== 'service';
            const sNo = isExtra ? '*' : (body.filter(x => x[0] !== '*').length + 1).toString();
            
            const rowData = [sNo, r.data.serviceName.toUpperCase()];
            cols.forEach(c => {
                const val = r.data[c.name];
                
                let valStr = '-';
                if (val !== undefined && val !== null && val !== '') {
                    if (r.type === 'service') valStr = "Rs. " + val;
                    else if (r.type === 'extraKm') valStr = "Rs. " + val + "/Km";
                    else if (r.type === 'extraHr') valStr = "Rs. " + val + "/Hr";
                    else if (r.type === 'allowance') valStr = "Rs. " + val;
                }
                rowData.push(valStr);
            });
            body.push(rowData);
        });

        // Dynamic font size to prevent overlapping
        const dynamicFontSize = cols.length > 6 ? (cols.length > 9 ? 7 : 8) : 9;

        autoTable(doc, {
            startY: 115,
            head: head,
            body: body,
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: dynamicFontSize,
                cellPadding: 6,
                lineColor: [226, 232, 240],
                lineWidth: 0.5,
                overflow: 'linebreak'
            },
            headStyles: { 
                fillColor: [15, 23, 42],
                textColor: [255, 255, 255], 
                fontStyle: 'bold', 
                halign: 'center', 
                valign: 'middle'
            },
            bodyStyles: { 
                halign: 'center', 
                valign: 'middle',
                textColor: [30, 41, 59]
            },
            columnStyles: { 
                0: { halign: 'center', fontStyle: 'bold', cellWidth: 15, fillColor: [248, 250, 252] },
                1: { halign: 'left', fontStyle: 'bold', minCellWidth: 40, cellWidth: orientation === 'portrait' ? 60 : 70 } 
            },
            alternateRowStyles: { fillColor: [247, 249, 252] },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index > 1) {
                    if (data.cell.raw !== '-' && data.cell.raw.toString().includes('Rs.')) {
                        data.cell.styles.textColor = [5, 150, 105];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (data.cell.raw === '-') {
                        data.cell.styles.textColor = [156, 163, 175];
                    }
                }
                if (data.section === 'body' && data.row.raw[0] === '*') {
                    data.cell.styles.fillColor = [254, 252, 232];
                }
            }
        });

        // --- 4. SIGNATURE & FOOTER SECTION ---
        let finalY = doc.lastAutoTable.finalY + 25;
        
        if (finalY > pageHeight - 50) {
            doc.addPage();
            finalY = 30;
        }
        
        try {
            const sigSrc = selectedCompany?.ownerSignatureUrl || '/logos/signature.png';
            const sigImg = await loadImage(sigSrc);
            if (sigImg) {
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(1);
                doc.line(pageWidth - 60, finalY + 20, pageWidth - 20, finalY + 20);
                doc.addImage(sigImg, 'PNG', pageWidth - 60, finalY, 40, 20);
            }
        } catch (e) {
            console.warn('Could not load signature image for PDF', e);
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('AUTHORIZED SIGNATORY', pageWidth - 40, finalY + 26, { align: 'center' });
        
                // Terms & Conditions
        if (pdfTerms && pdfTerms.length > 0) {
            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42);
            doc.text("Terms & Conditions:", 14, finalY);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 116, 139);
            let termY = finalY + 6;
            pdfTerms.forEach((term, idx) => {
                // Split long terms into multiple lines
                const splitTerm = doc.splitTextToSize((idx + 1) + ". " + term, pageWidth - 28);
                doc.text(splitTerm, 14, termY);
                termY += (splitTerm.length * 4) + 1; // Adjust line height
            });
        }

        // Footer block
        doc.setFillColor(248, 250, 252);
        doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.line(0, pageHeight - 20, pageWidth, pageHeight - 20);
        
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('This is a computer-generated document and does not require a physical signature.', pageWidth / 2, pageHeight - 12, { align: 'center' });
        doc.text(selectedCompany?.email || 'info@yatreedestination.com', 14, pageHeight - 12);
        doc.text(selectedCompany?.phone || '+91 99999 99999', pageWidth - 14, pageHeight - 12, { align: 'right' });

        doc.save(selectedEventForRates.name.replace(/\s+/g, '_') + "_Rate_Card.pdf");
    };

    const handleSubmitDuty = async (e) => {
        e.preventDefault();
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

            const selectedDuty = isEditingDuty ? vehicles.find(v => v._id === selectedId) : null;

            let internalCarNumber = `${dutyFormData.carNumber}#${dutyFormData.date}`;
            if (!isEditingDuty) {
                internalCarNumber += `#${Math.random().toString(36).substring(2, 7)}`;
            } else {
                const parts = selectedDuty?.carNumber?.split('#') || [];
                if (dutyFormData.carNumber === parts[0] && dutyFormData.date === parts[1] && parts[2]) {
                    internalCarNumber += `#${parts[2]}`;
                } else {
                    internalCarNumber += `#${Math.random().toString(36).substring(2, 7)}`;
                }
            }
            const vehiclePayload = {
                carNumber: internalCarNumber,
                model: dutyFormData.model?.trim(),
                property: dutyFormData.dropLocation?.trim() || '',
                dropLocation: dutyFormData.dropLocation?.trim() || '',
                dutyAmount: Number(dutyFormData.dutyAmount) || 0,
                ownerName: dutyFormData.ownerName?.trim() || '',
                buyAmount: Number(dutyFormData.buyAmount) || 0,
                eventId: dutyFormData.eventId,
                companyId: selectedCompany._id,
                isOutsideCar: true,
                transactionType: 'Buy',
                createdAt: dutyFormData.date,
                driverName: dutyFormData.driverName?.trim() || '',
                vehicleSource: dutyFormData.vehicleSource,
                dutyType: dutyFormData.dutyType,
                dutyTime: dutyFormData.dutyTime,
                remarks: dutyFormData.remarks,
                guestName: dutyFormData.guestName?.trim() || ''
            };

            if (dutyFormData.serviceId && selectedEventDetails?.event?.rateCard) {
                const service = selectedEventDetails.event.rateCard.find(r => r._id === dutyFormData.serviceId);
                if (service) {
                    vehiclePayload.billingDetails = JSON.stringify({
                        serviceName: service.serviceName,
                        baseRate: service.baseRate,
                        baseKms: service.baseKms,
                        baseHours: service.baseHours,
                        extraKmRate: service.extraKmRate,
                        extraHourRate: service.extraHourRate,
                        driverAllowanceRate: service.driverAllowance
                    });
                }
            }

            if (isEditingDuty && selectedId && !selectedDuty?.isAttendance) {
                await axios.put(`/api/admin/vehicles/${selectedId}`, vehiclePayload, config);
            } else {
                const data = new FormData();
                Object.keys(vehiclePayload).forEach(key => data.append(key, vehiclePayload[key]));
                data.append('permitType', 'Contract');
                data.append('carType', 'Other');
                await axios.post('/api/admin/vehicles', data, config);
            }
            setShowDutyModal(false);
            fetchVehicles();
            fetchEvents();
            if (showDetailsModal && selectedEventDetails?.event?._id) {
                fetchEventDetails(selectedEventDetails.event._id);
            }
            setDutyFormData({ carNumber: '', model: '', dropLocation: '', date: '', eventId: '', dutyAmount: '', ownerName: '', buyAmount: '', driverName: '', vehicleSource: 'Fleet', dutyType: '', dutyTime: '', remarks: '', guestName: '', serviceId: '' });
        } catch (err) {
            console.error('Save Error:', err.response?.data || err.message);
            alert('Error saving duty entry: ' + (err.response?.data?.message || 'Check connection'));
        }
    };

    const handleDeleteDuty = async (id, isAttendanceFlag) => {
        if (!window.confirm('Remove this vehicle duty?')) return;
        try {
            const duty = vehicles.find(d => d._id === id);
            // Use flag if provided, otherwise fallback to finding in state
            const isAttendance = (isAttendanceFlag !== undefined) ? isAttendanceFlag : duty?.isAttendance;

            if (isAttendance) {
                // For attendance, we just clear the eventId, we don't delete the whole attendance record usually
                // BUT if they want to delete, we call deleteAttendance
                await axios.delete(`/api/admin/attendance/${id}`, { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('userInfo')).token}` } });
            } else {
                await axios.delete(`/api/admin/vehicles/${id}`, { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('userInfo')).token}` } });
            }
            fetchVehicles();
            if (showDetailsModal && selectedEventDetails?.event?._id) {
                fetchEventDetails(selectedEventDetails.event._id);
            }
        } catch (err) { alert('Error deleting'); }
    };

    const handleEditDuty = (v) => {
        setDutyFormData({
            carNumber: v.carNumber?.split('#')[0] || '',
            model: v.model,
            dropLocation: v.dropLocation || '',
            date: v.carNumber?.split('#')[1] || getToday(),
            eventId: v.eventId || '',
            dutyAmount: v.dutyAmount || v.dailyWage || '',
            ownerName: v.ownerName || '',
            buyAmount: v.buyAmount || '',
            driverName: v.driverName || '',
            vehicleSource: v.vehicleSource || 'External',
            dutyType: v.dutyType || '',
            dutyTime: v.dutyTime || '',
            remarks: v.remarks || '',
            guestName: v.guestName || ''
        });
        setSelectedId(v._id);
        setIsEditingDuty(true);
        setShowDutyModal(true);
    };

    const handleTargetChange = (val) => {
        const num = Number(val);
        setMonthlyTarget(num);
        if (selectedCompany?._id) localStorage.setItem(`eventTarget_${selectedCompany._id}`, num.toString());
    };

    // OPTIMIZATION: Memoize filtered results to prevent "hanging" during re-renders (Search/Typing)
    const filtered = React.useMemo(() => {
        return vehicles.filter(v => {
            const plate = (v.carNumber || '').split('#')[0];
            const event = events.find(e => e._id === v.eventId);
            const eventName = event?.name || '';
            const clientName = event?.client || '';
            const eventStatus = event?.status || '';

            // ONLY show duties belonging to events in the CURRENT status tab phase
            const currentTabStatus = statusTab === 'Start' ? 'Upcoming' : statusTab === 'Close' ? 'Closed' : 'Running';
            if (v.eventId && eventStatus !== currentTabStatus) return false;

            const matchesSearch =
                plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (v.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (v.driverName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                clientName.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesClient = clientFilter === 'All' || clientName === clientFilter;
            const matchesSource = sourceFilter === 'All' || (v.vehicleSource || 'External') === sourceFilter;

            return matchesSearch && matchesClient && matchesSource;
        }).sort((vA, vB) => {
            const dA = (vA.date || vA.carNumber?.split('#')[1] || '');
            const dB = (vB.date || vB.carNumber?.split('#')[1] || '');
            return dB.localeCompare(dA);
        });
    }, [vehicles, events, searchTerm, clientFilter, fromDate, toDate, sourceFilter, statusTab]);

    // SMART DYNAMIC SUGGESTIONS (SAME AS OUTSIDE CARS)
    const dutyTypeSuggestions = React.useMemo(() => {
        return ['Airport Pickup & Drop', 'RSD Pickup & Drop', 'Bus Stand Pickup & Drop'].sort();
    }, []);

    const dropLocationSuggestions = React.useMemo(() => {
        const d = dutyFormData.date;
        if (!d || d.endsWith('-01')) return []; // Reset on 1st
        const [y, m] = d.split('-');
        const currentMonthData = vehicles.filter(v => (v.date || v.carNumber?.split('#')[1])?.startsWith(`${y}-${m}`));
        return [...new Set(currentMonthData.map(v => v.dropLocation).filter(Boolean))].sort();
    }, [vehicles, dutyFormData.date]);

    const externalVehicleSuggestions = React.useMemo(() => {
        const suggestions = new Set();
        filteredMasterByDate.forEach(ev => {
            if (ev.externalDuties) {
                ev.externalDuties.forEach(d => {
                    const vehNo = d.vehicle?.carNumber || d.vehicleNumber || d.carNumber?.split('#')[0];
                    if (vehNo) suggestions.add(vehNo.toUpperCase());
                });
            }
        });
        return Array.from(suggestions).sort();
    }, [filteredMasterByDate]);

    // OPTIMIZATION: Memoize statistics
    const stats = React.useMemo(() => {
        const uniqueEvents = [...new Set(filtered.map(v => v.eventId).filter(Boolean))].length;
        const fleetAmount = filtered.filter(v => (v.vehicleSource || 'External') === 'Fleet').reduce((sum, v) => sum + (Number(v.dutyAmount || v.dailyWage) || 0), 0);
        const extAmount = filtered.filter(v => (v.vehicleSource || 'External') === 'External').reduce((sum, v) => sum + (Number(v.dutyAmount || v.dailyWage) || 0), 0);
        const totalAmount = fleetAmount + extAmount;
        const uniqueClients = [...new Set(events.map(e => e.client).filter(Boolean))].sort();
        return { totalEvents: uniqueEvents, totalAmount, fleetAmount, extAmount, uniqueClients };
    }, [filtered, events]);

    const { totalEvents, totalAmount, fleetAmount, extAmount, uniqueClients } = stats;

    const now = nowIST();
    const curMonth = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const curYear = now.getUTCFullYear().toString();
    const currentMonthDuties = vehicles.filter(v => {
        const d = v.carNumber?.split('#')[1];
        return d && d.startsWith(`${curYear}-${curMonth}`);
    }).length;

    const targetPercentage = monthlyTarget > 0 ? Math.min(Math.round((currentMonthDuties / monthlyTarget) * 100), 100) : 0;

    const exportExcel = () => {
        const data = filtered.map(v => {
            const event = events.find(e => e._id === v.eventId);
            return {
                'Date': v.carNumber?.split('#')[1] ? formatDateIST(v.carNumber.split('#')[1]) : '',
                'Vehicle': v.carNumber?.split('#')[0],
                'Model': v.model,
                'Driver': v.driverName || '-',
                'Source': v.vehicleSource || 'External',
                'Event': event?.name || 'N/A',
                'Client': event?.client || 'N/A',
                'Duty Type': v.dutyType || '',
                'Drop Loc': v.dropLocation || '',
                'Amount': v.dutyAmount || 0
            };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Events Report");
        XLSX.writeFile(wb, `Event_Duties_${fromDate}_to_${toDate}.xlsx`);
    };

    const exportEventSpecificExcel = (eventData) => {
        if (!eventData) return;
        const allDuties = [...eventData.fleetDuties, ...eventData.externalDuties]
            .filter(d => dutyFilter === 'All' || (dutyFilter === 'Fleet' ? d.vehicleSource === 'Fleet' : d.vehicleSource !== 'Fleet'))
            .filter(d => dutyDateFilter === 'All' || formatDateIST(d.date || d.createdAt) === dutyDateFilter)
            .sort((a, b) => {
                const dateA = new Date(a.date || a.createdAt);
                const dateB = new Date(b.date || b.createdAt);
                if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
                return (a.dutyTime || '00:00').localeCompare(b.dutyTime || '00:00');
            });
        const data = allDuties.map(v => ({
            'Date': formatDateIST(v.date || v.createdAt),
            'Vehicle': (v.vehicle?.carNumber || v.vehicleNumber || v.carNumber?.split('#')[0] || 'N/A').toUpperCase(),
            'Model': v.vehicle?.model || v.model || 'N/A',
            'Driver': v.driver?.name || v.driverName || 'N/A',
            'Guest Name': v.guestName || '-',
            'TIME': renderTime(v.dutyTime) || '-',
            'Duty Type': v.dutyType || 'General Duty',
            'Location': v.dropLocation || 'BASE',
            'Remarks': v.remarks || '-',
            'Amount': Number(v.dutyAmount || v.dailyWage || 0)
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Event Duty Logs");
        XLSX.writeFile(wb, `Event_Log_${eventData.event.name.replace(/\s+/g, '_')}_${toISTDateString(new Date(eventData.event.date))}.xlsx`);
    };

    const formatDateDisplay = (dateStr) => formatDateIST(dateStr);

    const loadImage = (url) => {
        return new Promise((resolve, reject) => {
            if (!url) return resolve(null);
            let finalUrl = url;
            if (!url.startsWith('http') && !url.startsWith('/')) {
                finalUrl = `https://superadmin.yatreedestination.com/uploads/${url}`;
            }
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            if (finalUrl.startsWith('http')) {
                img.src = `/api/admin/proxy-image?url=${encodeURIComponent(finalUrl)}`;
            } else {
                img.src = finalUrl;
            }
        });
    };

    const handleExportEventPDF = async (mode = 'internal') => {
        try {
            if (!selectedEventDetails) {
                alert("No event data available.");
                return;
            }
            // Load assets
            const logo = await loadImage(selectedCompany?.logoUrl || '/logos/logo.png').catch(() => null);
            const signature = await loadImage(selectedCompany?.ownerSignatureUrl || '/logos/signature.png').catch(() => null);

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // 1. HEADER (STUNNING MODERN STYLE)
            doc.setFillColor(15, 23, 42); // Slate 900
            doc.rect(0, 0, pageWidth, 50, 'F');

            // Premium Logo Container
            if (logo) {
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(12, 8, 34, 34, 3, 3, 'F'); // White background for logo
                doc.addImage(logo, 'PNG', 14, 10, 30, 30);
            } else {
                doc.setDrawColor(255, 255, 255);
                doc.setLineWidth(0.5);
                doc.roundedRect(12, 8, 34, 34, 3, 3, 'D');
                doc.setFontSize(8);
                doc.setTextColor(255, 255, 255);
                doc.text('LOGO', 24, 26, { align: 'center' });
            }

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text((selectedCompany?.name || 'FLEET MANAGEMENT').toUpperCase(), 52, 22);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(200, 200, 200);
            doc.text('Premium Fleet Management & Travel Solutions', 52, 30);
            doc.setTextColor(251, 191, 36);
            doc.text(selectedCompany?.website || '', 52, 37);

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('EVENT SUMMARY', pageWidth - 15, 22, { align: 'right' });
            doc.setFontSize(10);
            doc.text((selectedEventDetails.event?.name || 'GENERIC MISSION').toUpperCase(), pageWidth - 15, 30, { align: 'right' });
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`DATE: ${formatDateIST(new Date())}`, pageWidth - 15, 37, { align: 'right' });

            // 2. EVENT SPECIFICATIONS
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('EVENT SPECIFICATIONS', 15, 65);
            doc.setDrawColor(251, 191, 36);
            doc.setLineWidth(0.5);
            doc.line(15, 68, 50, 68);

            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text('MISSION NAME', 15, 76);
            doc.text('CLIENT', 15, 84);
            doc.text('EVENT DATE', 15, 92);

            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.text(selectedEventDetails.event?.name?.toUpperCase() || 'N/A', 50, 76);
            doc.text(selectedEventDetails.event?.client?.toUpperCase() || 'N/A', 50, 84);
            doc.text(formatDateIST(selectedEventDetails.event?.date), 50, 92);

            // Summary Stats Box
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(pageWidth / 2, 60, pageWidth / 2 - 15, 45, 3, 3, 'F');
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('MISSION STATISTICS', pageWidth / 2 + 5, 70);

            const allDuties = [...selectedEventDetails.fleetDuties, ...selectedEventDetails.externalDuties]
                .filter(d => dutyFilter === 'All' || (dutyFilter === 'Fleet' ? d.vehicleSource === 'Fleet' : d.vehicleSource !== 'Fleet'))
                .filter(d => dutyDateFilter === 'All' || formatDateIST(d.date || d.createdAt) === dutyDateFilter);
            const totalEarned = allDuties.reduce((sum, d) => sum + (Number(d.dutyAmount || d.dailyWage) || 0), 0);
            const fleetCount = allDuties.filter(d => d.vehicleSource === 'Fleet').length;
            const extCount = allDuties.filter(d => d.vehicleSource !== 'Fleet').length;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);

            if (mode === 'client') {
                doc.text('Total Mission Vehicles:', pageWidth / 2 + 5, 83);
                doc.text('Total Operations Logistics:', pageWidth / 2 + 5, 88);

                doc.setTextColor(15, 23, 42);
                doc.text(allDuties.length.toString(), pageWidth - 20, 83, { align: 'right' });
                doc.text('Verified', pageWidth - 20, 88, { align: 'right' });
            } else {
                doc.text('Vanguard Vehicles (Fleet):', pageWidth / 2 + 5, 78);
                doc.text('External Support (Cars):', pageWidth / 2 + 5, 83);
                doc.text('Total Resource Count:', pageWidth / 2 + 5, 88);

                doc.setTextColor(15, 23, 42);
                doc.text(fleetCount.toString(), pageWidth - 20, 78, { align: 'right' });
                doc.text(extCount.toString(), pageWidth - 20, 83, { align: 'right' });
                doc.text(allDuties.length.toString(), pageWidth - 20, 88, { align: 'right' });
            }

            doc.setDrawColor(203, 213, 225);
            doc.line(pageWidth / 2 + 5, 92, pageWidth - 20, 92);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(16, 185, 129);
            doc.text('GRAND TOTAL VALUE:', pageWidth / 2 + 5, 100);
            doc.text(`Rs. ${totalEarned.toLocaleString('en-IN')}`, pageWidth - 20, 100, { align: 'right' });

            // 3. DUTY LOGS TABLE
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('OPERATIONAL LOGS', 15, 115);

            const headers = mode === 'client'
                ? [['DATE', 'VEHICLE', 'MODEL', 'GUEST', 'TIME', 'ROLE', 'REMARKS', 'AMOUNT']]
                : [['DATE', 'VEHICLE', 'SOURCE', 'DRIVER', 'GUEST', 'TIME', 'ROLE', 'REMARKS', 'AMOUNT']];

            const body = allDuties.sort((a, b) => {
                const dateA = new Date(a.date || a.createdAt);
                const dateB = new Date(b.date || b.createdAt);
                if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
                return (a.dutyTime || '00:00').localeCompare(b.dutyTime || '00:00');
            }).map(d => {
                const dateText = formatDateIST(d.date || d.createdAt);
                const vehNo = (d.vehicle?.carNumber || d.vehicleNumber || d.carNumber?.split('#')[0] || 'N/A').toUpperCase();
                const amount = `${Number(d.dutyAmount || d.dailyWage || 0).toLocaleString('en-IN')}`;
                const guest = d.guestName || '-';
                const time = renderTime(d.dutyTime) || '-';
                const role = d.dutyType || (mode === 'client' ? 'SUPPORT' : 'General');
                const remarks = d.remarks || '-';

                if (mode === 'client') {
                    return [dateText, vehNo, d.vehicle?.model || d.model || 'N/A', guest, time, role, remarks, amount];
                } else {
                    return [dateText, vehNo, d.vehicleSource?.toUpperCase() || 'EXT', d.isAttendance ? d.driver?.name : d.driverName, guest, time, role, remarks, amount];
                }
            });

            autoTable(doc, {
                head: headers,
                body: body,
                startY: 120,
                theme: 'grid',
                headStyles: { fillColor: mode === 'client' ? [30, 41, 59] : [15, 23, 42], fontSize: 8, halign: 'center' },
                bodyStyles: { fontSize: 8, halign: 'center', textColor: [51, 65, 85] },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    7: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] },
                    8: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] }
                },
                margin: { left: 15, right: 15 }
            });

            // 4. SIGNATURE SECTION
            let footerY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 120) + 35;
            if (footerY > pageHeight - 60) { doc.addPage(); footerY = 30; }

            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.setFont('helvetica', 'italic');
            doc.text('This is a computer-generated operational report for missions logistical audit.', 15, footerY);

            const sigX = pageWidth - 75;
            if (signature) {
                doc.addImage(signature, 'PNG', sigX, footerY - 20, 55, 22);
            }
            doc.setDrawColor(15, 23, 42); doc.setLineWidth(0.6);
            doc.line(sigX - 5, footerY + 5, pageWidth - 15, footerY + 5);
            doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); doc.text((selectedCompany?.ownerName || 'AUTHORISED SIGNATORY').toUpperCase(), sigX - 2, footerY + 12);
            doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
            doc.text('Operations Controller', sigX - 2, footerY + 17);
            doc.text(`${selectedCompany?.name || 'LogKaro'}`, sigX - 2, footerY + 21);

            doc.save(`${mode === 'client' ? 'Client' : 'Internal'}_Report_${(selectedEventDetails.event?.name || 'Report').replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error(error);
            alert("Error generating mission PDF report: " + error.message);
        }
    };

    return (
        <div className="container-fluid" style={{ paddingBottom: '60px' }}>
            <SEO title="Event Command Center" description="Unified tracking for company and external vehicles assigned to events." />

            {/* ═══ PREMIUM DYNAMIC HEADER ═══ */}
            <div className="header-top" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'clamp(20px, 4vw, 40px)',
                marginBottom: 'clamp(30px, 5vw, 48px)',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 3vw, 20px)' }}>
                    <div style={{
                        width: 'clamp(56px, 12vw, 72px)',
                        height: 'clamp(56px, 12vw, 72px)',
                        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                        borderRadius: 'clamp(14px, 3vw, 22px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        position: 'relative',
                        flexShrink: 0
                    }}>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: `radial-gradient(circle at 30% 30%, var(--primary)33, transparent 70%)` }}></div>
                        <Target size={32} color="var(--primary)" style={{ filter: `drop-shadow(0 0 10px var(--primary)66)` }} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <div className="pulse-dot"></div>
                            <span className="label-text">Mission Control</span>
                        </div>
                        <h1 className="main-title">
                            Event <span className="text-gradient-yellow">Logistics</span>
                        </h1>
                    </div>
                </div>

                <div className="flex-resp" style={{ flex: 1, justifyContent: 'flex-end', width: '100%', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                            <div className="calendar-controls">
                                <button onClick={() => shiftMonth(-1)} className="shift-btn"><ChevronLeft size={16} /></button>
                                <button onClick={() => shiftMonth(1)} className="shift-btn"><ChevronRight size={16} /></button>

                                {selectedDay !== 'All' && (
                                    <motion.button
                                        whileHover={{ background: 'rgba(251,191,36,0.2)' }}
                                        onClick={() => setSelectedDay('All')}
                                        style={{
                                            padding: '0 12px',
                                            height: '36px',
                                            borderRadius: '10px',
                                            background: 'rgba(251,191,36,0.1)',
                                            border: 'none',
                                            color: 'var(--primary)',
                                            fontSize: '11px',
                                            fontWeight: '950',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <Calendar size={14} /> Full Month
                                    </motion.button>
                                )}

                                <select
                                    value={selectedMonth}
                                    onChange={(e) => {
                                        setSelectedMonth(e.target.value === 'All' ? 'All' : parseInt(e.target.value));
                                        setSelectedDay('All');
                                    }}
                                    style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: 'white', height: '36px', borderRadius: '10px', padding: '0 8px', outline: 'none', fontWeight: '800', fontSize: '11px', cursor: 'pointer' }}
                                >
                                    <option value="All" style={{ background: '#0a0f1d' }}>Full Year</option>
                                    {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map(m => (
                                        <option key={m} value={m} style={{ background: '#0a0f1d' }}>
                                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => {
                                        setSelectedYear(parseInt(e.target.value));
                                        setSelectedDay('All');
                                    }}
                                    style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: 'white', height: '36px', borderRadius: '10px', padding: '0 8px', outline: 'none', fontWeight: '800', fontSize: '11px', cursor: 'pointer' }}
                                >
                                    {Array.from({ length: new Date().getFullYear() - 2023 + 5 }, (_, i) => 2023 + i).map(y => <option key={y} value={y} style={{ background: '#0a0f1d' }}>FY {y}-{y + 1}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid - High Fidelity */}
                    {statusTab === 'Close' && (
                        <div className="stats-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                            gap: '12px',
                            flex: '1',
                            maxWidth: '600px',
                            width: '100%'
                        }}>
                            {[
                            { label: 'Total Events', value: totalEvents, color: 'var(--primary)', icon: <Target size={18} /> },
                            { label: 'Total Revenue', value: `₹${totalAmount.toLocaleString()}`, color: '#10b981', icon: <Wallet size={18} /> },
                            { label: 'Fleet Amount', value: `₹${fleetAmount.toLocaleString()}`, color: '#38bdf8', icon: <Car size={18} /> },
                            { label: 'External Amount', value: `₹${extAmount.toLocaleString()}`, color: '#a855f7', icon: <Users size={18} /> },
                        ].map((s, i) => (
                            <motion.div key={s.label}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                style={{
                                    padding: '12px 16px', borderRadius: '16px',
                                    background: 'rgba(15, 23, 42, 0.4)',
                                    border: `1px solid rgba(255,255,255,0.05)`,
                                    borderLeft: `3px solid ${s.color}`,
                                    display: 'flex', flexDirection: 'column', gap: '4px',
                                    boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '8px', fontWeight: '900', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{s.label}</span>
                                    <div style={{ color: s.color, opacity: 0.5 }}>{s.icon}</div>
                                </div>
                                <span style={{ color: 'white', fontSize: '16px', fontWeight: '900' }}>{s.value}</span>
                            </motion.div>
                        ))}
                    </div>
                    )}
                </div>
            </div>

            {/* ═══ PREMIUM STATUS NAVIGATION ═══ */}
            <div className="status-nav" style={{
                position: 'relative',
                marginBottom: 'clamp(24px, 5vw, 40px)',
                padding: 'clamp(8px, 2vw, 12px)',
                background: 'rgba(15, 23, 42, 0.45)',
                borderRadius: 'clamp(20px, 4vw, 30px)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                gap: 'clamp(8px, 2vw, 12px)',
                backdropFilter: 'blur(30px)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                flexWrap: 'wrap'
            }}>
                {[
                    { id: 'Start', label: 'Upcoming', color: '#10b981', icon: <Navigation size={20} />, count: filteredMasterByDate.filter(e => e.visualStatus === 'Upcoming').length },
                    { id: 'Running', label: 'Live Now', color: 'var(--primary)', icon: <Target size={20} />, count: filteredMasterByDate.filter(e => e.visualStatus === 'Running').length },
                    { id: 'Close', label: 'Completed', color: '#f87171', icon: <FileSpreadsheet size={20} />, count: filteredMasterByDate.filter(e => e.visualStatus === 'Closed').length }
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setStatusTab(t.id)}
                        style={{
                            flex: 1,
                            minWidth: 'clamp(140px, 30vw, 200px)',
                            padding: 'clamp(12px, 3vw, 16px)',
                            borderRadius: 'clamp(14px, 3vw, 20px)',
                            border: 'none',
                            background: statusTab === t.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                            color: statusTab === t.id ? 'white' : 'rgba(255,255,255,0.3)',
                            cursor: 'pointer',
                            transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'clamp(8px, 2vw, 12px)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{
                            width: 'clamp(36px, 10vw, 44px)',
                            height: 'clamp(36px, 10vw, 44px)',
                            borderRadius: 'clamp(10px, 3vw, 14px)',
                            background: statusTab === t.id ? `${t.color}25` : 'rgba(255,255,255,0.03)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: statusTab === t.id ? t.color : 'rgba(255,255,255,0.4)',
                            transition: '0.3s',
                            boxShadow: statusTab === t.id ? `0 0 15px ${t.color}30` : 'none',
                            position: 'relative',
                            flexShrink: 0
                        }}>
                            {t.id === 'Running' && statusTab === 'Running' && (
                                <div style={{
                                    position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px',
                                    background: 'var(--primary)', borderRadius: '50%', border: '2px solid #0a0f1d',
                                    animation: 'pulse 1.5s infinite'
                                }} />
                            )}
                            {t.icon}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 'clamp(13px, 3vw, 15px)', fontWeight: '950', letterSpacing: '-0.2px' }}>{t.label}</div>
                            <div style={{ fontSize: 'clamp(8px, 2vw, 10px)', color: 'rgba(255,255,255,0.25)', fontWeight: '800', marginTop: '2px', textTransform: 'uppercase' }}>
                                {t.count} {t.count === 1 ? 'Event' : 'Events'}
                            </div>
                        </div>
                        {statusTab === t.id && (
                            <motion.div layoutId="tab-underline" style={{ position: 'absolute', bottom: '0', left: '20%', right: '20%', height: '3px', background: t.color, borderRadius: '3px 3px 0 0', boxShadow: `0 0 10px ${t.color}` }} />
                        )}
                    </button>
                ))}
            </div>

            {/* ═══ COMMAND BAR ═══ */}
            <div className="command-bar" style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '32px',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 'clamp(280px, 100%, 400px)' }}>
                    <Search style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} size={18} />
                    <input
                        className="premium-input-event"
                        placeholder="Scan missions, client tags, or venue signals..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', height: '56px', borderRadius: '18px', background: 'rgba(15, 23, 42, 0.4)',
                            border: '1px solid rgba(255,255,255,0.06)', padding: '0 20px 0 55px', color: 'white',
                            fontSize: '14px', fontWeight: '600', outline: 'none', transition: '0.3s',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                        }}
                    />
                </div>

                <div className="flex-resp" style={{ display: 'flex', gap: '12px', width: 'auto' }}>
                    {statusTab !== 'Close' && (
                        <button onClick={() => {
                            setIsEditingEvent(false);
                            setEventFormData({
                                name: '',
                                client: '',
                                date: getToday(),
                                proformaAmount: '',
                                status: statusTab === 'Running' ? 'Running' : 'Upcoming'
                            });
                            setShowEventModal(true);
                        }}
                            className="primary-btn-premium"
                            style={{
                                height: '56px', padding: '0 24px', borderRadius: '18px', border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, var(--primary) 0%, #d97706 100%)', color: 'black',
                                fontSize: '13px', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '10px',
                                boxShadow: '0 10px 30px rgba(251,191,36,0.2)', transition: '0.3s', letterSpacing: '0.5px',
                                flex: 1, whiteSpace: 'nowrap'
                            }}
                        >
                            <PlusCircle size={20} strokeWidth={2.5} /> NEW MISSION
                        </button>
                    )}
                    {statusTab !== 'Start' && (
                        <button onClick={() => {
                            setIsEditingDuty(false);
                            setDutyFormData({
                                carNumber: '', model: '', dropLocation: '', date: getToday(), eventId: '', dutyAmount: '', ownerName: '', buyAmount: '', driverName: '', vehicleSource: 'Fleet', dutyType: '', remarks: '', guestName: ''
                            });
                            setShowDutyModal(true);
                        }}
                            style={{
                                height: '56px', padding: '0 20px', borderRadius: '18px', border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.05)',
                                color: '#10b981', fontSize: '13px', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '10px',
                                cursor: 'pointer', transition: '0.3s', letterSpacing: '0.5px', flex: 1, whiteSpace: 'nowrap'
                            }}
                        >
                            <Car size={20} strokeWidth={2.5} /> Add Vehicle
                        </button>
                    )}

                </div>
            </div>

            {/* ═══ EVENT ROW LIST ═══ */}
            <div className="event-list" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'clamp(12px, 3vw, 16px)',
                marginBottom: '40px'
            }}>
                {events.length === 0 ? (
                    <div style={{ padding: 'clamp(40px, 8vw, 80px)', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <Target size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                        <h3 style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '800', fontSize: 'clamp(16px, 4vw, 20px)' }}>No {statusTab} Events Found</h3>
                        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>Search returned no matching master records.</p>
                    </div>
                ) : events.filter(e => {
                    if (searchTerm) return e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.client.toLowerCase().includes(searchTerm.toLowerCase());
                    return true;
                }).map((ev, i) => (
                    <motion.div
                        key={ev._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => {
                            if (ev.visualStatus !== 'Upcoming') {
                                fetchEventDetails(ev._id);
                            }
                        }}
                        className={`event-row ${ev.visualStatus !== 'Upcoming' ? 'event-row-hover' : ''}`}
                        style={{
                            background: 'rgba(15, 23, 42, 0.4)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 'clamp(18px, 4vw, 24px)',
                            padding: 'clamp(16px, 4vw, 20px) clamp(20px, 5vw, 24px)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'clamp(16px, 4vw, 24px)',
                            transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            backdropFilter: 'blur(20px)',
                            position: 'relative',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            overflow: 'hidden'
                        }}
                    >
                        {/* 1. Date Block */}
                        {statusTab !== 'Start' && (
                            <div className="date-block" style={{
                                width: 'clamp(60px, 15vw, 80px)', padding: '10px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', flexShrink: 0
                            }}>
                                <div style={{ fontSize: '9px', color: 'var(--primary)', fontWeight: '950', letterSpacing: '1px', textTransform: 'uppercase' }}>{new Date(ev.date).toLocaleDateString('en-IN', { month: '2-digit' }) === 'Invalid Date' ? '--' : new Date(ev.date).toLocaleDateString('en-IN', { month: 'short' })}</div>
                                <div style={{ fontSize: 'clamp(20px, 5vw, 24px)', color: 'white', fontWeight: '950', lineHeight: 1 }}>{new Date(ev.date).getDate()}</div>
                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: '800' }}>{new Date(ev.date).getFullYear()}</div>
                            </div>
                        )}

                        {/* 2. Event Body */}
                        <div className="event-body" style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                <h3 style={{ color: 'white', fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: '950', margin: 0, letterSpacing: '-0.3px' }}>{ev.name}</h3>
                                <div className="status-badge" style={{
                                    padding: '3px 10px', borderRadius: '8px', fontSize: '8px', fontWeight: '900',
                                    background: ev.visualStatus === 'Running' ? 'rgba(251,191,36,0.1)' : ev.visualStatus === 'Upcoming' ? 'rgba(16,185,129,0.1)' : 'rgba(248,113,113,0.1)',
                                    color: ev.visualStatus === 'Running' ? 'var(--primary)' : ev.visualStatus === 'Upcoming' ? '#10b981' : '#f87171',
                                    border: `1px solid ${ev.visualStatus === 'Running' ? 'rgba(251,191,36,0.2)' : ev.visualStatus === 'Upcoming' ? 'rgba(16,185,129,0.2)' : 'rgba(248,113,113,0.2)'}`,
                                    textTransform: 'uppercase', letterSpacing: '0.5px'
                                }}>
                                    {ev.visualStatus === 'Running' ? 'LIVE NOW' : ev.visualStatus.toUpperCase()}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '800' }}>
                                    <Calendar size={14} color="#10b981" /> {formatDateIST(ev.date)}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: '700' }}>
                                    <Briefcase size={14} color="var(--primary)" /> {ev.client}
                                </div>
                                {ev.location && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.25)', fontSize: '13px', fontWeight: '600' }}>
                                        <MapPin size={14} color="#f87171" /> {ev.location}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Resource/Proforma Matrix */}
                        <div className="resource-matrix" style={{ display: 'flex', gap: '24px', alignItems: 'center', padding: '0 24px', borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)', minWidth: '150px', justifyContent: 'center' }}>
                            {statusTab === 'Start' ? (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: '900', marginBottom: '2px', letterSpacing: '0.5px' }}>PROFORMA</div>
                                    <div style={{ color: '#10b981', fontSize: '16px', fontWeight: '950' }}>{ev.proformaAmount ? `₹${ev.proformaAmount.toLocaleString()}` : '-'}</div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: '900', marginBottom: '2px', letterSpacing: '0.5px' }}>FLEET</div>
                                        <div style={{ color: '#38bdf8', fontSize: '16px', fontWeight: '950' }}>{ev.fleetCount || 0}</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: '900', marginBottom: '2px', letterSpacing: '0.5px' }}>EXTERNAL</div>
                                        <div style={{ color: '#a855f7', fontSize: '16px', fontWeight: '950' }}>{ev.externalCount || 0}</div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* 4. Settlement Summary */}
                        {statusTab !== 'Start' && (
                            <div className="settlement-summary" style={{
                                background: 'rgba(16,185,129,0.05)', padding: '10px 16px', borderRadius: '14px',
                                border: '1px solid rgba(16,185,129,0.1)', minWidth: '120px', textAlign: 'right'
                            }}>
                                <div style={{ fontSize: '8px', color: 'rgba(16,185,129,0.5)', fontWeight: '900', marginBottom: '2px', textTransform: 'uppercase' }}>Duty Value</div>
                                <div style={{ color: '#10b981', fontSize: '16px', fontWeight: '950' }}>₹{Number(ev.totalRevenue || 0).toLocaleString()}</div>
                            </div>
                        )}

                        {/* 5. Actions */}
                        <div className="actions-block" style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedEventForRates(ev); setShowRateCardModal(true); }}
                                style={{
                                    width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.1)',
                                    border: '1px solid rgba(56, 189, 248, 0.2)', color: '#38bdf8', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s'
                                }}
                                className="action-btn-list"
                                title="Manage Tariffs / Rate Card"
                            >
                                <IndianRupee size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleEditEvent(ev); }}
                                style={{
                                    width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s'
                                }}
                                className="action-btn-list"
                            >
                                <Edit size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev._id); }}
                                style={{
                                    width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(244,63,94,0.08)',
                                    border: '1px solid rgba(244,63,94,0.15)', color: '#f43f5e', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s'
                                }}
                                className="action-btn-list"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ═══ MASTER GRID FOCUS ═══ */}
            {/* Removed global duty logs as requested by user to simplify and focus UI on Master Events */}

            {/* ═══ DUTY LOG MODAL ═══ */}
            <AnimatePresence>
                {showDutyModal && (
                    <div className="modal-overlay" style={{ zIndex: 10010 }}>
                        <motion.div
                            initial={{ y: 50, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 20, opacity: 0, scale: 0.98 }}
                            className="modal-container"
                            style={{
                                width: 'min(95%, 650px)',
                                borderRadius: '32px',
                                background: '#0a0f1d',
                                border: '1px solid rgba(255,255,255,0.08)',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                maxHeight: '95vh',
                                boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Dynamic Header */}
                            <div style={{
                                background: 'linear-gradient(to right, rgba(251, 191, 36, 0.05), rgba(14, 165, 233, 0.03))',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                padding: 'clamp(20px, 4vw, 28px) clamp(20px, 5vw, 32px)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                backdropFilter: 'blur(20px)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: 'clamp(32px, 8vw, 40px)', height: 'clamp(32px, 8vw, 40px)', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Briefcase size={20} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: '950', color: 'white', letterSpacing: '-0.8px', lineHeight: 1.1 }}>
                                            {isEditingDuty ? 'Update Duty' : 'Log Assignment'}
                                        </h3>
                                        <p className="hide-mobile" style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: '600', letterSpacing: '0.2px', marginTop: '4px' }}>Operational Command Center Entry Flow</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowDutyModal(false)} className="close-btn" style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '12px',
                                    padding: '8px',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}><X size={20} /></button>
                            </div>

                            {/* Scrollable Body */}
                            <form onSubmit={handleSubmitDuty} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, minHeight: 0 }}>
                                <div style={{ padding: 'clamp(20px, 5vw, 32px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }} className="premium-scroll">

                                    {/* Section 1: Logistics Context */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            {['Fleet', 'External'].map(src => (
                                                <button key={src} type="button" onClick={() => setDutyFormData(prev => ({ ...prev, vehicleSource: src }))}
                                                    style={{
                                                        flex: 1, height: '48px', borderRadius: '14px', border: `1px solid ${dutyFormData.vehicleSource === src ? (src === 'Fleet' ? '#10b98150' : 'var(--primary)50') : 'rgba(255,255,255,0.06)'}`,
                                                        background: dutyFormData.vehicleSource === src ? (src === 'Fleet' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)') : 'rgba(255,255,255,0.02)',
                                                        color: dutyFormData.vehicleSource === src ? (src === 'Fleet' ? '#10b981' : 'var(--primary)') : 'rgba(255,255,255,0.3)',
                                                        fontWeight: '900', fontSize: '11px', letterSpacing: '1px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                                    }}>
                                                    {src === 'Fleet' ? <Building2 size={16} /> : <TruckIcon size={16} />}
                                                    {src.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="form-grid-2">
                                            <div className="premium-input-group">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Target size={12} color="var(--primary)" style={{ opacity: 0.7 }} />
                                                    <label className="premium-label">Operational Event</label>
                                                </div>
                                                <select required value={dutyFormData.eventId} onChange={e => setDutyFormData({ ...dutyFormData, eventId: e.target.value })} className="premium-compact-input" style={{ appearance: 'none', height: '50px' }}>
                                                    <option value="" disabled>Select Master Event</option>
                                                    {events.map(e => <option key={e._id} value={e._id}>{e.name} • {e.client}</option>)}
                                                </select>
                                            </div>
                                            
                                            {dutyFormData.eventId && events.find(e => e._id === dutyFormData.eventId)?.rateCard?.length > 0 && (
                                                <div className="premium-input-group">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Wallet size={12} color="var(--primary)" style={{ opacity: 0.7 }} />
                                                        <label className="premium-label">Select Service / Tariff</label>
                                                    </div>
                                                    <select 
                                                        value={dutyFormData.serviceId || ''} 
                                                        onChange={e => {
                                                            const svcId = e.target.value;
                                                            const evnt = events.find(ev => ev._id === dutyFormData.eventId);
                                                            const svc = evnt?.rateCard?.find(r => r._id === svcId);
                                                            setDutyFormData({ 
                                                                ...dutyFormData, 
                                                                serviceId: svcId, 
                                                                dutyAmount: svc ? svc.baseRate : dutyFormData.dutyAmount,
                                                                dutyType: svc ? svc.serviceName : dutyFormData.dutyType,
                                                                model: svc?.vehicleModel ? svc.vehicleModel : dutyFormData.model
                                                            });
                                                        }} 
                                                        className="premium-compact-input" style={{ appearance: 'none', height: '50px' }}
                                                    >
                                                        <option value="">-- Custom / No Tariff --</option>
                                                        {events.find(e => e._id === dutyFormData.eventId).rateCard.map(r => (
                                                            <option key={r._id} value={r._id}>{r.serviceName} (₹{r.baseRate}) {r.vehicleModel ? ` - ${r.vehicleModel}` : ''}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            
                                            <div className="premium-input-group">
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                            <Calendar size={12} color="var(--primary)" style={{ opacity: 0.7 }} />
                                                            <label className="premium-label">Log Date</label>
                                                        </div>
                                                        <div style={{ position: 'relative' }}>
                                                            <PremiumDateInput
                                                                value={dutyFormData.date}
                                                                onChange={val => setDutyFormData({ ...dutyFormData, date: val })}
                                                                required
                                                                inputStyle={{ textAlign: 'left', colorScheme: 'dark', height: '50px', width: '100%', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', padding: '0 40px 0 15px', borderRadius: '10px' }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                            <Calendar size={12} color="var(--primary)" style={{ opacity: 0.7 }} />
                                                            <label className="premium-label">Log Time</label>
                                                        </div>
                                                        <div style={{ position: 'relative' }}>
                                                            <input
                                                                type="time"
                                                                value={dutyFormData.dutyTime}
                                                                onChange={e => setDutyFormData({ ...dutyFormData, dutyTime: e.target.value })}
                                                                className="premium-compact-input"
                                                                required
                                                                style={{ colorScheme: 'dark', height: '50px', width: '100%', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', padding: '0 10px 0 15px', borderRadius: '10px' }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Resource Allocation */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: 'clamp(15px, 4vw, 24px)', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                        <div className="form-grid-2">
                                            <div className="premium-input-group">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Car size={12} color="#10b981" />
                                                    <label className="premium-label">Vehicle Numbers</label>
                                                </div>
                                                <input type="text" list={dutyFormData.vehicleSource === 'Fleet' ? "masterCars" : "externalCars"} required value={dutyFormData.carNumber} onChange={e => handleCarNumberChange(e.target.value)} className="premium-compact-input" placeholder="Search Vehicle..." style={{ textTransform: 'uppercase', height: '50px' }} />
                                                {dutyFormData.vehicleSource === 'Fleet' ? (
                                                    <datalist id="masterCars">
                                                        {allVehiclesMaster.map(v => <option key={v._id} value={v.carNumber} />)}
                                                    </datalist>
                                                ) : (
                                                    <datalist id="externalCars">
                                                        {externalVehicleSuggestions.map(v => <option key={v} value={v} />)}
                                                    </datalist>
                                                )}
                                            </div>
                                            <div className="premium-input-group">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <TruckIcon size={12} color="#10b981" />
                                                    <label className="premium-label">Vehicle Specification</label>
                                                </div>
                                                <input type="text" value={dutyFormData.model} onChange={e => setDutyFormData({ ...dutyFormData, model: e.target.value })} className="premium-compact-input" placeholder="e.g. Innova Crysta" style={{ height: '50px' }} />
                                            </div>
                                        </div>

                                        <div className="form-grid-2">
                                            <div className="premium-input-group">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <User size={12} color="#10b981" />
                                                    <label className="premium-label">Operator / Driver</label>
                                                </div>
                                                <input type="text" value={dutyFormData.driverName} onChange={e => setDutyFormData({ ...dutyFormData, driverName: e.target.value })} className="premium-compact-input" placeholder="Enter full name" style={{ height: '50px' }} />
                                            </div>
                                            <div className="premium-input-group">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Users size={12} color="#10b981" />
                                                    <label className="premium-label">Guest Name</label>
                                                </div>
                                                <input type="text" value={dutyFormData.guestName} onChange={e => setDutyFormData({ ...dutyFormData, guestName: e.target.value })} className="premium-compact-input" placeholder="e.g. Rahul Sharma" style={{ height: '50px' }} />
                                            </div>
                                        </div>
                                        
                                        {dutyFormData.vehicleSource === 'External' && (
                                            <div className="form-grid-2">
                                                <div className="premium-input-group">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <User size={12} color="#a855f7" />
                                                        <label className="premium-label" style={{ color: '#a855f7' }}>Vendor / Market Owner *</label>
                                                    </div>
                                                    <input type="text" required value={dutyFormData.ownerName || ''} onChange={e => setDutyFormData({ ...dutyFormData, ownerName: e.target.value })} className="premium-compact-input" placeholder="Vendor Name" style={{ height: '50px', borderColor: 'rgba(168,85,247,0.3)' }} />
                                                </div>
                                                <div className="premium-input-group">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Target size={12} color="#a855f7" />
                                                        <label className="premium-label" style={{ color: '#a855f7' }}>Buy Amount (Vendor Payout) *</label>
                                                    </div>
                                                    <div style={{ position: 'relative' }}>
                                                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', fontWeight: '900', color: '#a855f7' }}>₹</span>
                                                        <input type="number" required value={dutyFormData.buyAmount || ''} onChange={e => setDutyFormData({ ...dutyFormData, buyAmount: e.target.value })} className="premium-compact-input" placeholder="0" style={{ paddingLeft: '35px', color: '#a855f7', fontWeight: '800', height: '50px', borderColor: 'rgba(168,85,247,0.3)' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                    </div>

                                    {/* Section 3: Logistic Details */}
                                    <div className="form-grid-2">
                                        <div className="premium-input-group">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Briefcase size={12} color="var(--primary)" />
                                                <label className="premium-label">Service Category</label>
                                            </div>
                                            <input type="text" list="eventDutyTypes" value={dutyFormData.dutyType} onChange={e => setDutyFormData({ ...dutyFormData, dutyType: e.target.value })} className="premium-compact-input" placeholder="e.g. Airport Transfer" style={{ height: '50px' }} />
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                                {['Airport Pickup & Drop', 'RSD Pickup & Drop', 'Bus Stand Pickup & Drop'].map(t => (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => setDutyFormData({ ...dutyFormData, dutyType: t })}
                                                        style={{
                                                            fontSize: '9px',
                                                            fontWeight: '900',
                                                            background: dutyFormData.dutyType === t ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                                            color: dutyFormData.dutyType === t ? 'var(--primary)' : 'rgba(255, 255, 255, 0.4)',
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            border: `1px solid ${dutyFormData.dutyType === t ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                                            cursor: 'pointer',
                                                            transition: '0.2s'
                                                        }}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                            <datalist id="eventDutyTypes">
                                                {dutyTypeSuggestions.map(t => <option key={t} value={t} />)}
                                            </datalist>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Wallet size={12} color="#10b981" />
                                                <label className="premium-label">Revenue Amount (₹)</label>
                                            </div>
                                            <div style={{ position: 'relative', marginTop: '8px' }}>
                                                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', fontWeight: '900', color: '#10b981' }}>₹</span>
                                                <input type="number" required value={dutyFormData.dutyAmount} onChange={e => setDutyFormData({ ...dutyFormData, dutyAmount: e.target.value })} className="premium-compact-input" placeholder="0" style={{ paddingLeft: '35px', color: '#10b981', fontWeight: '800', height: '50px' }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="premium-input-group" style={{ marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Navigation size={12} color="var(--primary)" />
                                            <label className="premium-label">Operational Destination</label>
                                        </div>
                                        <input type="text" list="eventDropLocs" value={dutyFormData.dropLocation} onChange={e => setDutyFormData({ ...dutyFormData, dropLocation: e.target.value })} className="premium-compact-input" placeholder="Specific drop point or venue..." style={{ height: '50px' }} />
                                        <datalist id="eventDropLocs">
                                            {dropLocationSuggestions.map(loc => <option key={loc} value={loc} />)}
                                        </datalist>
                                    </div>
                                    <div className="premium-input-group" style={{ marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FileText size={12} color="var(--primary)" style={{ opacity: 0.7 }} />
                                            <label className="premium-label">Operational Remarks / Guest Names</label>
                                        </div>
                                        <textarea rows="2" value={dutyFormData.remarks} onChange={e => setDutyFormData({ ...dutyFormData, remarks: e.target.value })} className="premium-compact-input" placeholder="Enter important mission notes here..." style={{ height: 'auto', padding: '12px', minHeight: '80px', resize: 'none' }} />
                                    </div>
                                </div>

                                {/* Fixed Footer */}
                                <div style={{
                                    padding: 'clamp(20px, 4vw, 24px) clamp(20px, 5vw, 32px)',
                                    borderTop: '1px solid rgba(255,255,255,0.06)',
                                    background: 'rgba(15, 23, 42, 0.9)',
                                    display: 'flex',
                                    gap: '12px'
                                }}>
                                    <button type="button" onClick={() => setShowDutyModal(false)} style={{
                                        flex: 1, height: '50px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                        color: 'rgba(255,255,255,0.5)', fontWeight: '800', fontSize: '13px'
                                    }}>Cancel</button>
                                    <button type="submit" style={{
                                        flex: 2, height: '50px', borderRadius: '14px', background: 'linear-gradient(to right, var(--primary), var(--primary))',
                                        color: 'black', fontWeight: '900', fontSize: '13px', border: 'none'
                                    }}>
                                        {isEditingDuty ? 'SAVE CHANGES' : 'GENERATE LOG'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >

            {/* ═══ EVENT DETAILS MODAL ═══ */}
            <AnimatePresence>
                {showDetailsModal && selectedEventDetails && (
                    <div className="modal-overlay" style={{ zIndex: 10000 }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="modal-container"
                            style={{
                                width: 'min(98%, 1000px)',
                                maxHeight: '95vh',
                                background: '#0a0f1d',
                                borderRadius: 'clamp(24px, 4vw, 32px)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <div style={{ padding: 'clamp(20px, 4vw, 32px)', background: 'rgba(15,23,42,0.8)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                        <h2 style={{ color: 'white', fontSize: 'clamp(20px, 5vw, 32px)', fontWeight: '950', margin: 0 }}>{selectedEventDetails.event.name}</h2>
                                        {(() => {
                                            const evDate = toISTDateString(new Date(selectedEventDetails.event.date));
                                            const todayStr = todayIST();
                                            let vStat = selectedEventDetails.event.status || 'Upcoming';
                                            if (vStat === 'Upcoming' && evDate <= todayStr) vStat = 'Running';

                                            return (
                                                <span style={{
                                                    padding: '4px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: '950',
                                                    background: vStat === 'Running' ? 'var(--primary)33' : vStat === 'Closed' ? '#f8717133' : '#10b98133',
                                                    color: vStat === 'Running' ? 'var(--primary)' : vStat === 'Closed' ? '#f87171' : '#10b981',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {vStat}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: '700' }}>
                                            <Building2 size={16} color="var(--primary)" /> {selectedEventDetails.event.client}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: '700' }}>
                                            <Calendar size={16} color="var(--primary)" /> {formatDateIST(selectedEventDetails.event.date)}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    {selectedEventDetails.event?.status !== 'Upcoming' && (
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button onClick={() => exportEventSpecificExcel(selectedEventDetails)} className="hide-mobile" style={{ height: '40px', padding: '0 15px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontWeight: '800', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}><FileSpreadsheet size={16} /> EXCEL</button>
                                            <button onClick={() => handleExportEventPDF('client')} style={{ height: '40px', padding: '0 15px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: '800', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}><Download size={16} /> PDF</button>
                                        </div>
                                    )}
                                    <button onClick={() => setShowDetailsModal(false)} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={24} /></button>
                                </div>
                            </div>

                            <div style={{ padding: 'clamp(16px, 4vw, 32px)', overflowY: 'auto' }} className="premium-scroll">
                                {/* Stats Summary */}
                                {selectedEventDetails.event?.status !== 'Upcoming' && (
                                <div className="stats-grid" style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                                    gap: '12px',
                                    marginBottom: '32px',
                                    width: '100%'
                                }}>
                                    {[
                                        { label: 'Total Duties', value: (selectedEventDetails.fleetDuties.length + selectedEventDetails.externalDuties.length), color: 'var(--primary)', icon: <TruckIcon size={18} />, sub: 'All Resources' },
                                        { label: 'Fleet Revenue', value: `₹${(selectedEventDetails.fleetDuties.reduce((sum, d) => sum + (Number(d.dutyAmount) || 0), 0)).toLocaleString()}`, color: '#38bdf8', icon: <Car size={18} />, sub: `${selectedEventDetails.fleetDuties.length} Fleet` },
                                        { label: 'External Rev', value: `₹${(selectedEventDetails.externalDuties.reduce((sum, d) => sum + (Number(d.dutyAmount) || 0), 0)).toLocaleString()}`, color: '#a855f7', icon: <Users size={18} />, sub: `${selectedEventDetails.externalDuties.length} Market` },
                                        { label: 'Grand Total', value: `₹${([...selectedEventDetails.externalDuties, ...selectedEventDetails.fleetDuties].reduce((sum, d) => sum + (Number(d.dutyAmount) || 0), 0)).toLocaleString()}`, color: '#10b981', icon: <Target size={18} />, sub: 'Master Settlement' },
                                    ].map((s, i) => (
                                        <div key={s.label}
                                            style={{
                                                padding: '16px', borderRadius: '20px',
                                                background: 'rgba(15, 23, 42, 0.4)',
                                                border: `1px solid rgba(255,255,255,0.05)`,
                                                borderLeft: `3px solid ${s.color}`,
                                                display: 'flex', flexDirection: 'column', gap: '4px',
                                                boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '8px', fontWeight: '900', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{s.label}</span>
                                                <div style={{ color: s.color, opacity: 0.5 }}>{s.icon}</div>
                                            </div>
                                            <span style={{ color: 'white', fontSize: '18px', fontWeight: '950' }}>{s.value}</span>
                                            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: '700' }}>{s.sub}</span>
                                        </div>
                                    ))}
                                </div>
                                )}

                                {/* ═══ CONSOLIDATED DUTY LOG ═══ */}
                                <div style={{
                                    background: 'rgba(15, 23, 42, 0.4)',
                                    borderRadius: '24px',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    overflow: 'hidden',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
                                }}>
                                    <div style={{
                                        padding: '16px 24px',
                                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        background: 'rgba(255,255,255,0.02)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Briefcase size={18} color="var(--primary)" />
                                            <h4 style={{ color: 'white', margin: 0, fontSize: '16px', fontWeight: '950' }}>OPERATIONAL LOGS</h4>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <select
                                                value={dutyDateFilter}
                                                onChange={(e) => setDutyDateFilter(e.target.value)}
                                                style={{
                                                    background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', outline: 'none', cursor: 'pointer'
                                                }}
                                            >
                                                <option value="All" style={{ color: 'black' }}>All Dates</option>
                                                {[...new Set([...selectedEventDetails.fleetDuties, ...selectedEventDetails.externalDuties].map(d => formatDateIST(d.date || d.createdAt)))].map(dateStr => (
                                                    <option key={dateStr} value={dateStr} style={{ color: 'black' }}>{dateStr}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={dutyFilter}
                                                onChange={(e) => setDutyFilter(e.target.value)}
                                                style={{
                                                    background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', outline: 'none', cursor: 'pointer'
                                                }}
                                            >
                                                <option value="All" style={{ color: 'black' }}>All Vehicles</option>
                                                <option value="Fleet" style={{ color: 'black' }}>Internal (Fleet)</option>
                                                <option value="External" style={{ color: 'black' }}>External</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="hide-mobile">
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                                                    <th style={{ padding: '16px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>TIMELINE</th>
                                                    <th style={{ padding: '16px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>VEHICLE / RESOURCE</th>
                                                    <th style={{ padding: '16px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>LOGISTICS</th>
                                                    <th style={{ padding: '16px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>GUEST NAME</th>
                                                    <th style={{ padding: '16px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>SETTLEMENT / EXTRAS</th>
                                                    <th style={{ padding: '16px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>ACTIONS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[...selectedEventDetails.fleetDuties, ...selectedEventDetails.externalDuties]
                                                    .filter(d => dutyFilter === 'All' || (dutyFilter === 'Fleet' ? d.vehicleSource === 'Fleet' : d.vehicleSource !== 'Fleet'))
                                                    .filter(d => dutyDateFilter === 'All' || formatDateIST(d.date || d.createdAt) === dutyDateFilter)
                                                    .sort((a, b) => {
                                                        const dateA = new Date(a.date || a.createdAt);
                                                        const dateB = new Date(b.date || b.createdAt);
                                                        if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
                                                        return (a.dutyTime || '00:00').localeCompare(b.dutyTime || '00:00');
                                                    })
                                                    .map((d) => (
                                                        <tr key={d._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="table-row-hover">
                                                            <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                    <div style={{ color: 'white', fontWeight: '900', fontSize: '14px' }}>{formatDateIST(d.date || d.createdAt)}</div>
                                                                    <div style={{ color: 'var(--primary)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', marginTop: '4px' }}>{renderTime(d.dutyTime)}</div>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                                                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: d.vehicleSource === 'Fleet' ? 'rgba(16,185,129,0.1)' : 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <Car size={18} color={d.vehicleSource === 'Fleet' ? '#10b981' : '#a855f7'} />
                                                                    </div>
                                                                    <div style={{ textAlign: 'left' }}>
                                                                        <div style={{ color: 'white', fontWeight: '900', fontSize: '13px' }}>{d.vehicle?.carNumber || d.vehicleNumber || d.carNumber?.split('#')[0] || 'N/A'}</div>
                                                                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{d.driver?.name || d.driverName || 'N/A'}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                    <div className="badge-duty" style={{ fontSize: '10px', display: 'inline-block' }}>{d.dutyType || 'General'}</div>
                                                                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginTop: '4px' }}>{d.dropLocation || '—'}</div>
                                                                    {d.remarks && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', marginTop: '4px', fontStyle: 'italic' }}>{d.remarks}</div>}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: '700' }}>{d.guestName || '-'}</div>
                                                            </td>
                                                            <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                                <div style={{ color: '#10b981', fontWeight: '900', fontSize: '14px' }}>₹{Number(d.dutyAmount || 0).toLocaleString()}</div>
                                                                {d.billingDetails && (
                                                                    <div style={{ marginTop: '8px', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left', display: 'inline-block' }}>
                                                                        {d.billingDetails.serviceName && <div style={{ fontSize: '9px', color: '#38bdf8', fontWeight: '800', marginBottom: '2px' }}>{d.billingDetails.serviceName}</div>}
                                                                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>Base: ₹{d.billingDetails.baseRate || 0}</div>
                                                                        {Number(d.billingDetails.calculatedExtraKmsAmount) > 0 && <div style={{ fontSize: '9px', color: '#f59e0b' }}>+KM: ₹{d.billingDetails.calculatedExtraKmsAmount}</div>}
                                                                        {Number(d.billingDetails.calculatedExtraHoursAmount) > 0 && <div style={{ fontSize: '9px', color: '#f59e0b' }}>+Hr: ₹{d.billingDetails.calculatedExtraHoursAmount}</div>}
                                                                        {Number(d.billingDetails.driverAllowanceRate) > 0 && <div style={{ fontSize: '9px', color: '#10b981' }}>+DA: ₹{d.billingDetails.driverAllowanceRate}</div>}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                                <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'center' }}>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleEditDuty(d); }} style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><Edit size={14} /></button>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteDuty(d._id, d.isAttendance); }} style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', color: '#f43f5e', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="show-mobile" style={{ padding: '16px' }}>
                                        {[...selectedEventDetails.fleetDuties, ...selectedEventDetails.externalDuties]
                                            .filter(d => dutyFilter === 'All' || (dutyFilter === 'Fleet' ? d.vehicleSource === 'Fleet' : d.vehicleSource !== 'Fleet'))
                                            .filter(d => dutyDateFilter === 'All' || formatDateIST(d.date || d.createdAt) === dutyDateFilter)
                                            .sort((a, b) => {
                                                const dateA = new Date(a.date || a.createdAt);
                                                const dateB = new Date(b.date || b.createdAt);
                                                if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
                                                return (a.dutyTime || '00:00').localeCompare(b.dutyTime || '00:00');
                                            })
                                            .map((d) => (
                                                <div key={d._id} style={{
                                                    background: 'rgba(255,255,255,0.02)',
                                                    borderRadius: '16px',
                                                    padding: '16px',
                                                    marginBottom: '12px',
                                                    border: '1px solid rgba(255,255,255,0.05)'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                        <div>
                                                            <div style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: '13px' }}>
                                                                {formatDateIST(d.date || d.createdAt)} <span style={{ color: 'var(--primary)' }}>• {renderTime(d.dutyTime)}</span>
                                                            </div>
                                                            <div style={{ color: 'var(--primary)', fontSize: '10px', fontWeight: '800' }}>{d.vehicleSource} Resource</div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ color: '#10b981', fontWeight: '950', fontSize: '16px' }}>₹{Number(d.dutyAmount || 0).toLocaleString()}</div>
                                                            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '8px', fontWeight: '900' }}>SETTLEMENT</div>
                                                            {d.billingDetails && (
                                                                <div style={{ marginTop: '4px', textAlign: 'right' }}>
                                                                    {Number(d.billingDetails.calculatedExtraKmsAmount) > 0 && <span style={{ fontSize: '9px', color: '#f59e0b', marginLeft: '4px' }}>+KM:₹{d.billingDetails.calculatedExtraKmsAmount}</span>}
                                                                    {Number(d.billingDetails.calculatedExtraHoursAmount) > 0 && <span style={{ fontSize: '9px', color: '#f59e0b', marginLeft: '4px' }}>+Hr:₹{d.billingDetails.calculatedExtraHoursAmount}</span>}
                                                                    {Number(d.billingDetails.driverAllowanceRate) > 0 && <span style={{ fontSize: '9px', color: '#10b981', marginLeft: '4px' }}>+DA:₹{d.billingDetails.driverAllowanceRate}</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}>
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: d.vehicleSource === 'Fleet' ? '#10b98120' : '#a855f720', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Car size={20} color={d.vehicleSource === 'Fleet' ? '#10b981' : '#a855f7'} />
                                                        </div>
                                                        <div>
                                                            <div style={{ color: 'white', fontWeight: '900', fontSize: '14px' }}>{d.vehicle?.carNumber || d.vehicleNumber || d.carNumber?.split('#')[0] || 'N/A'}</div>
                                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{d.driver?.name || d.driverName || 'N/A'}</div>
                                                            {d.guestName && <div style={{ color: 'var(--primary)', fontSize: '11px', marginTop: '2px', fontWeight: '800' }}>{d.guestName}</div>}
                                                            {d.remarks && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px', fontStyle: 'italic' }}>{d.remarks}</div>}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div className="badge-duty" style={{ fontSize: '10px' }}>{d.dutyType || 'General'}</div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button onClick={() => handleEditDuty(d)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}><Edit size={16} /></button>
                                                            <button onClick={() => handleDeleteDuty(d._id, d.isAttendance)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', color: '#f43f5e' }}><Trash2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>

                                    {[...selectedEventDetails.fleetDuties, ...selectedEventDetails.externalDuties].length === 0 && (
                                        <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
                                            <TruckIcon size={40} style={{ opacity: 0.1, marginBottom: '16px' }} />
                                            <p style={{ margin: 0, fontWeight: '800', fontSize: '14px' }}>No operational logs recorded.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ CONFIGURE EVENT MODAL ═══ */}
            <AnimatePresence>
                {showEventModal && (
                    <div className="modal-overlay">
                        <motion.div
                            initial={{ y: 50, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 20, opacity: 0, scale: 0.98 }}
                            className="modal-container small"
                            style={{
                                width: 'min(95%, 480px)',
                                borderRadius: '32px',
                                background: '#0a101f',
                                border: '1px solid rgba(255,255,255,0.1)',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 40px 100px rgba(0,0,0,0.6)'
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                background: 'linear-gradient(to bottom right, rgba(251, 191, 36, 0.08), rgba(0,0,0,0))',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                padding: 'clamp(20px, 4vw, 28px) clamp(20px, 5vw, 32px)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: 'clamp(32px, 8vw, 40px)', height: 'clamp(32px, 8vw, 40px)', borderRadius: '10px', background: 'rgba(251,191,36,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Target size={18} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: '950', color: 'white', letterSpacing: '-0.5px' }}>{isEditingEvent ? 'Update Event' : 'New Event'}</h3>
                                        <p className="hide-mobile" style={{ margin: 4, fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>Create a high-level operational master</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowEventModal(false)} className="close-btn" style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: 'white',
                                    padding: '8px'
                                }}><X size={18} /></button>
                            </div>

                            {/* Body */}
                            <form onSubmit={handleCreateEvent} style={{ padding: 'clamp(20px, 5vw, 32px)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div className="form-grid-2">
                                    <div className="premium-input-group">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Target size={12} color="var(--primary)" />
                                            <label className="premium-label">Event Name *</label>
                                        </div>
                                        <input type="text" required value={eventFormData.name} onChange={e => setEventFormData({ ...eventFormData, name: e.target.value })} className="premium-compact-input" placeholder="Event" style={{ height: '52px' }} />
                                    </div>
                                    <div className="premium-input-group">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Building2 size={12} color="var(--primary)" />
                                            <label className="premium-label">Client *</label>
                                        </div>
                                        <input type="text" required value={eventFormData.client} onChange={e => setEventFormData({ ...eventFormData, client: e.target.value })} className="premium-compact-input" placeholder="Client Name" style={{ height: '52px' }} />
                                    </div>
                                </div>

                                <div className="form-grid-2">
                                    <div className="premium-input-group">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Calendar size={12} color="var(--primary)" />
                                            <label className="premium-label">Focus Date</label>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <PremiumDateInput
                                                value={eventFormData.date}
                                                onChange={val => setEventFormData({ ...eventFormData, date: val })}
                                                required
                                                inputStyle={{ textAlign: 'left', colorScheme: 'dark', height: '52px', width: '100%', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', padding: '0 40px 0 15px', borderRadius: '10px' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="premium-input-group">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Target size={12} color="var(--primary)" />
                                            <label className="premium-label">Phase / Status</label>
                                        </div>
                                        <select value={eventFormData.status} onChange={e => setEventFormData({ ...eventFormData, status: e.target.value })} className="premium-compact-input" style={{ height: '52px' }}>
                                            {!isEditingEvent && statusTab !== 'Running' && <option value="Upcoming">Upcoming (Start)</option>}
                                            <option value="Running">Running</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="form-grid-2">
                                    <div className="premium-input-group">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <IndianRupee size={12} color="var(--primary)" />
                                            <label className="premium-label">Proforma Amount</label>
                                        </div>
                                        <input type="number" value={eventFormData.proformaAmount} onChange={e => setEventFormData({ ...eventFormData, proformaAmount: e.target.value })} className="premium-compact-input" placeholder="e.g. 50000" style={{ height: '52px' }} />
                                    </div>
                                </div>

                                <div style={{ marginTop: '10px', display: 'flex', gap: '12px' }}>
                                    <button type="button" onClick={() => setShowEventModal(false)} className="hide-mobile" style={{
                                        flex: 1, height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                        color: 'rgba(255,255,255,0.5)', fontWeight: '800', fontSize: '14px'
                                    }}>Cancel</button>
                                    <button type="submit" style={{
                                        flex: 2, height: '56px', borderRadius: '16px', background: 'linear-gradient(to right, var(--primary), var(--primary))',
                                        color: 'black', fontWeight: '900', fontSize: '15px', letterSpacing: '1px', border: 'none'
                                    }}>{isEditingEvent ? 'UPDATE' : 'SUBMIT'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ RATE CARD MODAL ═══ */}
            <AnimatePresence>
                {showRateCardModal && selectedEventForRates && (
                    <div className="modal-overlay" onClick={() => { setShowRateCardModal(false); setSelectedEventForRates(null); setSelectedSubTypes([]); setMultiRateCardsData({}); setRateCardFormData({ serviceName: '', vehicleType: '', vehicleModel: '', baseRate: '', baseKms: '', baseHours: '', extraKmRate: '', extraHourRate: '', driverAllowance: '' }); }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="premium-scroll"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '24px', padding: 'clamp(20px, 5vw, 32px)', width: '100%', maxWidth: '900px',
                                maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', position: 'relative'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                <div>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', borderRadius: '8px', fontSize: '12px', fontWeight: '800', marginBottom: '8px' }}>
                                        <Wallet size={14} /> TARIFFS & RATES
                                    </div>
                                    <h2 style={{ color: 'white', fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: '900', margin: 0 }}>Rate Card: {selectedEventForRates.name}</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '4px 0 0 0' }}>Manage tariffs for different services and vehicles.</p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <button onClick={() => { console.log('Clicked Add Custom Vehicle. Setting state to true.'); setShowAddCustomVehicleModal(true); }} style={{ height: '40px', padding: '0 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', transition: 'all 0.2s' }}>
                                        <Plus size={16} color="var(--primary)" /> Add Custom Vehicle
                                    </button>
                                    <button onClick={handleOpenPDFCustomizer} style={{ height: '40px', padding: '0 16px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                                        <Download size={16} /> PDF Export
                                    </button>
                                    <button onClick={() => { setIsRateFormOpen(true); setPricingStep(1); setSelectedSubTypes([]); setMultiRateCardsData({}); setRateCardFormData({ serviceName: '', vehicleType: '', vehicleModel: '', baseRate: '', baseKms: '', baseHours: '', extraKmRate: '', extraHourRate: '', driverAllowance: '' }); }} style={{ height: '40px', padding: '0 16px', borderRadius: '12px', background: 'linear-gradient(to right, var(--primary), #f59e0b)', border: 'none', color: 'black', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <Plus size={16} /> Add New Rate
                                    </button>
                                    <button onClick={() => { setShowRateCardModal(false); setSelectedEventForRates(null); setIsRateFormOpen(false); setSelectedSubTypes([]); setMultiRateCardsData({}); }} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <AnimatePresence>
                            {isRateFormOpen && (
                                <motion.form 
                                    initial={{ opacity: 0, height: 0, overflow: 'hidden' }} 
                                    animate={{ opacity: 1, height: 'auto', overflow: 'visible' }} 
                                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                                    onSubmit={handleSaveRateCard} 
                                    style={{ background: 'rgba(251, 191, 36, 0.05)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(251, 191, 36, 0.2)', marginBottom: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <h3 style={{ color: 'var(--primary)', fontSize: '16px', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Edit size={18} /> {rateCardFormData._id ? 'Edit Rate Details' : 'Configure New Rate'}
                                        </h3>
                                    </div>
                                    <div style={{ display: pricingStep === 1 ? 'block' : 'none' }}>
<div className="form-grid-3">
                                    <div className="input-group">
                                        <label className="label-text">Service Name *</label>
                                        <input required type="text" list="serviceOptions" className="premium-compact-input" placeholder="e.g. Airport Drop, 8Hr/80Km" value={rateCardFormData.serviceName} onChange={(e) => setRateCardFormData({ ...rateCardFormData, serviceName: e.target.value })} />
                                        <datalist id="serviceOptions">
                                            <option value="Airport Pickup & Drop" />
                                            <option value="Railway Station Pickup & Drop" />
                                            <option value="Bus Stand Pickup & Drop" />
                                            <option value="Local 8Hr/80Km" />
                                            <option value="Local 12Hr/120Km" />
                                            <option value="Outstation" />
                                        </datalist>
                                    </div>
                                    {rateCardFormData._id ? (
                                        <>
                                            <div className="input-group">
                                                <label className="label-text">Vehicle Category</label>
                                                <select className="premium-compact-input" value={rateCardFormData.vehicleType} onChange={(e) => setRateCardFormData({ ...rateCardFormData, vehicleType: e.target.value, vehicleModel: '' })}>
                                                    <option value="">Any</option>
                                                    <option value="Sedan">Sedan</option>
                                                    <option value="SUV">SUV</option>
                                                    <option value="Bus">Bus</option>
                                                    <option value="Tempo">Tempo Traveller</option>
                                                </select>
                                            </div>
                                            {rateCardFormData.vehicleType && (
                                                <div className="input-group">
                                                    <label className="label-text">Vehicle Model</label>
                                                    <select 
                                                        className="premium-compact-input" 
                                                        value={rateCardFormData.vehicleModel || ''} 
                                                        onChange={(e) => setRateCardFormData({ ...rateCardFormData, vehicleModel: e.target.value })}
                                                    >
                                                        <option value="">Any Model</option>
                                                        {([
                                                            ...(VEHICLE_SUB_CATEGORIES[rateCardFormData.vehicleType] || []),
                                                            ...((selectedEventForRates?.customVehicles && selectedEventForRates.customVehicles[rateCardFormData.vehicleType]) || [])
                                                        ]).map(model => (
                                                            <option key={model} value={model}>{model}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div className="input-group">
                                                <label className="label-text">Base Rate (₹) *</label>
                                                <input required type="number" className="premium-compact-input" placeholder="0" value={rateCardFormData.baseRate} onChange={(e) => setRateCardFormData({ ...rateCardFormData, baseRate: e.target.value })} />
                                            </div>
                                            {!isPDService(rateCardFormData.serviceName) && (
                                                <>
                                                    <div className="input-group">
                                                        <label className="label-text">Base Limit KMs</label>
                                                        <input type="number" className="premium-compact-input" placeholder="0" value={rateCardFormData.baseKms} onChange={(e) => setRateCardFormData({ ...rateCardFormData, baseKms: e.target.value })} />
                                                    </div>
                                                    <div className="input-group">
                                                        <label className="label-text">Base Limit Hours</label>
                                                        <input type="number" className="premium-compact-input" placeholder="0" value={rateCardFormData.baseHours} onChange={(e) => setRateCardFormData({ ...rateCardFormData, baseHours: e.target.value })} />
                                                    </div>
                                                    <div className="input-group">
                                                        <label className="label-text">Extra Rate / KM (₹)</label>
                                                        <input type="number" className="premium-compact-input" placeholder="0" value={rateCardFormData.extraKmRate} onChange={(e) => setRateCardFormData({ ...rateCardFormData, extraKmRate: e.target.value })} />
                                                    </div>
                                                    <div className="input-group">
                                                        <label className="label-text">Extra Rate / Hr (₹)</label>
                                                        <input type="number" className="premium-compact-input" placeholder="0" value={rateCardFormData.extraHourRate} onChange={(e) => setRateCardFormData({ ...rateCardFormData, extraHourRate: e.target.value })} />
                                                    </div>
                                                    <div className="input-group">
                                                        <label className="label-text">Driver Allowance (₹)</label>
                                                        <input type="number" className="premium-compact-input" placeholder="0" value={rateCardFormData.driverAllowance} onChange={(e) => setRateCardFormData({ ...rateCardFormData, driverAllowance: e.target.value })} />
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <div className="input-group" style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', fontSize: '12px', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' }}></div>
                                                Select Vehicle Categories *
                                            </label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                                                {Array.from(new Set([...Object.keys(VEHICLE_SUB_CATEGORIES), ...Object.keys(selectedEventForRates?.customVehicles || {})])).map(type => {
                                                    const hardcoded = VEHICLE_SUB_CATEGORIES[type] || [];
                                                    const custom = (selectedEventForRates?.customVehicles && selectedEventForRates.customVehicles[type]) || [];
                                                    const subCategories = [...hardcoded, ...custom];
                                                    
                                                    const isMainChecked = subCategories.length > 0 && subCategories.every(sub => selectedSubTypes.includes(type + "|" + sub));

                                                    return (
                                                        <div key={type} style={{ 
                                                            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.6))', 
                                                            borderRadius: '20px', 
                                                            border: '1px solid rgba(255,255,255,0.08)',
                                                            overflow: 'hidden',
                                                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                                                            transition: 'transform 0.3s'
                                                        }}>
                                                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                    <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.1)', color: 'var(--primary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                                        <Car size={18} />
                                                                    </div>
                                                                    <span style={{ color: 'white', fontSize: '15px', fontWeight: '800', letterSpacing: '0.5px' }}>{type === 'Tempo' ? 'Tempo Traveller' : type}</span>
                                                                </div>
                                                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                                    <input 
                                                                        type="checkbox" 
                                                                        style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                                                                        checked={isMainChecked}
                                                                        onChange={(e) => {
                                                                            let updated = [...selectedSubTypes];
                                                                            if (e.target.checked) {
                                                                                subCategories.forEach(sub => {
                                                                                    const key = type + "|" + sub;
                                                                                    if (!updated.includes(key)) updated.push(key);
                                                                                });
                                                                            } else {
                                                                                subCategories.forEach(sub => {
                                                                                    const key = type + "|" + sub;
                                                                                    updated = updated.filter(k => k !== key);
                                                                                });
                                                                            }
                                                                            setSelectedSubTypes(updated);
                                                                            
                                                                            const newMultiData = { ...multiRateCardsData };
                                                                            updated.forEach(key => {
                                                                                if (!newMultiData[key]) {
                                                                                    newMultiData[key] = { baseRate: '', baseKms: '', baseHours: '', extraKmRate: '', extraHourRate: '', driverAllowance: '' };
                                                                                }
                                                                            });
                                                                            Object.keys(newMultiData).forEach(key => {
                                                                                if (!updated.includes(key)) delete newMultiData[key];
                                                                            });
                                                                            setMultiRateCardsData(newMultiData);
                                                                        }}
                                                                    />
                                                                </label>
                                                            </div>
                                                            
                                                            <div style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                                {subCategories.map(sub => {
                                                                    const key = type + "|" + sub;
                                                                    const isChecked = selectedSubTypes.includes(key);
                                                                    return (
                                                                        <button
                                                                            key={sub}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                let updated = [...selectedSubTypes];
                                                                                if (!isChecked) {
                                                                                    updated.push(key);
                                                                                    setMultiRateCardsData({
                                                                                        ...multiRateCardsData,
                                                                                        [key]: { baseRate: '', baseKms: '', baseHours: '', extraKmRate: '', extraHourRate: '', driverAllowance: '' }
                                                                                    });
                                                                                } else {
                                                                                    updated = updated.filter(k => k !== key);
                                                                                    const newMultiData = { ...multiRateCardsData };
                                                                                    delete newMultiData[key];
                                                                                    setMultiRateCardsData(newMultiData);
                                                                                }
                                                                                setSelectedSubTypes(updated);
                                                                            }}
                                                                            style={{
                                                                                padding: '8px 16px',
                                                                                borderRadius: '100px',
                                                                                fontSize: '12px',
                                                                                fontWeight: '700',
                                                                                border: isChecked ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                                                                                background: isChecked ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255,255,255,0.02)',
                                                                                color: isChecked ? 'var(--primary)' : 'rgba(255,255,255,0.6)',
                                                                                cursor: 'pointer',
                                                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '6px',
                                                                                boxShadow: isChecked ? '0 4px 12px rgba(251, 191, 36, 0.2)' : 'none'
                                                                            }}
                                                                        >
                                                                            {isChecked && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }}></div>}
                                                                            {sub}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    </div>

                                    
                                    </div> {/* Close Step 1 Div */}

                                    <AnimatePresence>
                                        {pricingStep === 2 && (
                                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                                <h3 style={{ color: 'white', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' }}></div>
                                                    Bulk Pricing Configuration
                                                </h3>
                                                <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: 'white', fontSize: '13px' }}>
                                                        <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                            <tr>
                                                                <th style={{ padding: '16px', fontWeight: '800', color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Vehicle Model</th>
                                                                <th style={{ padding: '16px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Base Rate (₹)*</th>
                                                                {!isPDService(rateCardFormData.serviceName) && (
                                                                    <>
                                                                        <th style={{ padding: '16px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Limit KMs</th>
                                                                        <th style={{ padding: '16px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Limit Hrs</th>
                                                                        <th style={{ padding: '16px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Extra /KM (₹)</th>
                                                                        <th style={{ padding: '16px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Extra /Hr (₹)</th>
                                                                        <th style={{ padding: '16px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Driver Allow.</th>
                                                                    </>
                                                                )}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedSubTypes.map((key, index) => {
                                                                const [type, model] = key.split('|');
                                                                const isPD = isPDService(rateCardFormData.serviceName);
                                                                return (
                                                                    <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}>
                                                                        <td style={{ padding: '12px 16px', fontWeight: '700' }}>
                                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                                <span style={{ fontSize: '14px' }}>{model}</span>
                                                                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{type}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td style={{ padding: '12px 16px' }}>
                                                                            <input autoFocus={index === 0} required type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[key]?.baseRate || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [key]: { ...multiRateCardsData[key], baseRate: e.target.value } })} style={{ width: '100%', minWidth: '100px', height: '36px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                                        </td>
                                                                        {!isPD && (
                                                                            <>
                                                                                <td style={{ padding: '12px 16px' }}>
                                                                                    <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[key]?.baseKms || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [key]: { ...multiRateCardsData[key], baseKms: e.target.value } })} style={{ width: '100%', minWidth: '80px', height: '36px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                                                </td>
                                                                                <td style={{ padding: '12px 16px' }}>
                                                                                    <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[key]?.baseHours || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [key]: { ...multiRateCardsData[key], baseHours: e.target.value } })} style={{ width: '100%', minWidth: '80px', height: '36px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                                                </td>
                                                                                <td style={{ padding: '12px 16px' }}>
                                                                                    <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[key]?.extraKmRate || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [key]: { ...multiRateCardsData[key], extraKmRate: e.target.value } })} style={{ width: '100%', minWidth: '90px', height: '36px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                                                </td>
                                                                                <td style={{ padding: '12px 16px' }}>
                                                                                    <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[key]?.extraHourRate || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [key]: { ...multiRateCardsData[key], extraHourRate: e.target.value } })} style={{ width: '100%', minWidth: '90px', height: '36px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                                                </td>
                                                                                <td style={{ padding: '12px 16px' }}>
                                                                                    <input type="number" className="premium-compact-input" placeholder="0" value={multiRateCardsData[key]?.driverAllowance || ''} onChange={(e) => setMultiRateCardsData({ ...multiRateCardsData, [key]: { ...multiRateCardsData[key], driverAllowance: e.target.value } })} style={{ width: '100%', minWidth: '100px', height: '36px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                                                </td>
                                                                            </>
                                                                        )}
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {pricingStep === 1 ? (
                                        <div style={{ marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                                            <button type="button" onClick={() => { setIsRateFormOpen(false); setPricingStep(1); setRateCardFormData({ serviceName: '', vehicleType: '', baseRate: '', baseKms: '', baseHours: '', extraKmRate: '', extraHourRate: '', driverAllowance: '' }); setSelectedSubTypes([]); setMultiRateCardsData({}); }} className="secondary-btn" style={{ height: '48px', padding: '0 24px', background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
                                            <button type="button" onClick={() => {
                                                if (!rateCardFormData.serviceName) { alert('Please enter Service Name'); return; }
                                                if (selectedSubTypes.length === 0) { alert('Please select at least one vehicle category'); return; }
                                                setPricingStep(2);
                                            }} className="primary-btn" style={{ height: '48px', padding: '0 32px', fontSize: '15px' }}>
                                                Next: Configure Pricing <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                                            <button type="button" onClick={() => setPricingStep(1)} className="secondary-btn" style={{ height: '48px', padding: '0 24px', background: 'rgba(255,255,255,0.05)' }}><ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /> Back to Selection</button>
                                            <div style={{ display: 'flex', gap: '15px' }}>
                                                <button type="button" onClick={() => { setIsRateFormOpen(false); setPricingStep(1); setRateCardFormData({ serviceName: '', vehicleType: '', baseRate: '', baseKms: '', baseHours: '', extraKmRate: '', extraHourRate: '', driverAllowance: '' }); setSelectedSubTypes([]); setMultiRateCardsData({}); }} className="secondary-btn" style={{ height: '48px', padding: '0 24px', background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
                                                <button type="submit" className="primary-btn" style={{ height: '48px', padding: '0 32px', fontSize: '15px' }}>
                                                    <Save size={18} /> {rateCardFormData._id ? 'Update Rates' : 'Save All Rates'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
</motion.form>
                            )}
                            </AnimatePresence>

                            <div className="rate-cards-list">
                                {(!selectedEventForRates.rateCard || selectedEventForRates.rateCard.length === 0) ? (
                                    <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)', marginTop: '20px' }}>
                                        <Wallet size={32} style={{ opacity: 0.2, marginBottom: '10px' }} />
                                        <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '14px', fontWeight: '600' }}>No rate cards added yet.<br/>Click "Add New Rate" to begin.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '10px' }}>
                                        {selectedEventForRates.rateCard.map((rate) => (
                                            <div key={rate._id} style={{
                                                background: 'rgba(15, 23, 42, 0.6)', borderRadius: '20px', padding: '20px',
                                                border: '1px solid rgba(255,255,255,0.08)', position: 'relative',
                                                display: 'flex', flexDirection: 'column', gap: '16px',
                                                boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <div style={{ color: '#38bdf8', fontSize: '14px', fontWeight: '900', marginBottom: '4px' }}>{rate.serviceName}</div>
                                                        <div style={{ color: 'white', fontSize: '18px', fontWeight: '900' }}>₹{Number(rate.baseRate).toLocaleString()}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button onClick={() => { setRateCardFormData(rate); setIsRateFormOpen(true); setPricingStep(1); }} style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit size={14} /></button>
                                                        <button onClick={() => handleDeleteRateCard(rate._id)} style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(244,63,94,0.1)', border: 'none', color: '#f43f5e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '10px' }}>
                                                    <Car size={16} color="rgba(255,255,255,0.4)" />
                                                    <div>
                                                        <div style={{ color: 'white', fontSize: '12px', fontWeight: '800' }}>{rate.vehicleModel || 'Any Model'}</div>
                                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '700' }}>{rate.vehicleType || 'Any Category'}</div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '12px' }}>
                                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: '800', marginBottom: '4px' }}>LIMITS</div>
                                                        <div style={{ color: 'white', fontSize: '11px', fontWeight: '700' }}>{rate.baseKms ? rate.baseKms + " KM" : '--'} / {rate.baseHours ? rate.baseHours + " Hr" : '--'}</div>
                                                    </div>
                                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '12px' }}>
                                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: '800', marginBottom: '4px' }}>EXTRA CHARGES</div>
                                                        <div style={{ color: '#f59e0b', fontSize: '11px', fontWeight: '700' }}>{rate.extraKmRate ? "₹" + rate.extraKmRate + "/KM" : '--'}</div>
                                                        <div style={{ color: '#f59e0b', fontSize: '11px', fontWeight: '700' }}>{rate.extraHourRate ? "₹" + rate.extraHourRate + "/Hr" : '--'}</div>
                                                    </div>
                                                    {Number(rate.driverAllowance) > 0 && (
                                                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '12px', gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ color: '#10b981', fontSize: '10px', fontWeight: '800' }}>DRIVER ALLOWANCE</div>
                                                        <div style={{ color: '#10b981', fontSize: '12px', fontWeight: '900' }}>₹{rate.driverAllowance}</div>
                                                    </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ ADD CUSTOM VEHICLE MODAL (PREMIUM UI) ═══ */}
            <AnimatePresence>
                {showAddCustomVehicleModal && (
                    <div key="custom-vehicle-modal" className="modal-overlay" style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(12px)', zIndex: 99999 }} onClick={() => setShowAddCustomVehicleModal(false)}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                            className="premium-modal-content"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '24px', padding: '32px', width: '90%', maxWidth: '420px',
                                boxShadow: '0 25px 50px rgba(0,0,0,0.5)', position: 'relative'
                            }}
                        >
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div className="premium-icon-bg" style={{ width: '44px', height: '44px' }}>
                                        <PlusCircle size={24} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, color: 'white', fontSize: '20px', fontWeight: '900', letterSpacing: '-0.5px' }}>Add Custom Vehicle</h3>
                                        <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Specific to {selectedEventForRates?.name || 'this event'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowAddCustomVehicleModal(false)} style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Form Fields */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div className="input-group">
                                    <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vehicle Category *</label>
                                    <div style={{ position: 'relative' }}>
                                        <select 
                                            value={isAddingNewCategory ? 'NEW_CATEGORY' : customVehicleCategory} 
                                            onChange={(e) => {
                                                if (e.target.value === 'NEW_CATEGORY') {
                                                    setIsAddingNewCategory(true);
                                                    setCustomVehicleCategory('');
                                                } else {
                                                    setIsAddingNewCategory(false);
                                                    setCustomVehicleCategory(e.target.value);
                                                }
                                            }}
                                            style={{ width: '100%', appearance: 'none', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontSize: '15px', fontWeight: '500', outline: 'none', transition: 'all 0.3s' }}
                                        >
                                            <option value="" style={{ background: '#0f172a' }}>-- Select Category --</option>
                                            {Array.from(new Set([...Object.keys(VEHICLE_SUB_CATEGORIES), ...Object.keys(selectedEventForRates?.customVehicles || {})])).map(type => (
                                                <option key={type} value={type} style={{ background: '#0f172a' }}>{type === 'Tempo' ? 'Tempo Traveller' : type}</option>
                                            ))}
                                            <option value="NEW_CATEGORY" style={{ background: '#10b981', color: 'white', fontWeight: 'bold' }}>+ Add New Category</option>
                                        </select>
                                        
                                        {isAddingNewCategory && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: '12px' }}>
                                                <input 
                                                    type="text" 
                                                    placeholder="Type New Category (e.g. Luxury Cars)" 
                                                    value={newCustomCategoryName}
                                                    onChange={(e) => setNewCustomCategoryName(e.target.value)}
                                                    style={{ width: '100%', padding: '14px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '12px', color: 'white', fontSize: '15px', outline: 'none', transition: 'all 0.3s' }}
                                                />
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vehicle Name (Model) *</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Mini Bus 20 Seater" 
                                        value={customVehicleName} 
                                        onChange={(e) => setCustomVehicleName(e.target.value)}
                                        style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontSize: '15px', outline: 'none', transition: 'all 0.3s' }}
                                    />
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                    <button onClick={() => { setIsAddingNewCategory(false); setNewCustomCategoryName(''); setShowAddCustomVehicleModal(false); }} style={{ flex: 1, height: '48px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={async () => {
                                            
                                            const finalCategory = isAddingNewCategory ? newCustomCategoryName.trim() : customVehicleCategory;
                                            if (!finalCategory || !customVehicleName.trim()) {
                                                alert("Please fill both category and vehicle name.");
                                                return;
                                            }
                                            
                                            const val = customVehicleName.trim();
                                            const currentCustoms = selectedEventForRates?.customVehicles || {};
                                            const hardcoded = VEHICLE_SUB_CATEGORIES[finalCategory] || [];
                                            const custom = currentCustoms[finalCategory] || [];
                                            
                                            if (hardcoded.includes(val) || custom.includes(val)) {
                                                alert("Vehicle already exists in this category.");
                                                return;
                                            }

                                            // Prepare new mapping
                                            const newCustoms = {
                                                ...currentCustoms,
                                                [finalCategory]: [...custom, val]
                                            };
                                            
                                            // Make API call to save persistently
                                            try {
                                                const res = await axios.put(`/api/admin/events/${selectedEventForRates._id}`, {
                                                    customVehicles: newCustoms
                                                }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                                                
                                                alert("Saved permanently to this event!");
                                                
                                                // Update local state and event object
                                                const updatedEvent = res.data;
                                                
                                                let visualStatus = updatedEvent.status || 'Upcoming';
                                                if (visualStatus === 'Upcoming' && toISTDateString(new Date(updatedEvent.date)) <= todayIST) {
                                                    visualStatus = 'Running';
                                                }
                                                const finalUpdatedEvent = { ...updatedEvent, visualStatus };

                                                setSelectedEventForRates(finalUpdatedEvent);
                                                
                                                // Also update it in the main events list
                                                setEvents(prev => prev.map(ev => ev._id === finalUpdatedEvent._id ? finalUpdatedEvent : ev));
                                                setAllMasterEvents(prev => prev.map(ev => ev._id === finalUpdatedEvent._id ? finalUpdatedEvent : ev));
                                                
                                                setCustomVehicleName('');
                                                setCustomVehicleCategory('');
                                                setIsAddingNewCategory(false);
                                                setNewCustomCategoryName('');
                                                setShowAddCustomVehicleModal(false);
                                            } catch (err) {
                                                console.error("Error saving custom vehicle:", err);
                                                alert("Failed to save custom vehicle.");
                                            }
                                        }}
                                        style={{ flex: 1, height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary) 0%, #d97706 100%)', border: 'none', color: '#1e293b', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)', transition: 'all 0.3s' }}
                                    >
                                        Save Vehicle
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ PDF EXPORT CUSTOMIZER MODAL ═══ */}
            <AnimatePresence>
                {showPDFCustomizerModal && selectedEventForRates && (
                    <div key="pdf-customizer-modal" className="modal-overlay" style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', zIndex: 99999 }} onClick={() => setShowPDFCustomizerModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="premium-scroll"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '24px', padding: '30px', width: '95%', maxWidth: '1200px',
                                maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', position: 'relative'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '15px' }}>
                                <div>
                                    <h2 style={{ color: 'white', fontSize: '24px', fontWeight: '900', margin: 0 }}>Customize PDF Export</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '4px 0 0 0' }}>Configure columns (Vehicle Categories) and rows (Services) before exporting to PDF.</p>
                                </div>
                                <button onClick={() => setShowPDFCustomizerModal(false)} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '30px', alignItems: 'start' }}>
                                
                                {/* LEFT SIDE PANEL - CONFIGURATION */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    
                                    {/* 1. Add Category Column */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <h3 style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: '900', margin: '0 0 5px 0' }}>Add Vehicle Column</h3>
                                        <select 
                                            className="premium-compact-input" 
                                            value={newColCategory} 
                                            onChange={(e) => setNewColCategory(e.target.value)}
                                        >
                                            <option value="">-- Select Vehicle Category --</option>
                                            {Array.from(new Set([...Object.keys(VEHICLE_SUB_CATEGORIES), ...Object.keys(selectedEventForRates?.customVehicles || {})])).map(type => (
                                                <optgroup key={type} label={type === 'Tempo' ? 'Tempo Traveller' : type}>
                                                    <option value={type + "|" + type}>{type} (Any)</option>
                                                    {[...(VEHICLE_SUB_CATEGORIES[type] || []), ...(selectedEventForRates?.customVehicles?.[type] || [])].map(sub => (
                                                        <option key={sub} value={type + "|" + sub}>{sub}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                        <button 
                                            onClick={() => {
                                                if (!newColCategory) return;
                                                const [type, model] = newColCategory.split('|');
                                                const colName = model;
                                                if (pdfCols.some(c => c.name === colName)) {
                                                    alert('Column already exists!');
                                                    return;
                                                }
                                                const newCol = { name: colName, type, model };
                                                setPdfCols([...pdfCols, newCol]);
                                                // Initialize cells for this new column in all rows
                                                const updatedRows = pdfRows.map(r => ({
                                                    ...r,
                                                    data: { ...r.data, [colName]: '' }
                                                }));
                                                setPdfRows(updatedRows);
                                                setNewColCategory('');
                                            }}
                                            className="primary-btn" 
                                            style={{ height: '40px', fontSize: '12px', padding: '0 15px', justifyContent: 'center' }}
                                        >
                                            Add Column
                                        </button>
                                    </div>

                                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '5px 0' }} />

                                    {/* 2. Add Service Row */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <h3 style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: '900', margin: '0 0 5px 0' }}>Add Service Row</h3>
                                        <select 
                                            className="premium-compact-input" 
                                            value={newRowService} 
                                            onChange={(e) => setNewRowService(e.target.value)}
                                        >
                                            <option value="">-- Select Service --</option>
                                            <option value="Airport Pickup & Drop">Airport Pickup & Drop</option>
                                            <option value="Railway Station Pickup & Drop">Railway Station Pickup & Drop</option>
                                            <option value="Bus Stand Pickup & Drop">Bus Stand Pickup & Drop</option>
                                            <option value="Local 8Hr/80Km">Local 8Hr/80Km</option>
                                            <option value="Local 12Hr/120Km">Local 12Hr/120Km</option>
                                            <option value="Outstation">Outstation</option>
                                            <option value="Extra KM Rate">Extra KM Rate</option>
                                            <option value="Extra Hour Rate">Extra Hour Rate</option>
                                            <option value="Driver Allowance">Driver Allowance</option>
                                            <option value="CUSTOM">Custom Particular...</option>
                                        </select>
                                        
                                        {newRowService === 'CUSTOM' && (
                                            <input 
                                                type="text" 
                                                className="premium-compact-input" 
                                                placeholder="Enter Custom Service Name" 
                                                value={customServiceText} 
                                                onChange={(e) => setCustomServiceText(e.target.value)} 
                                            />
                                        )}

                                        <button 
                                            onClick={() => {
                                                const sName = newRowService === 'CUSTOM' ? customServiceText.trim() : newRowService;
                                                if (!sName) return;
                                                if (pdfRows.some(r => r.data.serviceName.toLowerCase() === sName.toLowerCase())) {
                                                    alert('Row already exists!');
                                                    return;
                                                }
                                                const rowData = { serviceName: sName };
                                                pdfCols.forEach(c => {
                                                    rowData[c.name] = '';
                                                });
                                                
                                                let rowType = 'service';
                                                if (sName === 'Extra KM Rate') rowType = 'extraKm';
                                                else if (sName === 'Extra Hour Rate') rowType = 'extraHr';
                                                else if (sName === 'Driver Allowance') rowType = 'allowance';

                                                setPdfRows([...pdfRows, { type: rowType, data: rowData }]);
                                                setNewRowService('');
                                                setCustomServiceText('');
                                            }}
                                            className="primary-btn" 
                                            style={{ height: '40px', fontSize: '12px', padding: '0 15px', justifyContent: 'center' }}
                                        >
                                            Add Row
                                        </button>
                                    </div>

                                    <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: "5px 0" }} />

                                    {/* 3. Manage Terms & Conditions */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <h3 style={{ color: "var(--primary)", fontSize: "14px", fontWeight: "900", margin: "0 0 5px 0" }}>Terms & Conditions</h3>
                                        
                                        <div style={{ maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "5px", paddingRight: "5px" }}>
                                            {savedPdfTermsList && savedPdfTermsList.map((term, index) => (
                                                <label key={index} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "11px", color: "rgba(255,255,255,0.8)", cursor: "pointer", lineHeight: "1.3" }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={pdfTerms && pdfTerms.includes(term)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setPdfTerms([...(pdfTerms || []), term]);
                                                            } else {
                                                                setPdfTerms((pdfTerms || []).filter(t => t !== term));
                                                            }
                                                        }}
                                                        style={{ marginTop: "2px", accentColor: "var(--primary)" }}
                                                    />
                                                    <span>{term}</span>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            const newList = savedPdfTermsList.filter(t => t !== term);
                                                            setSavedPdfTermsList(newList);
                                                            setPdfTerms((pdfTerms || []).filter(t => t !== term));
                                                            localStorage.setItem("fleetCrmPdfTerms", JSON.stringify(newList));
                                                        }}
                                                        style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "0 2px", marginLeft: "auto" }}
                                                        title="Delete Term"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </label>
                                            ))}
                                        </div>

                                        <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
                                            <input 
                                                type="text" 
                                                className="premium-compact-input" 
                                                placeholder="Type new term..." 
                                                value={newTermText || ""} 
                                                onChange={(e) => setNewTermText(e.target.value)} 
                                                style={{ flex: 1 }}
                                            />
                                            <button 
                                                onClick={() => {
                                                    const trimmed = (newTermText || "").trim();
                                                    if (!trimmed) return;
                                                    if (savedPdfTermsList && savedPdfTermsList.includes(trimmed)) {
                                                        alert("Term already exists!");
                                                        return;
                                                    }
                                                    const newList = [...(savedPdfTermsList || []), trimmed];
                                                    setSavedPdfTermsList(newList);
                                                    setPdfTerms([...(pdfTerms || []), trimmed]);
                                                    localStorage.setItem("fleetCrmPdfTerms", JSON.stringify(newList));
                                                    setNewTermText("");
                                                }}
                                                className="primary-btn" 
                                                style={{ height: "40px", fontSize: "12px", padding: "0 10px", justifyContent: "center", minWidth: "60px" }}
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>

                                </div>

                                {/* RIGHT SIDE - LIVE PREVIEW & EDITING */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ color: 'white', fontSize: '16px', fontWeight: '800', margin: 0 }}>Table Preview (Click cell values to edit)</h3>
                                        <button 
                                            onClick={() => {
                                                handleOpenPDFCustomizer();
                                            }} 
                                            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                        >
                                            Reset Table
                                        </button>
                                    </div>

                                    <div className="premium-scroll" style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', background: 'rgba(10, 16, 30, 0.4)' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ background: 'rgba(255,255,255,0.02)', color: 'white', borderBottom: '2px solid rgba(255,255,255,0.1)', padding: '12px', fontWeight: '800' }}>S.No.</th>
                                                    <th style={{ background: 'rgba(255,255,255,0.02)', color: 'white', borderBottom: '2px solid rgba(255,255,255,0.1)', padding: '12px', fontWeight: '800', textAlign: 'left' }}>Particulars / Services</th>
                                                    {pdfCols.map((col, idx) => (
                                                        <th key={idx} style={{ background: 'rgba(255,255,255,0.02)', color: 'white', borderBottom: '2px solid rgba(255,255,255,0.1)', padding: '12px', fontWeight: '800', minWidth: '120px', position: 'relative' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                <span style={{ fontSize: '13px' }}>{col.name}</span>
                                                                <span style={{ fontSize: '9px', opacity: 0.4 }}>{col.type}</span>
                                                            </div>
                                                            <button 
                                                                onClick={() => {
                                                                    if (pdfCols.length <= 1) {
                                                                        alert('Must keep at least one column!');
                                                                        return;
                                                                    }
                                                                    setPdfCols(pdfCols.filter(c => c.name !== col.name));
                                                                    const updatedRows = pdfRows.map(r => {
                                                                        const newData = { ...r.data };
                                                                        delete newData[col.name];
                                                                        return { ...r, data: newData };
                                                                    });
                                                                    setPdfRows(updatedRows);
                                                                }}
                                                                style={{ position: 'absolute', top: '2px', right: '2px', background: 'transparent', border: 'none', color: '#f43f5e', opacity: 0.5, cursor: 'pointer' }}
                                                                title="Delete Column"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </th>
                                                    ))}
                                                    <th style={{ width: '40px' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pdfRows.map((row, rIdx) => {
                                                    const isExtra = row.type !== 'service';
                                                    return (
                                                        <tr key={rIdx} style={{ background: isExtra ? 'rgba(251, 191, 36, 0.03)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <td style={{ padding: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>{isExtra ? '*' : rIdx + 1}</td>
                                                            <td style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: isExtra ? 'var(--primary)' : 'white' }}>{row.data.serviceName}</td>
                                                            {pdfCols.map((col, cIdx) => (
                                                                <td key={cIdx} style={{ padding: '8px' }}>
                                                                    <input 
                                                                        type="text" 
                                                                        value={row.data[col.name] !== undefined ? row.data[col.name] : ''}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            const updatedRows = [...pdfRows];
                                                                            updatedRows[rIdx].data[col.name] = val;
                                                                            setPdfRows(updatedRows);
                                                                        }}
                                                                        style={{
                                                                            width: '100%',
                                                                            height: '36px',
                                                                            background: 'rgba(0,0,0,0.3)',
                                                                            border: '1px solid rgba(255,255,255,0.08)',
                                                                            borderRadius: '8px',
                                                                            color: '#10b981',
                                                                            fontWeight: 'bold',
                                                                            textAlign: 'center',
                                                                            outline: 'none'
                                                                        }}
                                                                        placeholder="-"
                                                                    />
                                                                </td>
                                                            ))}
                                                            <td style={{ padding: '8px' }}>
                                                                <button 
                                                                    onClick={() => {
                                                                        setPdfRows(pdfRows.filter((_, idx) => idx !== rIdx));
                                                                    }}
                                                                    style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', opacity: 0.7 }}
                                                                    title="Delete Row"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                                        <button onClick={() => setShowPDFCustomizerModal(false)} className="secondary-btn" style={{ height: '44px' }}>Cancel</button>
                                        <button 
                                            onClick={async () => {
                                                await generateCustomPDFExport(pdfCols, pdfRows);
                                                setShowPDFCustomizerModal(false);
                                            }} 
                                            className="primary-btn" 
                                            style={{ height: '44px' }}
                                        >
                                            <Download size={16} /> Generate & Download PDF
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .premium-icon-bg { width: clamp(40px,10vw,50px); height: clamp(40px,10vw,50px); background: linear-gradient(135deg, white, #f8fafc); border-radius: 16px; display: flex; justify-content: center; align-items: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); padding: 8px; }
                .pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); box-shadow: 0 0 8px var(--primary); animation: pulse 2s infinite; }
                .label-text { font-size: clamp(9px,2.5vw,10px); font-weight: 800; color: rgba(255,255,255,0.5); letter-spacing: 1px; text-transform: uppercase; }
                .main-title { color: white; font-size: clamp(24px, 5vw, 32px); font-weight: 900; margin: 0; letter-spacing: -1px; }
                .text-gradient-yellow { background: linear-gradient(135deg, var(--primary) 0%, #d97706 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .subtitle-text { margin-top: 4px; font-size: 13px; color: rgba(255,255,255,0.6); margin: 0; }
                .flex-resp { display: flex; flex-wrap: wrap; gap: 16px; }
                .stat-card { padding: 12px 20px; min-width: 150px; display: flex; flex-direction: column; position: relative; overflow: hidden; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); }
                .stat-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
                .stat-value { color: white; font-size: 20px; font-weight: 900; }
                .stat-unit { color: rgba(255,255,255,0.4); font-size: 11px; font-weight: 700; margin-left: 4px; }
                
                .filter-container { display: flex; flex-wrap: wrap; gap: 12px; padding: 20px; align-items: center; background: rgba(15, 23, 42, 0.4) !important; margin-bottom: 20px; }
                .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.3); }
                .search-input { width: 100%; height: 50px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding-left: 45px; color: white; outline: none; transition: 0.3s; }
                .search-input:focus { border-color: var(--primary); background: rgba(0,0,0,0.3); }
                .select-field { flex: 1 1 140px; height: 50px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; color: white; padding: 0 15px; outline: none; cursor: pointer; }
                .select-field option { background: #1e293b; color: white; }
                
                .calendar-controls { display: flex; align-items: center; gap: 5px; background: rgba(0,0,0,0.25); padding: 4px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); }
                .shift-btn { width: 36px; height: 36px; border-radius: 12px; background: rgba(255,255,255,0.03); border: none; color: rgba(255,255,255,0.6); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
                .shift-btn:hover { background: rgba(255,255,255,0.08); color: white; }
                .date-inputs { display: flex; gap: 5px; }
                .date-chip { padding: 0 15px; height: 36px; display: flex; align-items: center; gap: 8px; cursor: pointer; border-radius: 10px; position: relative; overflow: hidden; border: 1px solid transparent; }
                .date-chip.from { background: rgba(99, 102, 241, 0.1); border-color: rgba(99, 102, 241, 0.2); }
                .date-chip.to { background: rgba(251, 191, 36, 0.1); border-color: rgba(251, 191, 36, 0.2); }
                .date-chip span { font-size: 9px; font-weight: 900; opacity: 0.6; }
                .date-chip b { font-size: 11px; font-weight: 800; color: white; }
                .date-chip input { position: absolute; opacity: 0; inset: 0; cursor: pointer; }
                
                .toggle-btn-plus { width: 36px; height: 36px; border-radius: 10px; border: none; cursor: pointer; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); display: flex; align-items: center; justify-content: center; transition: 0.3s; }
                .toggle-btn-plus.active { background: var(--primary); color: black; }
                
                .action-buttons-row { display: flex; justify-content: space-between; align-items: center; gap: 15px; margin-top: 15px; flex-wrap: wrap; }
                .primary-btn { display: flex; align-items: center; gap: 10px; height: 52px; padding: 0 25px; border-radius: 14px; background: linear-gradient(135deg, var(--primary) 0%, #d97706 100%); color: black; font-weight: 800; border: none; cursor: pointer; box-shadow: 0 8px 15px rgba(251,191,36,0.2); transition: 0.2s; }
                .primary-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
                .secondary-btn { display: flex; align-items: center; gap: 8px; height: 52px; padding: 0 20px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: white; font-weight: 700; border-radius: 12px; cursor: pointer; transition: 0.2s; }
                .secondary-btn:hover { background: rgba(255,255,255,0.08); }
                .target-input-inline { width: 60px; background: transparent; border: none; border-bottom: 2px solid rgba(251,191,36,0.5); color: var(--primary); font-weight: 900; font-size: 16px; outline: none; text-align: center; }

                /* ===== TABLE ===== */
                .main-table-container { padding: 0; border: 1px solid rgba(255,255,255,0.06); background: rgba(10, 16, 30, 0.6) !important; overflow: hidden; border-radius: 20px; }
                table { width: 100%; border-collapse: separate; border-spacing: 0; }
                th { padding: 16px 20px; text-align: left; background: rgba(255,255,255,0.025); color: rgba(255,255,255,0.35); font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid rgba(255,255,255,0.05); white-space: nowrap; }
                .table-row-hover:hover { background: rgba(255,255,255,0.03) !important; }
                .table-row-hover td { padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: middle; }
                .table-row-hover:last-child td { border-bottom: none; }
                
                .action-btn-hover:hover { background: rgba(56,189,248,0.15) !important; color: #38bdf8 !important; border-color: rgba(56,189,248,0.3) !important; transform: scale(1.05); }
                .action-btn-hover-del:hover { background: rgba(244,63,94,0.15) !important; color: #f43f5e !important; border-color: rgba(244,63,94,0.3) !important; transform: scale(1.05); }

                /* ===== BADGES ===== */
                .badge-fleet { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; font-size: 9px; font-weight: 900; letter-spacing: 0.5px; background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
                .badge-ext { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; font-size: 9px; font-weight: 900; letter-spacing: 0.5px; background: rgba(245,158,11,0.15); color: var(--primary); border: 1px solid rgba(245,158,11,0.3); }
                .badge-duty { display: inline-block; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; background: rgba(251,191,36,0.12); color: var(--primary); border: 1px solid rgba(251,191,36,0.25); white-space: nowrap; }
                .badge-time { display: inline-block; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; background: rgba(56,189,248,0.12); color: #38bdf8; border: 1px solid rgba(56,189,248,0.25); white-space: nowrap; }
                
                .amount-badge { display: inline-block; padding: 6px 14px; background: rgba(16,185,129,0.1); color: #10b981; font-weight: 900; font-size: 14px; border-radius: 10px; border: 1px solid rgba(16,185,129,0.2); }

                /* ===== MODAL BASE (GLOBAL OVERLAYS) ===== */
                .modal-overlay { 
                    position: fixed; inset: 0; 
                    background: rgba(0,0,0,0.85); 
                    backdrop-filter: blur(14px); 
                    z-index: 2000; 
                    display: flex; justify-content: center; align-items: center; 
                    padding: clamp(10px, 3vw, 20px); 
                }
                @media (min-width: 1024px) {
                    .modal-overlay { padding-left: calc(280px + clamp(10px, 3vw, 20px)); }
                }

                .event-row-hover:hover { 
                    transform: translateX(8px); 
                    background: rgba(15, 23, 42, 0.6) !important;
                    border-color: rgba(251,191,36,0.2) !important;
                    box-shadow: 0 15px 40px rgba(0,0,0,0.4) !important;
                }
                .action-btn-list:hover { 
                    transform: scale(1.1); 
                    filter: brightness(1.2);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                }

                .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .form-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
                @media (max-width: 600px) { 
                    .form-grid-2, .form-grid-3 { grid-template-columns: 1fr; } 
                }
                
                .premium-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
                .premium-scroll::-webkit-scrollbar-track { background: transparent; }
                .premium-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .premium-scroll::-webkit-scrollbar-thumb:hover { background: var(--primary); }

                @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
                
                @media (max-width: 1024px) {
                    .stats-grid { max-width: 100% !important; grid-template-columns: repeat(2, 1fr) !important; }
                }

                @media (max-width: 768px) { 
                    .flex-resp { flex-direction: column; }
                    .header-top { flex-direction: column !important; align-items: flex-start !important; gap: 20px !important; }
                    .stats-grid { grid-template-columns: repeat(2, 1fr) !important; width: 100% !important; }
                    .status-nav { flex-wrap: wrap !important; }
                    .status-nav button { flex: 1 1 45% !important; padding: 12px !important; }
                    .command-bar { flex-direction: column !important; }
                    .command-bar > div { width: 100% !important; min-width: 100% !important; }
                    .event-row { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; padding: 20px !important; }
                    .event-row > div { width: 100% !important; border: none !important; padding: 0 !important; text-align: left !important; }
                    .event-row .resource-matrix { justify-content: flex-start !important; gap: 40px !important; }
                    .event-row .actions-block { justify-content: flex-end !important; }
                    .hide-mobile { display: none !important; }
                    .show-mobile { display: block !important; }
                }

                @media (max-width: 480px) {
                    .stats-grid { grid-template-columns: 1fr !important; }
                    .status-nav button { flex: 1 1 100% !important; }
                    .event-row .resource-matrix { gap: 20px !important; }
                }
            `}</style>
        </div>
    );
};

export default EventManagement;

