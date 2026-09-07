# Taxi Fleet CRM API

## Setup
1. Install dependencies: `npm install`
2. Configure `.env` with your Cloudinary and MongoDB details.
3. Run seed script to create companies and admin: `npm run seed`
4. Start server: `npm run dev`

## Roles
- **Admin**: Can manage all companies, drivers, and vehicles.
- **Driver**: Can only see their assigned company and vehicle.

## API Endpoints

### Auth
- `POST /api/auth/login`: Login with (mobile, password)
- `GET /api/auth/profile`: Get current user info

### Admin (Requires Admin JWT)
- `POST /api/admin/drivers`: Create driver (name, mobile, password, companyId)
- `POST /api/admin/vehicles`: Create vehicle (carNumber, model, permitType, companyId)
- `POST /api/admin/assign`: Assign vehicle to driver (driverId, vehicleId)
- `PATCH /api/admin/drivers/:id/status`: Block/Unblock driver
- `GET /api/admin/dashboard/:companyId`: Get dashboard stats for a company

### Driver (Requires Driver JWT)
- `GET /api/driver/dashboard`: Get assigned vehicle and today's status
- `POST /api/driver/punch-in`: Morning punch-in (km, photo [file], latitude, longitude, address)
- `POST /api/driver/punch-out`: Night punch-out (km, photo [file], latitude, longitude, address)

## Logic Features
- **KM Calculation**: System automatically calculates `Total KM = PunchOut KM - PunchIn KM`.
- **Validation**: Prevents double punch-in/out per day.
- **Camera Only**: Frontend should restrict gallery access. Backend validates that a photo is present.
- **Isolation**: Data is filtered by `companyId`.

## LogKaro Enterprise Modules (Updated: 2026-09-07)
- **Leads Management**: Auto-numbered quotations (LK-QT-xxxx), direct WhatsApp share, quotation PDF.
- **Bookings Engine**: Auto-booking ID (LK-BK-xxxx), advance tracking, passenger details, booking confirmation PDF.
- **Daily Running Sheets (DRS)**: Auto DRS ID (LK-DRS-xxxx), start/end KM, toll/parking, driver & fuel advances, WhatsApp duty slip.
- **Client Ledgers & Cashbooks**: Trip-wise debit/credit, transaction statements, running balance.
- **Tax Invoices**: SAC code 996601, GST calculations (CGST+SGST / IGST), branded PDF with QR code & bank details.
