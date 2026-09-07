const express = require('express');
const router = express.Router();
const {
    createInvoice,
    getInvoices,
    getInvoiceById,
    updateInvoiceStatus,
    deleteInvoice
} = require('../controllers/invoiceController');
const { adminOrExecutive, checkCompany, protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .post(adminOrExecutive, createInvoice);

router.route(['/:companyId', '/company/:companyId'])
    .get(adminOrExecutive, checkCompany, getInvoices);

router.route('/single/:id')
    .get(adminOrExecutive, getInvoiceById)
    .delete(adminOrExecutive, deleteInvoice);

router.route('/:id/status')
    .put(adminOrExecutive, updateInvoiceStatus);

module.exports = router;
