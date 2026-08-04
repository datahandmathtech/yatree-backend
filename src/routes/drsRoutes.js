const express = require('express');
const router = express.Router();
const {
    getDRSDuties,
    createDRSDuty,
    updateDRSDuty,
    deleteDRSDuty
} = require('../controllers/drsController');
const { adminOrExecutive, checkCompany, protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .post(adminOrExecutive, createDRSDuty);

router.route('/:companyId')
    .get(adminOrExecutive, checkCompany, getDRSDuties);

router.route('/:id')
    .put(adminOrExecutive, updateDRSDuty)
    .delete(adminOrExecutive, deleteDRSDuty);

module.exports = router;
