const express = require('express');
const router = express.Router();
const {
    getBookings,
    getBookingById,
    updateBooking,
    recordBookingPayment,
    cancelBooking,
    assignBookingDrivers
} = require('../controllers/bookingController');
const { adminOrExecutive, checkCompany, protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route(['/:companyId', '/company/:companyId'])
    .get(adminOrExecutive, checkCompany, getBookings);

router.route('/single/:id')
    .get(adminOrExecutive, getBookingById)
    .put(adminOrExecutive, updateBooking);

router.post('/:id/payment', adminOrExecutive, recordBookingPayment);
router.post('/:id/cancel', adminOrExecutive, cancelBooking);
router.post('/:id/assign-drivers', adminOrExecutive, assignBookingDrivers);

module.exports = router;
