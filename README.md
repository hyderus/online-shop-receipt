# 📱 SWAPEE — Virtual Receipt & QR Verification Portal

> Official digital receipt and point-of-sale verification web application for **SWAPEE** (SINCE 2002), 4 South Clerk Street, Edinburgh EH8 9JE, UK.

![SWAPEE Status](https://img.shields.io/badge/Store-SWAPEE%20(Edinburgh)-black.svg)
![VAT Registered](https://img.shields.io/badge/VAT%20No-GB%20693%208235%2095-blue.svg)
![Company](https://img.shields.io/badge/Company%20No-SC175148-indigo.svg)
![License](https://img.shields.io/badge/License-MIT-success.svg)

---

## 🏬 Official Store Credentials
- **Store Name:** SWAPEE (SINCE 2002)
- **Address:** 4 South Clerk Street, Edinburgh EH8 9JE, UK
- **Phone:** +44 131 662 9955
- **VAT Registration:** GB 693 8235 95
- **Company Registration:** SC175148

---

## 🌟 Key Capabilities

### 1. 🧾 Authentic POS Thermal Virtual Receipts
- Styled to exactly replicate the official SWAPEE paper receipt with:
  - Vector circular emblem logo.
  - `-INVOICE-`, `RECIEPT #`, `DATE (DD/MM/YYYY)`, and `CASHIER` fields.
  - `-CUSTOMER-` section with `CUSTOMER NO`, `CUSTOMER ID`, and `ADDRESS`.
  - `*ITEMS*` breakdown supporting **IMEI 1**, **IMEI 2**, **S/N (Serial Number)**, and **SKU** per mobile/gadget.
  - `*TRANSACTION*` record with Card Account (`****3471`), `AUTH CODE`, `ENTRY METHOD (CHIP READ)`, and `AID`.
  - `-WARRANTY POLICY-` clause and closing greeting.

### 2. 📲 Real-Time QR Code Verification
- Dynamic QR code generated for every invoice.
- Scanning the QR code with any smartphone camera instantly loads and verifies the authentic receipt online.
- One-click **Download QR Badge (.PNG)** for printing onto packaging or warranty cards.

### 3. 📷 Camera & Image QR Scanner
- Integrated camera viewfinder with laser scan animation to verify customer receipts on-the-spot.
- Support for uploading customer receipt images or screenshots.
- Instant search by Receipt ID (e.g. `UC664413`).

### 4. 💬 Instant WhatsApp Dispatch & Print
- Direct WhatsApp dispatch pre-filling receipt breakdown, totals, and verified link.
- Thermal printer and A4/Letter PDF print ready.

---

## 🚀 Live Web App

* **Live URL:** [https://hyderus.github.io/online-shop-receipt/](https://hyderus.github.io/online-shop-receipt/)
* **Repository:** [https://github.com/hyderus/online-shop-receipt](https://github.com/hyderus/online-shop-receipt)

---

## 📁 Repository Structure

```
online shop/
├── logo.svg         # Crisp SWAPEE vector badge logo
├── index.html       # Web application UI, thermal invoice modal, & scanner
├── app.js           # SWAPEE state engine, QR generation/scan, and sample data
├── style.css        # Thermal print styles, asterisks dividers, and scanner laser
├── README.md        # Documentation and store credentials
└── LICENSE          # MIT License
```
