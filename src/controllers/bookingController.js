const Booking = require('../models/Booking');
const DRSDuty = require('../models/DRSDuty');
const Client = require('../models/Client');
const LedgerEntry = require('../models/LedgerEntry');
const BankAccount = require('../models/BankAccount');
const BankTransaction = require('../models/BankTransaction');
const CashTransaction = require('../models/CashTransaction');
const Company = require('../models/Company');
const Vehicle = require('../models/Vehicle');
const Lead = require('../models/Lead');
const { syncInvoiceForBooking } = require('./invoiceController');
const asyncHandler = require('express-async-handler');

// Throttle map so Booking.updateMany runs at most once every 5 minutes per company in the background
const LAST_BOOKING_AUTO_SYNC = new Map();
const BOOKING_SYNC_INTERVAL_MS = 5 * 60 * 1000;

// @desc    Get all bookings for a company with filters
// @route   GET /api/bookings/:companyId
// @access  Private/AdminOrExecutive
const getBookings = asyncHandler(async (req, res) => {
    const { status, paymentStatus, search, startDate, endDate } = req.query;
    const companyId = req.params.companyId;
    let query = { company: companyId };

    if (status && status !== 'All') {
        if (status === 'Completed') {
            query.bookingStatus = { $in: ['Completed', 'Invoiced'] };
            if (!startDate && !endDate) {
                const todayEnd = new Date();
                todayEnd.setHours(23, 59, 59, 999);
                query.travelStartDate = { $lte: todayEnd };
            }
        } else {
            query.bookingStatus = status;
        }
    }

    if (paymentStatus && paymentStatus !== 'All') {
        query.paymentStatus = paymentStatus;
    }

    if (startDate && endDate) {
        query.travelStartDate = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    if (search) {
        query.$or = [
            { bookingId: { $regex: search, $options: 'i' } },
            { clientName: { $regex: search, $options: 'i' } },
            { mobileNumber: { $regex: search, $options: 'i' } },
            { vehicleType: { $regex: search, $options: 'i' } }
        ];
    }

    // Auto-complete past confirmed/ongoing/scheduled/invoiced bookings whose tour end date has already passed
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastSync = LAST_BOOKING_AUTO_SYNC.get(String(companyId)) || 0;
    if (Date.now() - lastSync > BOOKING_SYNC_INTERVAL_MS) {
        LAST_BOOKING_AUTO_SYNC.set(String(companyId), Date.now());
        Booking.updateMany(
            {
                company: companyId,
                bookingStatus: { $in: ['Confirmed', 'Ongoing', 'Scheduled', 'Invoiced'] },
                $or: [
                    { travelEndDate: { $lt: today } },
                    { travelEndDate: null, travelStartDate: { $lt: today } },
                    { travelEndDate: { $exists: false }, travelStartDate: { $lt: today } }
                ]
            },
            {
                $set: { bookingStatus: 'Completed' }
            }
        ).catch(autoCompErr => {
            console.error('Error auto-completing finished bookings:', autoCompErr);
        });
    }

    const bookings = await Booking.find(query)
        .populate('lead', 'leadId status totalAmount remarksHistory specialRemarks')
        .populate('client', 'name mobile balance')
        .populate({
            path: 'drsDuties',
            populate: [
                { path: 'driver', select: 'name mobile phone' },
                { path: 'vehicle', select: 'carNumber model type' }
            ]
        })
        .sort({ createdAt: -1 })
        .lean();

    const activeStatuses = new Set(['Confirmed', 'Ongoing', 'Scheduled', 'Invoiced']);
    const sanitizedBookings = bookings.map(bObj => {
        if (activeStatuses.has(bObj.bookingStatus)) {
            const endOrStart = bObj.travelEndDate ? new Date(bObj.travelEndDate) : (bObj.travelStartDate ? new Date(bObj.travelStartDate) : null);
            if (endOrStart && endOrStart < today) {
                bObj.bookingStatus = 'Completed';
            }
        }
        const fuelDed = (bObj.guestFuelFilled || Number(bObj.guestFuelAmount) > 0) ? (Number(bObj.guestFuelAmount) || 0) : 0;
        if (fuelDed > 0) {
            bObj.balanceDue = Math.max(0, (Number(bObj.totalAmount) || 0) - (Number(bObj.advancePaid) || 0) - fuelDed);
        }
        return bObj;
    });

    res.json(sanitizedBookings);
});

// @desc    Get single booking by ID
// @route   GET /api/bookings/single/:id
// @access  Private/AdminOrExecutive
const getBookingById = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id)
        .populate('company')
        .populate('lead')
        .populate('client')
        .populate({
            path: 'drsDuties',
            populate: [
                { path: 'driver', select: 'name phone' },
                { path: 'vehicle', select: 'carNumber model' }
            ]
        })
        .lean();

    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    res.json(booking);
});


