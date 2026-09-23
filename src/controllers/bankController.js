const asyncHandler = require('express-async-handler');
const BankAccount = require('../models/BankAccount');
const BankTransaction = require('../models/BankTransaction');

// @desc    Get all bank accounts for a company
// @route   GET /api/banks/company/:companyId
// @access  Private
const getBankAccounts = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const accounts = await BankAccount.find({ company: companyId, isActive: true }).sort({ createdAt: 1 });
    res.json(accounts);
});

// @desc    Create new bank account
// @route   POST /api/banks
// @access  Private/Admin
const createBankAccount = asyncHandler(async (req, res) => {
    const { company, bankName, accountNumber, accountHolder, ifsc, branch, upiId, openingBalance } = req.body;
    if (!company || !bankName) {
        res.status(400);
        throw new Error('Company and Bank Name are required');
    }

    const openBal = Number(openingBalance) || 0;
    const account = await BankAccount.create({
        company,
        bankName,
        accountNumber: accountNumber || '',
        accountHolder: accountHolder || '',
        ifsc: ifsc || '',
        branch: branch || '',
        upiId: upiId || '',
        openingBalance: openBal,
        currentBalance: openBal,
        isActive: true
    });

    res.status(201).json(account);
});

// @desc    Update bank account
// @route   PUT /api/banks/:id
// @access  Private/Admin
const updateBankAccount = asyncHandler(async (req, res) => {
    const account = await BankAccount.findById(req.params.id);
    if (!account) {
        res.status(404);
        throw new Error('Bank account not found');
    }

    const { bankName, accountNumber, accountHolder, ifsc, branch, upiId } = req.body;
    account.bankName = bankName || account.bankName;
    account.accountNumber = accountNumber !== undefined ? accountNumber : account.accountNumber;
    account.accountHolder = accountHolder !== undefined ? accountHolder : account.accountHolder;
    account.ifsc = ifsc !== undefined ? ifsc : account.ifsc;
    account.branch = branch !== undefined ? branch : account.branch;
    account.upiId = upiId !== undefined ? upiId : account.upiId;

    const updated = await account.save();
    res.json(updated);
});

// @desc    Delete (or deactivate) bank account
// @route   DELETE /api/banks/:id
// @access  Private/Admin
const deleteBankAccount = asyncHandler(async (req, res) => {
    const account = await BankAccount.findById(req.params.id);
    if (!account) {
        res.status(404);
        throw new Error('Bank account not found');
    }

    const txCount = await BankTransaction.countDocuments({ bankAccount: account._id });
    if (txCount > 0) {
        account.isActive = false;
        await account.save();
        return res.json({ message: 'Bank account deactivated because it has transactions' });
    }

    await account.deleteOne();
    res.json({ message: 'Bank account deleted successfully' });
});

// @desc    Get bank transactions with filters (daily, monthly, bank tab)
// @route   GET /api/banks/transactions/company/:companyId
// @access  Private
const getBankTransactions = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { bankAccountId, date, month, year, search } = req.query;

    let query = { company: companyId };

    if (bankAccountId && bankAccountId !== 'all') {
        query.bankAccount = bankAccountId;
    }

    // Date filter: Daily or Monthly
    if (date) {
        const d = new Date(date);
        const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
        query.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (month && year) {
        const m = parseInt(month);
        const y = parseInt(year);
        const startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
        const endDate = new Date(y, m, 0, 23, 59, 59, 999);
        query.date = { $gte: startDate, $lte: endDate };
    }

    if (search) {
        query.$or = [
            { description: { $regex: search, $options: 'i' } },
            { reference: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } },
            { bankName: { $regex: search, $options: 'i' } }
        ];
    }

    const transactions = await BankTransaction.find(query)
        .populate('bankAccount', 'bankName accountNumber')
        .populate('bookingRef', 'bookingId clientCode clientName')
        .populate('createdBy', 'name')
        .sort({ date: -1, createdAt: -1 });

    // Compute stats
    let totalIn = 0;
    let totalOut = 0;
    for (const tx of transactions) {
        if (tx.type === 'IN') totalIn += tx.amount;
        else if (tx.type === 'OUT') totalOut += tx.amount;
    }

    // Overall bank balance (either specific bank or sum of all banks)
    let bankAccountsQuery = { company: companyId, isActive: true };
    if (bankAccountId && bankAccountId !== 'all') {
        bankAccountsQuery._id = bankAccountId;
    }
    const accounts = await BankAccount.find(bankAccountsQuery);
    const overallBalance = accounts.reduce((acc, a) => acc + (a.currentBalance || 0), 0);

    res.json({
        stats: {
            totalIn,
            totalOut,
            periodBalance: totalIn - totalOut,
            currentBalance: overallBalance
        },
        transactions
    });
});

// @desc    Add manual bank transaction
// @route   POST /api/banks/transactions
// @access  Private
const addBankTransaction = asyncHandler(async (req, res) => {
    const { company, bankAccountId, type, amount, category, paymentMode, reference, paymentScreenshot, description, date } = req.body;
    
    if (!company || !bankAccountId || !type || !amount) {
        res.status(400);
        throw new Error('Company, Bank Account, Type, and Amount are required');
    }

    const bank = await BankAccount.findById(bankAccountId);
    if (!bank) {
        res.status(404);
        throw new Error('Bank account not found');
    }

    const numAmount = Number(amount);
    const tx = await BankTransaction.create({
        company,
        bankAccount: bank._id,
        bankName: bank.bankName,
        type,
        amount: numAmount,
        category: category || (type === 'IN' ? 'Deposit' : 'Withdrawal'),
        paymentMode: paymentMode || 'UPI / QR Code',
        reference: reference || '',
        paymentScreenshot: paymentScreenshot || '',
        description: description || '',
        date: date ? new Date(date) : new Date(),
        createdBy: req.user ? req.user._id : null
    });

    // Update bank balance
    if (type === 'IN') {
        bank.currentBalance += numAmount;
    } else {
        bank.currentBalance -= numAmount;
    }
    await bank.save();

    res.status(201).json({ transaction: tx, bankBalance: bank.currentBalance });
});


