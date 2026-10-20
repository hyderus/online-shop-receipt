# 🛍️ ShopReceipt Pro — Virtual Receipt & QR Scanner System

> A modern, responsive web application for online sellers to record sold products, track customers, generate authentic **virtual receipts with scannable QR codes**, and verify purchases in real-time.

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Status](https://img.shields.io/badge/Status-Production--Ready-success.svg)
![Stack](https://img.shields.io/badge/Tech-HTML5%20%7C%20TailwindCSS%20%7C%20Vanilla%20JS-indigo.svg)

---

## 🌟 Key Features

### 1. 📝 Virtual Receipt & Sale Generator
- **Customer Profiling ("Sold to Whom"):** Capture customer name, phone number, WhatsApp contact, shipping/delivery address, and email.
- **Multi-Product Line Items:** Add single or multiple products per transaction, including Product Title, SKU / Serial number, Quantity, and Unit Price.
- **Smart Financial Calculator:** Automatically computes Subtotals, Discounts, configurable Tax/VAT %, Shipping fees, and Grand Total.
- **Payment & Warranty Tracking:** Record payment methods (*Cash, Cards, Wire Transfer, COD, Mobile Wallet*), payment statuses (*Paid, Pending, Partial*), and custom warranty/return policy details.

### 2. 📱 Scannable QR Code Verification
- **Automatic High-Res QR Code:** Every virtual receipt dynamically generates a verified QR code encoding a secure direct receipt link.
- **Universal Mobile Compatibility:** Any smartphone camera app or built-in scanner can read the QR code and immediately open the official digital receipt.
- **Downloadable QR Badge:** Download the QR code as a `.png` image to print onto physical product labels, packages, or packing slips.

### 3. 📷 Built-In Real-time QR Scanner
- **Live Camera Scanner:** Use your webcam or smartphone camera with an integrated scanning laser to read receipt codes directly from your browser.
- **Image File QR Scanner:** Upload screenshots, saved photos, or customer-provided images to decode QR codes instantly.
- **Manual Verification Fallback:** Look up any order by typing the Receipt ID (e.g. `REC-2026-8491`).

### 4. 💬 One-Click WhatsApp Receipt Dispatch
- Instantly share digital receipts with your buyers over WhatsApp with pre-formatted itemization, total, and verification link.

### 5. 🖨️ Printable Paper-Style Receipt
- Clean, professional invoice styling designed for thermal printers or standard A4/Letter PDF printing via browser (`Ctrl + P`).

### 6. 📊 Seller Analytics & Database Management
- **Dashboard Overview:** Monitor Total Revenue, Issued Receipts, Today's Sales, and Pending/COD orders.
- **Data Portability:** Export your complete sales book to **CSV (Excel / Google Sheets)** or create and restore full **JSON Backups**.
- **Local Persistence:** Works completely offline and persists data securely in `localStorage`.

---

## 🚀 Live Demo & Getting Started

### Option 1: Run Locally (Instant, No Installation Required!)
Simply double-click `index.html` in your file explorer to open it in any modern web browser (Chrome, Edge, Safari, Firefox).

Or serve it with any local HTTP server:
```bash
# Using Python (if available):
python -m http.server 8000

# Using Node.js (npx serve):
npx serve .
```

### Option 2: Deploy to GitHub Pages (Free Hosting)
1. Push this repository to GitHub.
2. In your repository on GitHub, navigate to **Settings** > **Pages**.
3. Under **Branch**, select `main` and root `/` folder, then click **Save**.
4. Your website will be live in ~1 minute at `https://<your-username>.github.io/<repo-name>/`!

---

## 📁 Project Architecture

```
online shop/
├── index.html       # Single-page application structure and UI modals
├── app.js           # Core business logic, QR generator/scanner, state & storage
├── style.css        # Responsive styling, laser animation, and print media rules
└── README.md        # Documentation and deployment guide
```

---

## 🔒 Privacy & Security
All receipt data is processed and stored client-side in your browser's `localStorage`. No customer data is sent to external servers unless you configure custom backend hooks.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