// @desc    Update a booking (cars, days, prices, itinerary)
// @route   PUT /api/bookings/single/:id
// @access  Private/AdminOrExecutive
const updateBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    const { 
        bookingStatus, paymentStatus, notes, termsAndConditions,
        vehicleType, numberOfCars, totalAmount, travelStartDate, travelEndDate,
        isBreakTour, excludedDates, activeDaysCount,
        pickupLocation, dropLocation, pickupPoint, dropPoint, itinerary, adminOverride, advancePaid,
        guestFuelFilled, guestFuelAmount,
        clientName, mobileNumber, alternateMobile, email, gstin,
        source, salesPerson, bookingReference, travelAgent, travelAgentName, travelAgentMobile,
        vehicleMatrix, gstMode, gstRate, specialRemarks
    } = req.body;

    const oldClientName = booking.clientName;
    const oldMobile = booking.mobileNumber;
    const oldTotalAmount = booking.totalAmount;

    if (bookingStatus) booking.bookingStatus = bookingStatus;
    if (paymentStatus) booking.paymentStatus = paymentStatus;
    if (notes !== undefined) booking.notes = notes;
    if (specialRemarks !== undefined) booking.specialRemarks = specialRemarks;
    if (termsAndConditions) booking.termsAndConditions = termsAndConditions;
    
    // Core edit fields
    if (vehicleType) booking.vehicleType = vehicleType;
    if (numberOfCars !== undefined) booking.numberOfCars = Number(numberOfCars);
    if (totalAmount !== undefined) {
        booking.totalAmount = Number(totalAmount);
        booking.packagePrice = Number(totalAmount);
    } else if (req.body.packagePrice !== undefined) {
        booking.totalAmount = Number(req.body.packagePrice);
        booking.packagePrice = Number(req.body.packagePrice);
    }
    if (travelStartDate) booking.travelStartDate = new Date(travelStartDate);
    if (travelEndDate) booking.travelEndDate = new Date(travelEndDate);
    if (isBreakTour !== undefined) booking.isBreakTour = Boolean(isBreakTour);
    if (excludedDates !== undefined) booking.excludedDates = Array.isArray(excludedDates) ? excludedDates : [];
    if (activeDaysCount !== undefined) booking.activeDaysCount = Number(activeDaysCount) || 0;
    if (pickupLocation !== undefined) booking.pickupLocation = pickupLocation;
    if (dropLocation !== undefined) booking.dropLocation = dropLocation;
    if (pickupPoint !== undefined) booking.pickupPoint = pickupPoint;
    if (dropPoint !== undefined) booking.dropPoint = dropPoint;
    if (gstMode !== undefined) booking.gstMode = gstMode;
    if (gstRate !== undefined) booking.gstRate = Number(gstRate);
    
    // Client Info fields
    if (clientName !== undefined) booking.clientName = clientName;
    if (mobileNumber !== undefined) booking.mobileNumber = mobileNumber;
    if (alternateMobile !== undefined) booking.alternateMobile = alternateMobile;
    if (email !== undefined) booking.email = email;
    if (gstin !== undefined) booking.gstin = gstin;
    if (req.body.bankName !== undefined) booking.bankName = req.body.bankName;
    if (req.body.advanceDate) booking.advanceDate = new Date(req.body.advanceDate);
    if (req.body.advanceBankAccountId || req.body.advanceDate) {
        try {
            const BankTransaction = require('../models/BankTransaction');
            const BankAccount = require('../models/BankAccount');
            const advTx = await BankTransaction.findOne({
                bookingRef: booking._id,
                description: { $regex: /^Advance/i }
            }).sort({ date: 1 });
            if (advTx) {
                const oldAcc = advTx.bankAccount ? String(advTx.bankAccount) : '';
                const newAcc = req.body.advanceBankAccountId ? String(req.body.advanceBankAccountId) : oldAcc;
                if (req.body.advanceDate) advTx.date = new Date(req.body.advanceDate);
                if (newAcc && newAcc !== oldAcc) {
                    advTx.bankAccount = newAcc;
                    if (req.body.bankName) advTx.bankName = req.body.bankName;
                    const amt = Number(advTx.amount) || 0;
                    if (oldAcc) await BankAccount.findByIdAndUpdate(oldAcc, { $inc: { currentBalance: -amt } });
                    await BankAccount.findByIdAndUpdate(newAcc, { $inc: { currentBalance: amt } });
                }
                await advTx.save();
            }
        } catch (advTxErr) {
            console.error('Error moving advance bank transaction:', advTxErr);
        }
    }

    // Sales Info fields
    if (source !== undefined) booking.source = source;
    if (salesPerson !== undefined) booking.salesPerson = salesPerson;
    if (bookingReference !== undefined) booking.bookingReference = bookingReference;
    if (travelAgent !== undefined) booking.travelAgent = travelAgent;
    if (travelAgentName !== undefined) booking.travelAgentName = travelAgentName;
    if (travelAgentMobile !== undefined) booking.travelAgentMobile = travelAgentMobile;

    if (itinerary) {
        booking.itinerary = itinerary;
        const itinTotal = itinerary.reduce((sum, d) => sum + (Number(d.amount) || Number(d.rate) || 0), 0);
        if ((totalAmount === undefined || Number(totalAmount) <= 0) && itinTotal > 0) {
            booking.totalAmount = itinTotal;
        } else if (totalAmount !== undefined && Number(totalAmount) > 0 && Array.isArray(booking.itinerary) && booking.itinerary.length > 0) {
            // If itinerary only had a lump sum on Day 1 (Days 2+ are 0), keep Day 1 amount in sync with the updated package fare
            const restSum = booking.itinerary.slice(1).reduce((sum, d) => sum + (Number(d.amount) || Number(d.rate) || 0), 0);
            if (restSum === 0 && (Number(booking.itinerary[0].amount) === Number(oldTotalAmount) || booking.itinerary.length === 1)) {
                booking.itinerary[0].amount = Number(totalAmount);
                if (Number(booking.itinerary[0].rate) > 0) {
                    const qty = Number(booking.itinerary[0].quantity || booking.itinerary[0].vehicleCount) || 1;
                    booking.itinerary[0].rate = Math.round(Number(totalAmount) / qty);
                }
            }
        }
        booking.markModified('itinerary');
        if (itinerary[0]?.vehicleType) {
            booking.vehicleType = itinerary[0].vehicleType;
        }
        if (itinerary[0]?.pickupPoint) {
            booking.pickupPoint = itinerary[0].pickupPoint;
            booking.pickupLocation = itinerary[0].pickupPoint;
        }
    }

    if (vehicleMatrix) {
        booking.vehicleMatrix = vehicleMatrix;
    }

    // Automatically sync Completed vs Confirmed status based on ride end date
    if (booking.bookingStatus !== 'Cancelled') {
        const effEnd = booking.travelEndDate || booking.travelStartDate;
        if (effEnd) {
            const endD = new Date(effEnd);
            endD.setHours(0, 0, 0, 0);
            const todayD = new Date();
            todayD.setHours(0, 0, 0, 0);
            if (endD < todayD) {
                booking.bookingStatus = 'Completed';
            } else if (booking.bookingStatus === 'Completed' && bookingStatus !== 'Completed') {
                booking.bookingStatus = 'Confirmed';
            }
        }
    }

    // Recalculate balance & payment status (including Guest Fuel Deduction)
    if (advancePaid !== undefined) {
        booking.advancePaid = Number(advancePaid);
    }
    if (guestFuelFilled !== undefined) {
        booking.guestFuelFilled = Boolean(guestFuelFilled);
    }
    if (guestFuelAmount !== undefined) {
        booking.guestFuelAmount = Number(guestFuelAmount) || 0;
    }
    // Never deduct less than guest-paid Fuel records
    const fuelDeduction = await require('../utils/guestFuel').applyGuestFuelFloor(booking);
    if (booking.totalAmount > 0 && booking.balanceDue <= 0) {
        booking.paymentStatus = 'Full Received';
    } else if (((booking.advancePaid || 0) + fuelDeduction) > 0 && booking.balanceDue > 0) {
        booking.paymentStatus = 'Partial';
    }

    await booking.save();

    if (booking.totalAmount > 0 && booking.balanceDue <= 0) {
        await syncInvoiceForBooking(booking);
    }

    // -------------------------------------------------------------------------
    // CASCADE SYNC 1: LIVE DRS (DRSDuty)
    // Only sync if this booking has ALREADY been sent to Live DRS via "Assign Drivers & Vehicles"
    // -------------------------------------------------------------------------
    try {
        const dutyMatchOr = [
            { bookingRef: booking._id }
        ];
        if (booking.bookingId && String(booking.bookingId).trim()) {
            dutyMatchOr.push({ bookingId: String(booking.bookingId).trim() });
        }
        if (Array.isArray(booking.drsDuties) && booking.drsDuties.length > 0) {
            dutyMatchOr.push({ _id: { $in: booking.drsDuties } });
        }
        const dutyMatch = { $or: dutyMatchOr };

        let existingDuties = await DRSDuty.find(dutyMatch).sort({ dayNo: 1, date: 1 });

        // Strictly only sync if duties already exist in Live DRS (created via Assign Drivers & Vehicles)
        if (existingDuties.length > 0) {
            const effectivePaymentStatus = (booking.paymentStatus === 'Full Received' || booking.balanceDue <= 0) 
                ? 'Full Received' 
                : (booking.advancePaid > 0 ? 'Advance Received' : 'Pending');

            await DRSDuty.updateMany(dutyMatch, {
                $set: {
                    clientName: booking.clientName,
                    mobileNumber: booking.mobileNumber,
                    carType: booking.vehicleType || 'Sedan',
                    paymentStatus: effectivePaymentStatus,
                    advancePaid: booking.advancePaid || 0,
                    guestFuelFilled: Boolean(booking.guestFuelFilled),
                    guestFuelAmount: Number(booking.guestFuelAmount) || 0
                }
            });

            if (Array.isArray(booking.itinerary) && booking.itinerary.length > 0) {
                const updatedDutyIds = [];

                for (let idx = 0; idx < booking.itinerary.length; idx++) {
                    const item = booking.itinerary[idx];
                    const dayNo = item.dayNo || (idx + 1);
                    let dateStr = '';
                    if (item.date) {
                        try {
                            dateStr = new Date(item.date).toISOString().split('T')[0];
                        } catch (_) {}
                    }

                    let matchedDuty = existingDuties.find(d => d.dayNo === dayNo);
                    if (!matchedDuty && dateStr) {
                        matchedDuty = existingDuties.find(d => {
                            if (!d.date) return false;
                            try {
                                return new Date(d.date).toISOString().split('T')[0] === dateStr;
                            } catch (_) {
                                return false;
                            }
                        });
                    }

                    const dutyText = item.duty || item.description || (idx === 0 ? 'City Tour / Transfer' : 'Scheduled Duty');
                    const dutyHotel = item.pickupPoint || booking.pickupPoint || booking.pickupLocation || booking.source || 'Direct';
                    const dutyRevenue = Number(item.amount) || Number(item.rate) || (idx === 0 ? Number(booking.totalAmount) : 0);

                    if (matchedDuty) {
                        matchedDuty.clientName = booking.clientName;
                        matchedDuty.mobileNumber = booking.mobileNumber;
                        if (item.date) matchedDuty.date = new Date(item.date);
                        if (item.time) matchedDuty.time = item.time;
                        matchedDuty.hotel = dutyHotel;
                        matchedDuty.pickupPoint = item.pickupPoint || booking.pickupPoint || '';
                        matchedDuty.duty = dutyText;
                        matchedDuty.itinerary = dutyText;
                        matchedDuty.carType = item.vehicleType || booking.vehicleType || 'Sedan';
                        matchedDuty.revenue = dutyRevenue;
                        matchedDuty.paymentStatus = effectivePaymentStatus;
                        if (item.km) matchedDuty.km = item.km;

                        if (item.driver || item.driverId) {
                            matchedDuty.driver = (item.driverId && item.driverId !== 'custom' && item.driverId !== '__custom__') ? item.driverId : (item.driver || null);
                        }
                        if (item.driverName !== undefined) matchedDuty.customDriverName = item.driverName;
                        if (item.driverPhone !== undefined) matchedDuty.driverMobile = item.driverPhone;
                        if (item.vehicle || item.vehicleId) {
                            matchedDuty.vehicle = (item.vehicleId && item.vehicleId !== 'custom' && item.vehicleId !== '__custom__') ? item.vehicleId : (item.vehicle || null);
                        }
                        if (item.vehicleNumber !== undefined) matchedDuty.customCarNumber = item.vehicleNumber;
                        if (matchedDuty.driver || matchedDuty.customDriverName || matchedDuty.vehicle || matchedDuty.customCarNumber) {
                            matchedDuty.status = 'Assigned';
                        }

                        await matchedDuty.save();
                        updatedDutyIds.push(matchedDuty._id);
                    } else if (item.driver || item.driverId || item.driverName || item.vehicle || item.vehicleId || item.vehicleNumber) {
                        // Only create a new DRSDuty if a driver or vehicle is explicitly provided
                        const newDuty = await DRSDuty.create({
                            company: booking.company,
                            bookingRef: booking._id,
                            bookingId: booking.bookingId,
                            dayNo: dayNo,
                            clientName: booking.clientName,
                            mobileNumber: booking.mobileNumber,
                            date: item.date ? new Date(item.date) : (booking.travelStartDate || new Date()),
                            time: item.time || '09:00 AM',
                            hotel: dutyHotel,
                            pickupPoint: item.pickupPoint || booking.pickupPoint || '',
                            duty: dutyText,
                            itinerary: dutyText,
                            carType: item.vehicleType || booking.vehicleType || 'Sedan',
                            revenue: dutyRevenue,
                            km: item.km || '',
                            driver: (item.driverId && item.driverId !== 'custom' && item.driverId !== '__custom__') ? item.driverId : (item.driver || null),
                            customDriverName: item.driverName || '',
                            driverMobile: item.driverPhone || '',
                            vehicle: (item.vehicleId && item.vehicleId !== 'custom' && item.vehicleId !== '__custom__') ? item.vehicleId : (item.vehicle || null),
                            customCarNumber: item.vehicleNumber || '',
                            paymentStatus: effectivePaymentStatus,
                            status: 'Assigned',
                            isDirectBooking: false
                        });
                        updatedDutyIds.push(newDuty._id);
                    }
                }

                if (updatedDutyIds.length > 0) {
                    const dutiesToRemove = existingDuties.filter(d => !updatedDutyIds.some(id => String(id) === String(d._id)));
                    if (dutiesToRemove.length > 0) {
                        await DRSDuty.deleteMany({ _id: { $in: dutiesToRemove.map(d => d._id) } });
                    }
                }
                booking.drsDuties = updatedDutyIds;
                await booking.save();
            } else if (booking.travelStartDate) {
                const existingDuties = await DRSDuty.find(dutyMatch).sort({ date: 1, dayNo: 1 });
                if (existingDuties.length === 1) {
                    await DRSDuty.findByIdAndUpdate(existingDuties[0]._id, {
                        $set: {
                            date: booking.travelStartDate,
                            hotel: booking.pickupPoint || booking.pickupLocation || booking.source || 'Direct',
                            pickupPoint: booking.pickupPoint || '',
                            revenue: booking.totalAmount
                        }
                    });
                } else if (existingDuties.length > 1) {
                    const currentSum = existingDuties.reduce((s, d) => s + (Number(d.revenue) || 0), 0);
                    if (currentSum > 0 && oldTotalAmount && oldTotalAmount > 0) {
                        let runningAssigned = 0;
                        for (let i = 0; i < existingDuties.length; i++) {
                            const d = existingDuties[i];
                            let newRev;
                            if (i === existingDuties.length - 1) {
                                newRev = Math.max(0, booking.totalAmount - runningAssigned);
                            } else {
                                newRev = Math.round(Number(d.revenue || 0) * (booking.totalAmount / oldTotalAmount));
                                runningAssigned += newRev;
                            }
                            await DRSDuty.findByIdAndUpdate(d._id, { $set: { revenue: newRev } });
                        }
                    } else {
                        const perDuty = Math.round(booking.totalAmount / existingDuties.length);
                        let runningAssigned = 0;
                        for (let i = 0; i < existingDuties.length; i++) {
                            const d = existingDuties[i];
                            const rev = (i === existingDuties.length - 1) ? Math.max(0, booking.totalAmount - runningAssigned) : perDuty;
                            runningAssigned += rev;
                            await DRSDuty.findByIdAndUpdate(d._id, { $set: { revenue: rev } });
                        }
                    }
                }
            }
        }
    } catch (drsSyncErr) {
        console.error('Error cascading booking update to DRS:', drsSyncErr);
    }

    // -------------------------------------------------------------------------
    // CASCADE SYNC 2: CLIENT (Clients directory / Client Ledger)
    // -------------------------------------------------------------------------
    try {
        let clientDoc = null;
        if (booking.client) {
            clientDoc = await Client.findById(booking.client);
        }
        if (!clientDoc && booking.mobileNumber) {
            clientDoc = await Client.findOne({ company: booking.company, mobile: booking.mobileNumber });
        }
        if (clientDoc) {
            if (booking.clientName) clientDoc.name = booking.clientName;
            if (booking.mobileNumber) clientDoc.mobile = booking.mobileNumber;
            if (booking.email) clientDoc.email = booking.email;
            if (booking.gstin) clientDoc.gstNumber = booking.gstin;
            // Adjust balance if total amount changed
            if (oldTotalAmount !== undefined && booking.totalAmount !== oldTotalAmount) {
                const amountDiff = booking.totalAmount - oldTotalAmount;
                clientDoc.totalBilled = Math.max(0, (clientDoc.totalBilled || 0) + amountDiff);
                clientDoc.balance = Math.max(0, (clientDoc.balance || 0) + amountDiff);
            }
            await clientDoc.save();
        }
    } catch (clientSyncErr) {
        console.error('Error cascading booking update to Client:', clientSyncErr);
    }

    // -------------------------------------------------------------------------
    // CASCADE SYNC 3: LEADS (Sales Leads tab)
    // -------------------------------------------------------------------------
    try {
        const Lead = require('../models/Lead');
        await Lead.updateMany(
            {
                $or: [
                    { _id: booking.lead },
                    { bookingRef: booking._id },
                    { bookingId: booking.bookingId },
                    { clientCode: booking.clientCode },
                    { clientCode: booking.bookingId }
                ]
            },
            {
                $set: {
                    clientName: booking.clientName,
                    mobileNumber: booking.mobileNumber,
                    alternateMobile: booking.alternateMobile || '',
                    email: booking.email || '',
                    gstin: booking.gstin || '',
                    carType: booking.vehicleType || '',
                    travelStartDate: booking.travelStartDate,
                    travelEndDate: booking.travelEndDate,
                    isBreakTour: booking.isBreakTour || false,
                    excludedDates: booking.excludedDates || [],
                    activeDaysCount: booking.activeDaysCount || 0,
                    totalAmount: booking.totalAmount,
                    pickupPoint: booking.pickupPoint || booking.pickupLocation || '',
                    dropPoint: booking.dropPoint || booking.dropLocation || '',
                    ...(booking.vehicleMatrix ? { vehicleMatrix: booking.vehicleMatrix } : {}),
                    ...(Array.isArray(booking.itinerary) && booking.itinerary.length > 0 ? { itinerary: booking.itinerary } : {})
                }
            },
            { timestamps: false }
        );
    } catch (leadSyncErr) {
        console.error('Error cascading booking update to Lead:', leadSyncErr);
    }

    // -------------------------------------------------------------------------
    // CASCADE SYNC 4: LEDGER ENTRIES (Accounts & Client Ledger)
    // -------------------------------------------------------------------------
    try {
        if (oldTotalAmount !== undefined && booking.totalAmount !== oldTotalAmount) {
            await LedgerEntry.findOneAndUpdate(
                { referenceId: booking._id, type: 'Bill' },
                {
                    $set: {
                        amount: booking.totalAmount,
                        description: `Booking Confirmed (${booking.bookingCode || booking.bookingId}) - ${booking.clientName}`
                    }
                }
            );
        } else if (booking.clientName !== oldClientName) {
            await LedgerEntry.updateMany(
                { referenceId: booking._id },
                {
                    $set: {
                        description: `Booking (${booking.bookingCode || booking.bookingId}) - ${booking.clientName}`
                    }
                }
            );
        }
    } catch (ledgerSyncErr) {
        console.error('Error cascading booking update to LedgerEntry:', ledgerSyncErr);
    }

    res.json(booking);
});


