import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper: Convert number to Indian currency words
const numberToWordsIndian = (num) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n) => {
        if ((n = n.toString()).length > 9) return 'overflow';
        const nArr = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!nArr) return '';
        let str = '';
        str += (Number(nArr[1]) !== 0) ? (a[Number(nArr[1])] || `${b[nArr[1][0]]} ${a[nArr[1][1]]}`) + 'Crore ' : '';
        str += (Number(nArr[2]) !== 0) ? (a[Number(nArr[2])] || `${b[nArr[2][0]]} ${a[nArr[2][1]]}`) + 'Lakh ' : '';
        str += (Number(nArr[3]) !== 0) ? (a[Number(nArr[3])] || `${b[nArr[3][0]]} ${a[nArr[3][1]]}`) + 'Thousand ' : '';
        str += (Number(nArr[4]) !== 0) ? (a[Number(nArr[4])] || `${b[nArr[4][0]]} ${a[nArr[4][1]]}`) + 'Hundred ' : '';
        str += (Number(nArr[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(nArr[5])] || `${b[nArr[5][0]]} ${a[nArr[5][1]]}`) : '';
        return str.trim();
    };

    const integerPart = Math.floor(Math.abs(num));
    const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

    let result = inWords(integerPart);
    if (!result) result = 'Zero';

    let paiseResult = '';
    if (decimalPart > 0) {
        paiseResult = ` and ${inWords(decimalPart)} Paise`;
    }

    return `Rupees ${result}${paiseResult} Only`;
};