// @desc    Update a bank transaction
// @route   PUT /api/banks/transactions/:id
// @access  Private/Admin
const updateBankTransaction = asyncHandler(async (req, res) => {
    const { amount, date, description, category, paymentMode, reference } = req.body;
    
    const tx = await BankTransaction.findById(req.params.id);
    if (!tx) {
        res.status(404);
        throw new Error('Transaction not found');
    }

    const newAmount = Number(amount);
    const oldAmount = tx.amount;
    const diff = newAmount - oldAmount;

    // Update bank balance
    if (diff !== 0) {
        const bank = await BankAccount.findById(tx.bankAccount);
        if (bank) {
            if (tx.type === 'IN') {
                bank.currentBalance += diff;
            } else {
                bank.currentBalance -= diff;
            }
            await bank.save();
        }
    }

    // Update Booking advancePaid if linked
    if (tx.bookingRef) {
        const Booking = require('../models/Booking');
        const booking = await Booking.findById(tx.bookingRef);
        if (booking) {
            let noteStr = '';
            if (diff !== 0) {
                if (tx.type === 'IN') {
                    booking.advancePaid = Math.max(0, (booking.advancePaid || 0) + diff);
                } else {
                    booking.advancePaid = (booking.advancePaid || 0) - diff;
                }
                noteStr += `\n[System]: Payment amount edited in Bank Book from ${oldAmount} to ${newAmount} on ${new Date().toLocaleDateString()}.`;
            }
            
            // ALWAYS sync the date if it was changed
            if (date && booking.lead) {
                const Lead = require('../models/Lead');
                const lead = await Lead.findById(booking.lead);
                if (lead) {
                    lead.advanceDate = new Date(date);
                    await lead.save();
                    noteStr += `\n[System]: Payment date edited in Bank Book to ${new Date(date).toLocaleDateString()}.`;
                }
            }
            
            if (noteStr) {
                booking.notes = (booking.notes || '') + noteStr;
            }
            await booking.save();
        }
    }

    // Update transaction fields
    tx.amount = newAmount;
    if (date) tx.date = date;
    if (description !== undefined) tx.description = description;
    if (category !== undefined) tx.category = category;
    if (paymentMode !== undefined) tx.paymentMode = paymentMode;
    if (reference !== undefined) tx.reference = reference;
    
    await tx.save();

    res.json(tx);
});

// @desc    Delete a bank transaction
// @route   DELETE /api/banks/transactions/:id
// @access  Private/Admin
const deleteBankTransaction = asyncHandler(async (req, res) => {
    console.log("DELETE TRANSACTION HIT WITH ID:", req.params.id);
    const tx = await BankTransaction.findById(req.params.id);
    console.log("TRANSACTION FOUND?", !!tx);
    if (!tx) {
        res.status(404);
        throw new Error('Transaction not found');
    }

    const bank = await BankAccount.findById(tx.bankAccount);
    if (bank) {
        if (tx.type === 'IN') {
            bank.currentBalance -= tx.amount;
        } else {
            bank.currentBalance += tx.amount;
        }
        await bank.save();
    }

    // Handle revert booking logic
    if (tx.bookingRef) {
        const Booking = require('../models/Booking');
        const booking = await Booking.findById(tx.bookingRef);
        
        if (booking) {
            if (req.query.revertBooking === 'true') {
                // REVERT BOOKING TO LEAD
                const Lead = require('../models/Lead');
                if (booking.lead) {
                    const lead = await Lead.findById(booking.lead);
                    if (lead) {
                        lead.status = 'New';
                        lead.advancePayment = 0;
                        lead.bookingRef = null;
                        lead.bookingId = '';
                        lead.advanceDate = null;
                        await lead.save();
                    }
                }
                
                // Unlink DRSDuties
                const DRSDuty = require('../models/DRSDuty');
                await DRSDuty.updateMany({ bookingRef: booking._id }, { bookingRef: null, status: 'Pending' });
                
                // Delete the booking itself
                await booking.deleteOne();
            } else {
                // JUST REMOVE PAYMENT FROM BOOKING
                if (tx.type === 'IN') {
                    booking.advancePaid = Math.max(0, (booking.advancePaid || 0) - tx.amount);
                } else {
                    booking.advancePaid = (booking.advancePaid || 0) + tx.amount;
                }
                booking.notes = (booking.notes || '') + `\n[System]: Payment of ${tx.amount} deleted from Bank Book on ${new Date().toLocaleDateString()}.`;
                await booking.save();
            }
        }
    }

    await tx.deleteOne();
    res.json({ message: 'Transaction deleted successfully', currentBalance: bank ? bank.currentBalance : 0 });
});

module.exports = {
    getBankAccounts,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
    getBankTransactions,
    addBankTransaction,
    deleteBankTransaction,
    updateBankTransaction
};
