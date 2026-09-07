import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateBookingConfirmationPDF = (booking, company) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const primaryColor = [245, 158, 11]; // Amber / Gold
    const darkColor = [15, 23, 42];      // Slate 900
    const textMuted = [100, 116, 139];   // Slate 500
    const lightBg = [248, 250, 252];     // Slate 50

    // Top Brand Accent Bar
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 5, 'F');

    // 1. Header Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...darkColor);
    doc.text(company?.name || 'LOGKARO FLEET', 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...textMuted);
    let companyInfo = [];
    if (company?.whatsappNumber) companyInfo.push(`Tel: ${company.whatsappNumber}`);
    if (company?.email) companyInfo.push(`Email: ${company.email}`);
    if (company?.gstNumber) companyInfo.push(`GSTIN: ${company.gstNumber}`);
    if (companyInfo.length > 0) {
        doc.text(companyInfo.join('  |  '), 14, 26);
    }

    // Right side - Booking ID Badge
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(pageWidth - 85, 10, 71, 20, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    doc.text('BOOKING CONFIRMATION', pageWidth - 50, 17, { align: 'center' });
    doc.setFontSize(10.5);
    doc.setTextColor(...darkColor);
    doc.text(booking.bookingId || 'LK-BKG-CONFIRMED', pageWidth - 50, 24, { align: 'center' });

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 33, pageWidth - 14, 33);

    // 2. Info Grid: Guest Details (Left) vs Booking Info (Right)
    const startY = 40;

    // Left Box - Guest Details
    doc.setFillColor(...lightBg);
    doc.roundedRect(14, startY, 86, 32, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.text('GUEST & BILLING DETAILS', 18, startY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...darkColor);
    doc.text(booking.clientName || 'Guest', 18, startY + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...textMuted);
    doc.text(`Mobile: ${booking.mobileNumber || 'N/A'}`, 18, startY + 19);
    if (booking.email) doc.text(`Email: ${booking.email}`, 18, startY + 24);
    if (booking.gstin) doc.text(`GSTIN: ${booking.gstin}`, 18, startY + 29);

    // Right Box - Booking Details
    doc.setFillColor(...lightBg);
    doc.roundedRect(pageWidth - 100, startY, 86, 32, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.text('TRIP COMMERCIEL DETAILS', pageWidth - 96, startY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...textMuted);
    const sDate = booking.travelStartDate ? new Date(booking.travelStartDate).toLocaleDateString('en-IN') : 'TBA';
    const eDate = booking.travelEndDate ? new Date(booking.travelEndDate).toLocaleDateString('en-IN') : 'TBA';
    doc.text(`Travel Dates: ${sDate} to ${eDate}`, pageWidth - 96, startY + 13);
    doc.text(`Vehicle: ${booking.numberOfCars || 1}x ${booking.vehicleType || 'Standard'}`, pageWidth - 96, startY + 19);
    doc.text(`Confirmation Date: ${booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}`, pageWidth - 96, startY + 25);

    // 3. Day-wise Itinerary Table
    const tableHead = [['Day', 'Date', 'Time', 'Pickup Point', 'Duty / Route Details', 'Vehicle']];
    const tableBody = (booking.itinerary || []).map((item, idx) => [
        `Day ${item.dayNo || idx + 1}`,
        item.date ? new Date(item.date).toLocaleDateString('en-IN') : 'TBA',
        item.time || '09:00 AM',
        item.pickupPoint || 'As advised',
        item.duty || item.description || 'Full Day Operations',
        item.vehicleType || booking.vehicleType || 'Committed'
    ]);

    autoTable(doc, {
        startY: startY + 38,
        head: tableHead,
        body: tableBody,
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
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        margin: { left: 14, right: 14 }
    });

    let currentY = (doc.lastAutoTable?.finalY || startY + 50) + 8;

    // If table leaves less than 65mm space on page, add new page
    if (currentY > pageHeight - 65) {
        doc.addPage();
        currentY = 20;
    }

    // 4. Financial Summary Box (Right) & Inclusions/Notes (Left)
    const summaryBoxWidth = 85;
    const summaryBoxX = pageWidth - 14 - summaryBoxWidth;

    // Left side: Inclusions & Notes
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.text('PACKAGE INCLUSIONS & NOTES', 14, currentY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...darkColor);
    const notesText = booking.notes || 'Vehicle, professional chauffeur, and operational fuel as per itinerary.';
    const splitNotes = doc.splitTextToSize(notesText, summaryBoxX - 22);
    doc.text(splitNotes, 14, currentY + 10);

    // Right side: Financial Breakdown Card
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(summaryBoxX, currentY, summaryBoxWidth, 38, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(summaryBoxX, currentY, summaryBoxWidth, 38, 2, 2, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...textMuted);
    doc.text('Total Package Value:', summaryBoxX + 6, currentY + 8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text(`Rs. ${(booking.totalAmount || 0).toLocaleString('en-IN')}`, summaryBoxX + summaryBoxWidth - 6, currentY + 8, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textMuted);
    doc.text(`GST Mode (${booking.gstMode || 'Inclusive'}):`, summaryBoxX + 6, currentY + 15);
    doc.setFont('helvetica', 'bold');
    doc.text(booking.gstAmount ? `Rs. ${booking.gstAmount.toLocaleString('en-IN')}` : 'Included', summaryBoxX + summaryBoxWidth - 6, currentY + 15, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(22, 101, 52); // Green
    doc.text('Advance Received:', summaryBoxX + 6, currentY + 22);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${(booking.advancePaid || 0).toLocaleString('en-IN')}`, summaryBoxX + summaryBoxWidth - 6, currentY + 22, { align: 'right' });

    doc.setDrawColor(203, 213, 225);
    doc.line(summaryBoxX + 4, currentY + 26, summaryBoxX + summaryBoxWidth - 4, currentY + 26);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(185, 28, 28); // Red
    doc.text('Balance Payable:', summaryBoxX + 6, currentY + 33);
    doc.text(`Rs. ${(booking.balanceDue || 0).toLocaleString('en-IN')}`, summaryBoxX + summaryBoxWidth - 6, currentY + 33, { align: 'right' });

    currentY += 46;

    // 5. Terms & Conditions
    if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryColor);
    doc.text('IMPORTANT TERMS & OPERATIONAL CONDITIONS', 14, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);

    const defaultTerms = (booking.termsAndConditions && booking.termsAndConditions.length > 0)
        ? booking.termsAndConditions
        : [
            'All rates are subject to vehicle availability at the time of final confirmation.',
            'Toll, State Border Tax, and Parking charges will be on actuals unless explicitly specified as included.',
            'AC will be switched off in hills / ghats or when vehicle is parked/stationary.',
            'Night driving charge (10:00 PM to 06:00 AM) applies as per company standard tariff.'
        ];

    let termY = currentY + 5;
    defaultTerms.forEach((term, i) => {
        const split = doc.splitTextToSize(`${i + 1}. ${term}`, pageWidth - 28);
        doc.text(split, 14, termY);
        termY += split.length * 3.5;
    });

    // 6. Footer Block
    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(0, pageHeight - 12, pageWidth, pageHeight - 12);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('This is an official computer-generated Booking Confirmation issued by LogKaro Fleet Operations.', pageWidth / 2, pageHeight - 5, { align: 'center' });

    // Save PDF
    const filename = `${(booking.clientName || 'Guest').replace(/\s+/g, '_')}_Booking_Confirmation_${booking.bookingId || 'LK'}.pdf`;
    doc.save(filename);
};
