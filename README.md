# Data Sweep

**Data Sweep** is a simple, user-friendly web application designed to help users clean and organize messy CSV files without needing any technical expertise. It offers a clean interface for uploading, previewing, cleaning, and downloading CSV files — streamlining the data preparation process for students, educators, researchers, business owners, and entry-level data analysts.

---

## 🔍 Overview

Many users often struggle with disorganized, inconsistent, or error-prone datasets in CSV format. **Data Sweep** addresses this by:
- Automatically detecting and fixing common data issues such as duplicates, missing values, inconsistent formatting, and more.
- Allowing users to preview and apply data cleaning rules through an intuitive UI.
- Supporting fast and secure file processing entirely in-memory for privacy.

---

## 🎯 Features

- ✅ Upload and validate CSV files (only `.csv`)
- 🔍 Preview CSV content in an interactive table
- 🧹 Perform automatic cleaning:
  - Remove duplicate rows
  - Handle missing values (fill or delete)
  - Standardize text case and date formats
  - Remove empty rows and columns
- 💾 Download cleaned CSV files
- 🔒 Temporary in-memory storage only (no data retained)

---

## 👥 Target Users

- **Students** – Clean data for academic projects or research.
- **Researchers** – Quickly organize datasets for analysis.
- **Entry-Level Data Analysts** – Avoid manual scripting with automated cleaning tools.
- **Educators** – Prepare clean datasets for educational purposes.

---

## 🖥️ Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Python, Flask
- **Libraries**: Pandas for data processing
- **Browser Support**: Chrome, Firefox, Safari, Brave, Opera

---

## ⚙️ Functional Requirements

- Accept only CSV files; reject others with clear error messages.
- Dynamic preview of file content and real-time updates as cleaning operations are applied.
- User-controlled cleaning options:
  - Remove duplicates
  - Fill/delete missing values
  - Standardize text (UPPERCASE/lowercase)
  - Normalize date formats
  - Remove empty rows/columns
- Download cleaned data in CSV format.
- Automatically delete data post-processing for privacy.

---

## ⚡ Non-Functional Requirements

- Handle up to **10,000 rows in under 10 seconds**
- Max upload file size: **300 MB**
- Support up to **50 concurrent users** with minimal performance impact
- Ensure **modular, well-documented code**
- Deliver a **consistent, modern, and responsive UI**

---

## 🔒 Security & Privacy

- Files are stored **temporarily in memory** only.
- **No user data is stored permanently**.
- **All data is cleared** once the session ends or the file is downloaded.
- All communication should use secure HTTPS (recommended in production).

---

## 📌 Limitations

- Only supports **CSV files**
- No support for `.xlsx`, `.json`, or other formats
- Does **not perform advanced analytics**, normalization, or predictive modeling
- No login system or user accounts
- Users must define their own cleaning preferences