// @desc    Record a payment against a booking
// @route   POST /api/bookings/:id/payment
// @access  Private/AdminOrExecutive
const recordBookingPayment = asyncHandler(async (req, res) => {
    const { amount, paymentMode, paymentReference, paymentDate, notes } = req.body;
    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
        res.status(400);
        throw new Error('Valid payment amount is required');
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    booking.advancePaid += paymentAmount;
    const payFuelDed = (booking.guestFuelFilled || Number(booking.guestFuelAmount) > 0) ? (Number(booking.guestFuelAmount) || 0) : 0;
    booking.balanceDue = Math.max(0, booking.totalAmount - booking.advancePaid - payFuelDed);

    if (booking.balanceDue <= 0) {
        booking.paymentStatus = 'Full Received';
        // Note: Do not auto-complete bookingStatus on full payment (full advance payment does not mean trip is completed)
    } else {
        booking.paymentStatus = 'Partial';
    }

    await booking.save();

    if (booking.balanceDue <= 0) {
        await syncInvoiceForBooking(booking);
    }

    // Update Client balance
    if (booking.client) {
        const client = await Client.findById(booking.client);
        if (client) {
            client.totalPaid += paymentAmount;
            client.balance = Math.max(0, client.balance - paymentAmount);
            await client.save();
        }
    }

    const isCash = (
        paymentMode === 'Cash' ||
        paymentMode === 'Driver Cash' ||
        paymentMode === 'Cash to Company' ||
        (paymentMode && paymentMode.toLowerCase().includes('cash'))
    );

    let bank = null;
    if (!isCash) {
        try {
            if (req.body.bankAccountId) {
                bank = await BankAccount.findById(req.body.bankAccountId);
            }
            if (!bank) {
                bank = await BankAccount.findOne({ company: booking.company, isDefault: true })
                    || await BankAccount.findOne({ company: booking.company });
            }
        } catch (bErr) {
            console.error('Error finding bank account for payment:', bErr);
        }
    }

    const effectiveBankLabel = isCash ? 'Cash' : (bank?.bankName || paymentMode || 'Bank');

    // Create Ledger Entry
    await LedgerEntry.create({
        client: booking.client,
        company: booking.company,
        type: 'Payment',
        amount: paymentAmount,
        date: paymentDate ? new Date(paymentDate) : new Date(),
        description: `Payment received for ${booking.bookingId} (${booking.clientCode || ''}) via ${effectiveBankLabel} ${paymentReference ? `(Ref: ${paymentReference})` : ''}`,
        referenceId: booking._id,
        bankName: isCash ? 'Cash' : (bank?.bankName || ''),
        paymentMode: effectiveBankLabel
    });

    // Sync to Cash Book or Bank Book depending on paymentMode
    try {
        if (isCash) {
            await CashTransaction.create({
                company: booking.company,
                type: 'IN',
                amount: paymentAmount,
                category: 'Booking Payment',
                reference: paymentReference || '',
                description: `Payment Received - ${booking.clientName}`,
                bookingRef: booking._id,
                bookingId: booking.bookingCode || booking.bookingId || '',
                guestName: booking.clientName || '',
                clientRef: booking.client || null,
                sourceId: booking._id,
                sourceType: 'BookingPayment',
                date: paymentDate ? new Date(paymentDate) : new Date(),
                createdBy: req.user ? req.user._id : null
            });
            await Company.findByIdAndUpdate(booking.company, {
                $inc: { cashBalance: paymentAmount }
            });
        } else if (bank) {
            await BankTransaction.create({
                company: booking.company,
                bankAccount: bank._id,
                bankName: bank.bankName || '',
                type: 'IN',
                amount: paymentAmount,
                paymentMode: paymentMode || 'Bank Transfer / NEFT',
                category: 'Booking Payment',
                reference: paymentReference || '',
                description: `Payment Received - ${booking.clientName}`,
                bookingRef: booking._id,
                clientRef: booking.client || null,
                sourceId: booking._id,
                sourceType: 'BookingPayment',
                date: paymentDate ? new Date(paymentDate) : new Date(),
                createdBy: req.user ? req.user._id : null
            });
            bank.currentBalance = (bank.currentBalance || 0) + paymentAmount;
            await bank.save();
        }
    } catch (paymentSyncErr) {
        console.error('Error syncing payment to Cash/Bank Book:', paymentSyncErr);
    }

    res.json({
        message: 'Payment recorded successfully',
        booking
    });
});


