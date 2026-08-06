const express = require('express');
const router = express.Router();
const {
    getClients,
    getClientLedger,
    addPayment,
    updateClient
} = require('../controllers/clientController');
const { protect, adminOrExecutive, checkCompany } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/company/:companyId')
    .get(adminOrExecutive, checkCompany, getClients);

router.route('/:id/ledger')
    .get(adminOrExecutive, getClientLedger);

router.route('/:id/payment')
    .post(adminOrExecutive, addPayment);

router.route('/:id')
    .put(adminOrExecutive, updateClient);

module.exports = router;
