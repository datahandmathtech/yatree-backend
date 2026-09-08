const express = require('express');
const router = express.Router();
const {
    getLeads,
    checkDuplicatePhone,
    getLeadById,
    createLead,
    updateLead,
    deleteLead,
    convertToBooking,
    getNextClientCodePreview
} = require('../controllers/leadController');
const { adminOrExecutive, checkCompany, protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .post(adminOrExecutive, createLead);

router.route('/next-client-code/:companyId')
    .get(adminOrExecutive, checkCompany, getNextClientCodePreview);

router.route('/check-phone/:companyId')
    .get(adminOrExecutive, checkCompany, checkDuplicatePhone);

router.route(['/:companyId', '/company/:companyId'])
    .get(adminOrExecutive, checkCompany, getLeads);

router.route('/single/:id')
    .get(adminOrExecutive, getLeadById)
    .put(adminOrExecutive, updateLead)
    .delete(adminOrExecutive, deleteLead);

router.post('/:id/convert', adminOrExecutive, convertToBooking);

module.exports = router;