// @desc    Cancel a booking
// @route   POST /api/bookings/:id/cancel
// @access  Private/AdminOrExecutive
const cancelBooking = asyncHandler(async (req, res) => {
    const { reason, refundAmount, refundMode } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }
    
    
    const advancePaid = booking.advancePaid || 0;
    const refund = Number(refundAmount) || 0;
    
    // Process refund logic
    if (refund > 0) {
        await LedgerEntry.create({
            client: booking.client,
            company: booking.company,
            type: 'Refund',
            amount: refund,
            description: `Refund for cancelled booking ${booking.bookingCode || booking.bookingId} via ${refundMode || 'Bank'}`,
            referenceId: booking._id,
            date: new Date()
        });

        const isCashRefund = (refundMode && refundMode.toLowerCase().includes('cash')) || refundMode === 'Cash';

        if (isCashRefund) {
            try {
                await CashTransaction.create({
                    company: booking.company,
                    type: 'OUT',
                    amount: refund,
                    category: 'Refund',
                    reference: '',
                    description: `Refund Issued - ${booking.clientName}`,
                    bookingRef: booking._id,
                    bookingId: booking.bookingCode || booking.bookingId || '',
                    guestName: booking.clientName || '',
                    clientRef: booking.client || null,
                    date: new Date(),
                    createdBy: req.user ? req.user._id : null
                });
                await Company.findByIdAndUpdate(booking.company, {
                    $inc: { cashBalance: -refund }
                });
            } catch (cashRefundErr) {
                console.error('Error creating cash refund transaction:', cashRefundErr);
            }
        } else {
            try {
                let bank = await BankAccount.findOne({ company: booking.company, isDefault: true })
                    || await BankAccount.findOne({ company: booking.company });
                
                if (bank) {
                    await BankTransaction.create({
                        company: booking.company,
                        bankAccount: bank._id,
                        bankName: bank.bankName || '',
                        type: 'OUT',
                        amount: refund,
                        paymentMode: 'Bank Transfer / NEFT',
                        category: 'Refund',
                        reference: '',
                        description: `Refund Issued - ${booking.clientName}`,
                        bookingRef: booking._id,
                        clientRef: booking.client || null,
                        date: new Date(),
                        createdBy: req.user ? req.user._id : null
                    });
                    bank.currentBalance = (bank.currentBalance || 0) - refund;
                    await bank.save();
                }
            } catch (bankErr) {
                console.error('Error creating bank transaction on refund:', bankErr);
            }
        }
        
        booking.advancePaid -= refund; // Retained amount
    }


    const retainedAmount = advancePaid - refund;
    
    booking.bookingStatus = 'Cancelled';
    if (retainedAmount > 0) {
        booking.notes = `${booking.notes ? booking.notes + ' | ' : ''}Cancelled (Retained ₹${retainedAmount}): ${reason || 'Customer request'}`;
    } else {
        booking.notes = `${booking.notes ? booking.notes + ' | ' : ''}Cancelled (Fully Refunded): ${reason || 'Customer request'}`;
        
        // Remove ledger entries as per request: "no account ledger will show there"
        const LedgerEntry = require('../models/LedgerEntry');
        await LedgerEntry.deleteMany({ referenceId: booking._id });
        booking.advancePaid = 0;
    }

    // Remove all associated DRS duties so they do not clutter Live DRS
    try {
        await DRSDuty.deleteMany({
            $or: [
                { bookingRef: booking._id },
                { bookingId: booking.bookingId },
                { _id: { $in: booking.drsDuties || [] } }
            ]
        });
        booking.drsDuties = [];
    } catch (drsDelErr) {
        console.error('Error removing DRS duties on booking cancellation:', drsDelErr);
    }

    // Sync with linked Lead so Leads table and Conversions stats stay strictly accurate
    try {
        const Lead = require('../models/Lead');
        await Lead.updateMany(
            {
                $or: [
                    { bookingRef: booking._id },
                    { bookingId: booking.bookingCode },
                    { bookingId: booking.bookingId },
                    { clientCode: booking.bookingCode },
                    { clientCode: booking.bookingId }
                ]
            },
            {
                $set: {
                    status: 'Lost',
                    priority: 'Lost',
                    notes: `Booking Cancelled: ${reason || 'Customer request'}`
                }
            }
        );
    } catch (leadSyncErr) {
        console.error('Error syncing cancelled lead:', leadSyncErr);
    }
    
    // Save booking
    await booking.save();

    res.json({ message: 'Booking cancelled successfully', booking });
});


