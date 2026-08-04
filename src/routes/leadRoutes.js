const express = require('express');
const router = express.Router();
const {
    getLeads,
    getLeadById,
    createLead,
    updateLead,
    deleteLead,
    convertToBooking
} = require('../controllers/leadController');
const { adminOrExecutive, checkCompany, protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .post(adminOrExecutive, createLead);

router.route('/:companyId')
    .get(adminOrExecutive, checkCompany, getLeads);

router.route('/single/:id')
    .get(adminOrExecutive, getLeadById)
    .put(adminOrExecutive, updateLead)
    .delete(adminOrExecutive, deleteLead);

router.post('/:id/convert', adminOrExecutive, convertToBooking);

module.exports = router;
