const express = require('express');
const router = express.Router();
const {
    getBookings,
    getBookingById,
    updateBooking,
    recordBookingPayment,
    cancelBooking
} = require('../controllers/bookingController');
const { adminOrExecutive, checkCompany, protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/:companyId')
    .get(adminOrExecutive, checkCompany, getBookings);

router.route('/single/:id')
    .get(adminOrExecutive, getBookingById)
    .put(adminOrExecutive, updateBooking);

router.post('/:id/payment', adminOrExecutive, recordBookingPayment);
router.post('/:id/cancel', adminOrExecutive, cancelBooking);

module.exports = router;