// @desc    Assign driver and vehicle to booking itinerary days and shoot into DRS
// @route   POST /api/bookings/:id/assign-drivers
// @access  Private/AdminOrExecutive
const assignBookingDrivers = asyncHandler(async (req, res) => {
    const { itinerary } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    if (Array.isArray(itinerary)) {
        const normalizePlate = (str) => String(str || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const extractDigits = (str) => {
            const m = String(str || '').match(/\d{3,4}/);
            return m ? m[0] : '';
        };

        const fleetVehicles = await Vehicle.find({
            company: booking.company,
            isOutsideCar: { $ne: true }
        }).select('_id carNumber model carType').lean();

        const fleetNormSet = new Set(fleetVehicles.map(v => normalizePlate(v.carNumber)).filter(Boolean));
        const fleetIdSet = new Set(fleetVehicles.map(v => String(v._id)));
        const fleetDigitMap = new Map();
        fleetVehicles.forEach(v => {
            const d = extractDigits(v.carNumber);
            if (d) {
                if (!fleetDigitMap.has(d)) fleetDigitMap.set(d, []);
                fleetDigitMap.get(d).push(v);
            }
        });

        const findFleetVehicle = (vId, vNum) => {
            if (vId && fleetIdSet.has(String(vId))) {
                return fleetVehicles.find(v => String(v._id) === String(vId));
            }
            if (!vNum) return null;
            const norm = normalizePlate(vNum);
            if (norm && fleetNormSet.has(norm)) {
                return fleetVehicles.find(v => normalizePlate(v.carNumber) === norm);
            }
            const digits = extractDigits(vNum);
            if (digits && fleetDigitMap.has(digits)) {
                const candidates = fleetDigitMap.get(digits);
                if (candidates.length === 1) return candidates[0];
                const upper = String(vNum).toUpperCase();
                const byModel = candidates.find(v => {
                    const m = (v.model || v.carType || '').toUpperCase();
                    return m && upper.includes(m);
                });
                if (byModel) return byModel;
            }
            return null;
        };

        const normalizedItinerary = itinerary.map((day, idx) => {
            const dayNo = day.dayNo || (idx + 1);
            const driverId = day.driverId && day.driverId !== 'custom' && day.driverId !== '__custom__' ? day.driverId : null;
            let vehicleId = day.vehicleId && day.vehicleId !== 'custom' && day.vehicleId !== '__custom__' ? day.vehicleId : (day.vehicle || null);
            let vehicleNumber = day.vehicleNumber || day.customCarNumber || '';
            const matchedFleet = findFleetVehicle(vehicleId, vehicleNumber);
            const isCompanyFleetCar = Boolean(matchedFleet);
            if (matchedFleet) {
                vehicleId = matchedFleet._id;
                vehicleNumber = matchedFleet.carNumber;
            }
            const dutyText = day.duty || day.description || 'City Tour / Transfer';
            return {
                ...day,
                dayNo,
                date: day.date || booking.travelStartDate || new Date(),
                time: day.isApg ? 'APG' : (day.time || '09:00 AM'),
                isApg: !!(day.isApg || day.time === 'APG'),
                pickupPoint: day.pickupPoint !== undefined ? day.pickupPoint : (booking.pickupPoint || booking.pickupLocation || ''),
                duty: dutyText,
                description: dutyText,
                vehicleType: matchedFleet ? (matchedFleet.carType || matchedFleet.model || day.vehicleType || booking.vehicleType) : (day.vehicleType || booking.vehicleType || 'Innova Crysta'),
                driver: driverId,
                driverId: day.driverId || '',
                driverName: day.driverName || day.customDriverName || '',
                driverPhone: day.driverPhone || day.driverMobile || '',
                vehicle: vehicleId,
                vehicleId: vehicleId ? String(vehicleId) : '',
                vehicleNumber: vehicleNumber,
                isOutsideCar: isCompanyFleetCar ? false : Boolean(day.isOutsideCar),
                ownerName: isCompanyFleetCar ? '' : (day.ownerName || ''),
                buyAmount: isCompanyFleetCar ? '' : (day.buyAmount || ''),
                amount: day.amount !== undefined && day.amount !== '' ? Number(day.amount) : 0,
                km: day.km || ''
            };
        });

        // PRESERVE booking.itinerary quotation: DO NOT overwrite with multi-car DRS duties list.
        // Overwriting duplicates quotation days and corrupts agreed pricing.
        // Instead, deduplicate any duplicate rows from past multi-car assignment bug and attach driver/vehicle:
        if (Array.isArray(booking.itinerary) && booking.itinerary.length > 0) {
            const seenKeys = new Set();
            const cleanItin = [];
            for (const it of booking.itinerary) {
                const key = `${it.dayNo || 1}_${it.date ? String(it.date).slice(0, 10) : ''}`;
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    const assigned = normalizedItinerary.find(d => Number(d.dayNo) === Number(it.dayNo));
                    if (assigned) {
                        it.driver = assigned.driver || it.driver;
                        it.driverName = assigned.driverName || it.driverName;
                        it.driverPhone = assigned.driverPhone || it.driverPhone;
                        it.vehicle = assigned.vehicle || it.vehicle;
                        it.vehicleNumber = assigned.vehicleNumber || it.vehicleNumber;
                    }
                    cleanItin.push(it);
                }
            }
            booking.itinerary = cleanItin;
            booking.markModified('itinerary');
        }

        // Check if multiple cars exist across dates
        const carCountByDate = {};
        for (const it of normalizedItinerary) {
            const dStr = it.date ? String(it.date).slice(0, 10) : 'unknown';
            carCountByDate[dStr] = (carCountByDate[dStr] || 0) + 1;
        }
        const maxCars = Math.max(1, ...Object.values(carCountByDate));
        if (maxCars > 1) {
            booking.numberOfCars = maxCars;
        }

        // Preserve booking agreed totalAmount and calculate balanceDue
        const fuelDeduction = (booking.guestFuelFilled || Number(booking.guestFuelAmount) > 0) ? (Number(booking.guestFuelAmount) || 0) : 0;
        booking.balanceDue = Math.max(0, (Number(booking.totalAmount) || 0) - (Number(booking.advancePaid) || 0) - fuelDeduction);

        if (booking.totalAmount > 0 && booking.balanceDue <= 0) {
            booking.paymentStatus = 'Full Received';
        } else if (((Number(booking.advancePaid) || 0) + fuelDeduction) > 0 && booking.balanceDue > 0) {
            booking.paymentStatus = 'Partial';
        }

        if (normalizedItinerary[0]?.pickupPoint) {
            booking.pickupPoint = normalizedItinerary[0].pickupPoint;
            booking.pickupLocation = normalizedItinerary[0].pickupPoint;
        }
        if (normalizedItinerary[0]?.vehicleType) {
            booking.vehicleType = normalizedItinerary[0].vehicleType;
        }
        await booking.save();

        const matchConditions = [
            { bookingRef: booking._id },
            { bookingId: booking.bookingId }
        ];
        if (booking.clientCode) {
            matchConditions.push({ bookingId: booking.clientCode });
        }
        if (booking.lead) {
            matchConditions.push({ leadId: booking.lead });
        }

        const candidateDuties = await DRSDuty.find({ $or: matchConditions }).sort({ dayNo: 1, date: 1 });
        const syncedDutyIds = [];

        const effectivePaymentStatus = (booking.paymentStatus === 'Full Received' || booking.balanceDue <= 0)
            ? 'Full Received'
            : (booking.advancePaid > 0 ? 'Advance Received' : 'Pending');

        for (const [idx, day] of normalizedItinerary.entries()) {
            const dayNo = day.dayNo || (idx + 1);
            let dateStr = null;
            if (day.date) {
                try {
                    dateStr = new Date(day.date).toISOString().split('T')[0];
                } catch (_) {}
            }

            const driverId = day.driver;
            const driverName = day.driverName || '';
            const driverPhone = day.driverPhone || '';
            let vehicleId = day.vehicle;
            let vehicleNumber = day.vehicleNumber || '';
            const matchedFleet = findFleetVehicle(vehicleId, vehicleNumber);
            const isCompanyFleetCar = Boolean(matchedFleet);
            if (matchedFleet) {
                vehicleId = matchedFleet._id;
                vehicleNumber = matchedFleet.carNumber;
            }
            const dutyText = day.duty || day.description || 'Scheduled Duty';
            const hotelDisplay = day.pickupPoint || booking.pickupPoint || booking.source || 'Direct';

            // Match existing duty that hasn't already been claimed in this loop
            let matchingDuty = candidateDuties.find(d => !syncedDutyIds.some(id => String(id) === String(d._id)) && d.dayNo === dayNo);
            if (!matchingDuty && dateStr) {
                matchingDuty = candidateDuties.find(d => {
                    if (syncedDutyIds.some(id => String(id) === String(d._id))) return false;
                    if (!d.date) return false;
                    try {
                        return new Date(d.date).toISOString().split('T')[0] === dateStr;
                    } catch (_) {
                        return false;
                    }
                });
            }

            const cleanCarNum = String(vehicleNumber || '').trim().toUpperCase();
            const normCarNum = normalizePlate(vehicleNumber);

            // Strictly exclude fleet vehicles from being classified as Outside Cars
            const isOutsideDay = !isCompanyFleetCar && Boolean(
                day.isOutside ||
                day.isOutsideCar ||
                (day.vehicleSource === 'External') ||
                (day.ownerName && day.ownerName.trim() !== '') ||
                (cleanCarNum && (!vehicleId || day.vehicleId === 'custom'))
            );
            const vendorName = isCompanyFleetCar ? '' : (day.ownerName || day.vendorName || '');
            const vendorPayout = !isCompanyFleetCar && day.buyAmount !== undefined && day.buyAmount !== '' ? Number(day.buyAmount) : 0;

            // If it is a company fleet car, proactively clean up any accidental duplicate outside car entries
            if (isCompanyFleetCar && normCarNum) {
                try {
                    const platePattern = normCarNum.split('').join('[- ]*');
                    await Vehicle.deleteMany({
                        company: booking.company,
                        isOutsideCar: true,
                        carNumber: { $regex: new RegExp(`^${platePattern}#`, 'i') }
                    });
                } catch (_) {}
            }

            if (matchingDuty) {
                matchingDuty.bookingRef = booking._id;
                matchingDuty.bookingId = booking.bookingId || booking.clientCode;
                matchingDuty.leadId = booking.lead || matchingDuty.leadId || null;
                matchingDuty.clientName = booking.clientName;
                matchingDuty.mobileNumber = booking.mobileNumber;
                matchingDuty.dayNo = dayNo;
                if (day.date) matchingDuty.date = new Date(day.date);
                matchingDuty.time = day.time || '09:00 AM';
                matchingDuty.hotel = hotelDisplay;
                matchingDuty.pickupPoint = day.pickupPoint || '';
                matchingDuty.duty = dutyText;
                matchingDuty.itinerary = dutyText;
                matchingDuty.carType = day.vehicleType || booking.vehicleType || 'Innova Crysta';
                matchingDuty.driver = driverId;
                matchingDuty.customDriverName = driverName;
                matchingDuty.driverMobile = driverPhone;
                matchingDuty.vehicle = vehicleId;
                matchingDuty.customCarNumber = vehicleNumber;
                matchingDuty.revenue = day.amount !== undefined ? Number(day.amount) : matchingDuty.revenue;
                matchingDuty.km = day.km || matchingDuty.km || '';
                matchingDuty.stayType = day.stayType || 'Same Day Return';
                matchingDuty.paymentStatus = effectivePaymentStatus;
                matchingDuty.status = 'Assigned';
                matchingDuty.guestFuelFilled = Boolean(booking.guestFuelFilled);
                matchingDuty.guestFuelAmount = Number(booking.guestFuelAmount) || 0;
                if (isOutsideDay) {
                    matchingDuty.isOutsideCar = true;
                    if (vendorName) matchingDuty.vendorName = vendorName;
                    if (vendorPayout) matchingDuty.vendorPayout = vendorPayout;
                } else if (isCompanyFleetCar) {
                    matchingDuty.isOutsideCar = false;
                    matchingDuty.vendorName = '';
                    matchingDuty.vendorPayout = 0;
                }
                await matchingDuty.save();
                try {
                    const { syncOutsideCarFromDuty } = require('../utils/outsideCarSync');
                    await syncOutsideCarFromDuty(matchingDuty, booking);
                } catch (scErr) { console.error('Error syncing outside car in matchingDuty:', scErr); }
                syncedDutyIds.push(matchingDuty._id);
            } else {
                const newDuty = await DRSDuty.create({
                    company: booking.company,
                    bookingRef: booking._id,
                    bookingId: booking.bookingId || booking.clientCode,
                    leadId: booking.lead || null,
                    clientName: booking.clientName,
                    mobileNumber: booking.mobileNumber,
                    date: day.date ? new Date(day.date) : (booking.travelStartDate || new Date()),
                    time: day.time || '09:00 AM',
                    hotel: hotelDisplay,
                    pickupPoint: day.pickupPoint || '',
                    duty: dutyText,
                    itinerary: dutyText,
                    dayNo: dayNo,
                    carType: day.vehicleType || booking.vehicleType || 'Innova Crysta',
                    driver: driverId,
                    customDriverName: driverName,
                    driverMobile: driverPhone,
                    vehicle: vehicleId,
                    customCarNumber: vehicleNumber,
                    revenue: day.amount || 0,
                    km: day.km || '',
                    stayType: day.stayType || 'Same Day Return',
                    paymentStatus: effectivePaymentStatus,
                    status: 'Assigned',
                    isDirectBooking: false,
                    isOutsideCar: isOutsideDay,
                    vendorName: vendorName,
                    vendorPayout: vendorPayout,
                    guestFuelFilled: Boolean(booking.guestFuelFilled),
                    guestFuelAmount: Number(booking.guestFuelAmount) || 0
                });
                try {
                    const { syncOutsideCarFromDuty } = require('../utils/outsideCarSync');
                    await syncOutsideCarFromDuty(newDuty, booking);
                } catch (scErr) { console.error('Error syncing outside car in newDuty:', scErr); }
                syncedDutyIds.push(newDuty._id);
            }
        }

        // Delete any old/duplicate DRSDuty records for this booking that are no longer in syncedDutyIds
        const staleDuties = candidateDuties.filter(d => !syncedDutyIds.some(id => String(id) === String(d._id)));
        if (staleDuties.length > 0) {
            await DRSDuty.deleteMany({ _id: { $in: staleDuties.map(d => d._id) } });
        }

        booking.drsDuties = syncedDutyIds;
        await booking.save();
    }

    const updatedBooking = await Booking.findById(booking._id)
        .populate('lead', 'leadId status totalAmount remarksHistory specialRemarks')
        .populate('client', 'name mobile balance')
        .populate({
            path: 'drsDuties',
            populate: [
                { path: 'driver', select: 'name mobile phone' },
                { path: 'vehicle', select: 'carNumber model type' }
            ]
        });

    res.json({
        message: 'Driver & vehicle assignments saved and synced to Live DRS successfully',
        booking: updatedBooking
    });
});