export const generateTaxInvoicePDF = (invoice, company) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const brandGold = [217, 119, 6];     // Amber 600
    const darkSlate = [15, 23, 42];      // Slate 900
    const textMuted = [100, 116, 139];   // Slate 500
    const lightBg = [248, 250, 252];     // Slate 50
    const borderGray = [226, 232, 240];  // Slate 200

    // Top Accent Stripe
    doc.setFillColor(...brandGold);
    doc.rect(0, 0, pageWidth, 5, 'F');

    // 1. Header Section: Company Profile (Left) & Invoice Title (Right)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...darkSlate);
    const compName = company?.name || 'LOGKARO ENTERPRISE FLEET';
    doc.text(compName, 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...textMuted);
    let compLines = [];
    compLines.push('Managed by Handmath Technologies India Private Limited');
    if (company?.whatsappNumber) compLines.push(`Tel / WhatsApp: +91 ${company.whatsappNumber}`);
    if (company?.email) compLines.push(`Email: ${company.email}`);
    if (company?.gstNumber) compLines.push(`GSTIN: ${company.gstNumber}`);

    let compY = 23;
    compLines.forEach(line => {
        doc.text(line, 14, compY);
        compY += 4.5;
    });

    // Invoice Title & Meta Card (Right)
    const metaCardWidth = 76;
    const metaCardX = pageWidth - 14 - metaCardWidth;
    doc.setFillColor(...lightBg);
    doc.roundedRect(metaCardX, 10, metaCardWidth, 36, 2, 2, 'F');
    doc.setDrawColor(...borderGray);
    doc.roundedRect(metaCardX, 10, metaCardWidth, 36, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...brandGold);
    doc.text('TAX INVOICE', metaCardX + metaCardWidth / 2, 17, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...darkSlate);
    doc.text(invoice.invoiceNumber || 'LK-INV-XXXXX', metaCardX + metaCardWidth / 2, 23, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    const invDateStr = invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
    const dueDateStr = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'Immediate';
    doc.text(`Invoice Date: ${invDateStr}`, metaCardX + 5, 29);
    doc.text(`Due Date: ${dueDateStr}`, metaCardX + 5, 34);
    doc.text(`Ref / Booking ID: ${invoice.bookingId || 'Direct Service'}`, metaCardX + 5, 39);
    if (invoice.gstMode === 'RCM') {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(185, 28, 28);
        doc.text('REVERSE CHARGE: YES', metaCardX + metaCardWidth - 5, 39, { align: 'right' });
    }

    // Divider
    doc.setDrawColor(...borderGray);
    doc.setLineWidth(0.5);
    doc.line(14, 49, pageWidth - 14, 49);

    // 2. Client & Dispatch Info (Billed To vs Shipped/Place of Supply)
    const infoY = 54;
    const cardWidth = 88;

    // Left Box: Billed To
    doc.setFillColor(...lightBg);
    doc.roundedRect(14, infoY, cardWidth, 34, 2, 2, 'F');
    doc.setDrawColor(...borderGray);
    doc.roundedRect(14, infoY, cardWidth, 34, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...brandGold);
    doc.text('BILLED TO (RECEIVER)', 18, infoY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...darkSlate);
    const clientName = invoice.billTo?.companyName 
        ? `${invoice.billTo.companyName} (${invoice.billTo.name})` 
        : (invoice.billTo?.name || 'Guest / Client');
    doc.text(clientName.substring(0, 36), 18, infoY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text(`Mobile: +91 ${invoice.billTo?.mobile || 'N/A'}`, 18, infoY + 17);
    if (invoice.billTo?.email) doc.text(`Email: ${invoice.billTo.email}`, 18, infoY + 22);
    if (invoice.billTo?.address) doc.text(`Address: ${invoice.billTo.address.substring(0, 42)}`, 18, infoY + 27);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text(`GSTIN / UIN: ${invoice.billTo?.gstin || 'Unregistered'}`, 18, infoY + 32);

    // Right Box: Supply & Transport Meta
    const rightCardX = pageWidth - 14 - cardWidth;
    doc.setFillColor(...lightBg);
    doc.roundedRect(rightCardX, infoY, cardWidth, 34, 2, 2, 'F');
    doc.setDrawColor(...borderGray);
    doc.roundedRect(rightCardX, infoY, cardWidth, 34, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...brandGold);
    doc.text('SERVICE & SUPPLY DETAILS', rightCardX + 5, infoY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text(`Place of Supply: ${invoice.billTo?.placeOfSupply || 'Rajasthan (08)'}`, rightCardX + 5, infoY + 13);
    doc.text(`SAC Code: ${invoice.sacCode || '996601'} (Passenger Transport)`, rightCardX + 5, infoY + 19);
    doc.text(`Sales Category: ${invoice.salesLedger || 'Taxi Sales'}`, rightCardX + 5, infoY + 25);
    doc.text(`Payment Mode: Bank Transfer / UPI / Card`, rightCardX + 5, infoY + 31);

    // 3. Line Items Table (PRD Section 14)
    const itemsTableHead = [['#', 'Description of Services', 'SAC', 'Qty', 'Rate (₹)', 'Taxable Value (₹)']];
    const itemsTableBody = (invoice.items || []).map((item, index) => [
        String(index + 1),
        item.description || 'Passenger Motor Vehicle Rental',
        item.sacCode || invoice.sacCode || '996601',
        String(item.quantity || 1),
        Number(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    ]);

    autoTable(doc, {
        startY: infoY + 38,
        head: itemsTableHead,
        body: itemsTableBody,
        theme: 'grid',
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5
        },
        styles: {
            fontSize: 8,
            cellPadding: 3,
            textColor: [51, 65, 85]
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 'auto' },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'center', cellWidth: 16 },
            4: { halign: 'right', cellWidth: 28 },
            5: { halign: 'right', cellWidth: 32 }
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        margin: { left: 14, right: 14 }
    });

    let currentY = (doc.lastAutoTable?.finalY || infoY + 70) + 6;

    // Check page overflow
    if (currentY > pageHeight - 95) {
        doc.addPage();
        currentY = 20;
    }

    // 4. Tax Breakdown Table & Financial Summary Side-by-Side
    const leftBlockWidth = 96;
    const summaryCardWidth = 78;
    const summaryCardX = pageWidth - 14 - summaryCardWidth;

    // Left Side: GST Breakdown Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...darkSlate);
    doc.text('TAX BREAKDOWN DETAILS', 14, currentY + 4);

    let taxHead = [];
    let taxBody = [];
    if (invoice.isInterState) {
        taxHead = [['Taxable Val', 'IGST %', 'IGST Amt', 'Total Tax']];
        taxBody = [[
            `Rs. ${(invoice.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            `${invoice.igstRate || invoice.gstRate || 5}%`,
            `Rs. ${(invoice.igstAmount || invoice.totalTaxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            `Rs. ${(invoice.totalTaxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        ]];
    } else {
        taxHead = [['Taxable Val', 'CGST %', 'CGST Amt', 'SGST %', 'SGST Amt']];
        taxBody = [[
            `Rs. ${(invoice.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            `${invoice.cgstRate || 2.5}%`,
            `Rs. ${(invoice.cgstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            `${invoice.sgstRate || 2.5}%`,
            `Rs. ${(invoice.sgstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        ]];
    }

    autoTable(doc, {
        startY: currentY + 6,
        head: taxHead,
        body: taxBody,
        theme: 'plain',
        tableWidth: leftBlockWidth,
        headStyles: {
            fillColor: [241, 245, 249],
            textColor: [71, 85, 105],
            fontStyle: 'bold',
            fontSize: 7.5
        },
        styles: {
            fontSize: 7.5,
            cellPadding: 2,
            textColor: [51, 65, 85],
            lineWidth: 0.1,
            lineColor: [226, 232, 240]
        },
        margin: { left: 14 }
    });

    const taxTableEndY = doc.lastAutoTable?.finalY || currentY + 22;

    // Left Side: Bank Account & Payment Instructions
    const bankY = taxTableEndY + 5;
    doc.setFillColor(...lightBg);
    doc.roundedRect(14, bankY, leftBlockWidth, 24, 2, 2, 'F');
    doc.setDrawColor(...borderGray);
    doc.roundedRect(14, bankY, leftBlockWidth, 24, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...brandGold);
    doc.text('BANK TRANSFER & PAYMENT DETAILS', 18, bankY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...darkSlate);
    const bankInfo = invoice.paymentDetails || {};
    doc.text(`Bank Name: ${bankInfo.bankName || 'HDFC Bank Ltd'}`, 18, bankY + 10);
    doc.text(`Account No: ${bankInfo.accountNumber || '50200067891234'}`, 18, bankY + 14);
    doc.text(`IFSC Code: ${bankInfo.ifscCode || 'HDFC0001234'}  |  Branch: ${bankInfo.branchName || 'Jaipur'}`, 18, bankY + 18);
    doc.text(`UPI VPA: ${bankInfo.upiId || 'logkaro@hdfcbank'}`, 18, bankY + 22);

    // Right Side: Grand Financial Calculation Box
    doc.setFillColor(...lightBg);
    doc.roundedRect(summaryCardX, currentY, summaryCardWidth, 52, 2, 2, 'F');
    doc.setDrawColor(...borderGray);
    doc.roundedRect(summaryCardX, currentY, summaryCardWidth, 52, 2, 2, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text('Taxable Value:', summaryCardX + 5, currentY + 8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text(`Rs. ${(invoice.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryCardX + summaryCardWidth - 5, currentY + 8, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textMuted);
    doc.text(`Total GST (${invoice.gstRate || 5}%):`, summaryCardX + 5, currentY + 16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text(`Rs. ${(invoice.totalTaxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryCardX + summaryCardWidth - 5, currentY + 16, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Total:', summaryCardX + 5, currentY + 24);
    doc.text(`Rs. ${(invoice.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryCardX + summaryCardWidth - 5, currentY + 24, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(22, 101, 52); // Green
    doc.text('Less: Advance Adjusted:', summaryCardX + 5, currentY + 32);
    doc.setFont('helvetica', 'bold');
    doc.text(`(-) Rs. ${(invoice.advanceAdjusted || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryCardX + summaryCardWidth - 5, currentY + 32, { align: 'right' });

    doc.setDrawColor(203, 213, 225);
    doc.line(summaryCardX + 5, currentY + 36, summaryCardX + summaryCardWidth - 5, currentY + 36);

    // Balance Due Accent Row
    doc.setFillColor(254, 243, 199); // Amber 100
    doc.roundedRect(summaryCardX + 3, currentY + 39, summaryCardWidth - 6, 10, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9); // Amber 700
    doc.text('BALANCE DUE:', summaryCardX + 6, currentY + 45.5);
    doc.setFontSize(10);
    doc.text(`Rs. ${(invoice.netPayable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryCardX + summaryCardWidth - 6, currentY + 45.5, { align: 'right' });

    // Amount in Words
    const wordsY = Math.max(bankY + 28, currentY + 56);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...darkSlate);
    doc.text('Amount in Words:', 14, wordsY);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    const wordsText = numberToWordsIndian(invoice.netPayable || invoice.totalAmount || 0);
    doc.text(wordsText, 45, wordsY);

    // 5. Terms & Conditions & Signatory Box
    const termsY = wordsY + 6;

    // Left: Terms
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...brandGold);
    doc.text('TERMS & CONDITIONS:', 14, termsY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    const terms = invoice.termsAndConditions?.length ? invoice.termsAndConditions : [
        '1. All disputes are subject to local jurisdiction only.',
        '2. Payment is due strictly as per terms. Overdue interest @18% p.a. may apply.',
        '3. Toll, parking, state border entry and inter-state permit charges are extra if not specified.',
        '4. GST input credit is available subject to statutory conditions as per GST Rules.'
    ];

    let tY = termsY + 8;
    terms.slice(0, 4).forEach((term, idx) => {
        doc.text(term, 14, tY);
        tY += 3.8;
    });

    // Right: Authorized Signatory
    const signX = pageWidth - 14 - 60;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...darkSlate);
    doc.text(`For ${compName}`, signX + 30, termsY + 6, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...darkSlate);
    doc.text('Authorized Signatory', signX + 30, termsY + 22, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    doc.text('(Digitally Generated Invoice)', signX + 30, termsY + 26, { align: 'center' });

    // Footer
    doc.setDrawColor(...borderGray);
    doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    doc.text('LogKaro Enterprise Fleet Management | GST Tax Invoice Generated Automatically', pageWidth / 2, pageHeight - 6, { align: 'center' });

    // Save/Download
    const fileName = `${invoice.invoiceNumber || 'Tax-Invoice'}_${(invoice.billTo?.name || 'Guest').replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
};