// @desc    Permanently delete a booking and its DRS duties
// @route   DELETE /api/bookings/:id
// @access  Private/AdminOrExecutive
const deleteBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    // 1. Delete all associated DRSDuties
    await DRSDuty.deleteMany({
        $or: [
            { bookingRef: booking._id },
            { bookingId: booking.bookingId },
            { _id: { $in: booking.drsDuties || [] } }
        ]
    });

    // 2. Remove ledger entries
    await LedgerEntry.deleteMany({ referenceId: booking._id });

    // 3. Reset linked lead if any
    try {
        const Lead = require('../models/Lead');
        await Lead.updateMany(
            {
                $or: [
                    { bookingRef: booking._id },
                    { bookingId: booking.bookingId }
                ]
            },
            {
                $set: {
                    bookingRef: null,
                    status: 'Cancelled',
                    notes: 'Associated booking deleted'
                }
            }
        );
    } catch (err) {
        console.error('Error decoupling lead on booking delete:', err);
    }

    // 4. Delete the booking
    await booking.deleteOne();

    res.json({ message: 'Booking and associated DRS duties deleted successfully' });
});

module.exports = {
    getBookings,
    getBookingById,
    updateBooking,
    recordBookingPayment,
    cancelBooking,
    assignBookingDrivers,
    deleteBooking
};
