# 📊 QA & Security Test Execution Report — Run #02

**Date**: 10 Agustus 2026  
**Environment**: Local Node.js + NeonDB PostgreSQL (Live Connection)  
**Target App**: Express.js API (`multimediamia-be` - Branch `QA-TEST/Liaurentino`)  
**Test Framework**: Vitest v4 + Supertest v7  

---

## 📈 Summary Matrix

| Metric | Details |
|---|---|
| **Total Test Suites** | 5 files |
| **Total Test Cases** | 128 tests |
| **Passed Tests** | **122 tests** (95.3%) |
| **Failed Tests** | **6 tests** (4.7%) |
| **Test Duration** | ~24.96 seconds |
| **Database Connection** | **NeonDB Cloud** (`neondb_owner@ep-shiny-flower...`) |

---

## 📂 Test Suite Breakdown

| Suite File | Status | Passed | Failed | Focus Area |
|---|---|---|---|---|
| `01_auth.test.js` | ⚠️ Partially Passed | 27 | 2 | Authentication, Password Hashing, OTP Verification |
| `02_authorization.test.js` | ✅ **PASSED** | 28 | 0 | BOLA (IDOR), BFLA, JWT Verification & Role Access |
| `03_input_validation.test.js` | ⚠️ Partially Passed | 45 | 2 | SQL Injection, XSS, Payload Sanitization, BVA |
| `04_business_logic.test.js` | ✅ **PASSED** | 18 | 0 | Race Conditions, OTP Flow, Workflow Transitions |
| `05_api_config_errhandling.test.js` | ⚠️ Partially Passed | 4 | 2 | Pagination Abuse, Header Injection, Error Contract |

---

## 🚨 Failed Test Cases Breakdown (6 Defects Identified)

> *Catatan: Untuk detail langkah perbaikan teknis dan code snippet mitigasi, silakan rujuk ke [02_mitigations.md](../mitigations/02_mitigations.md).*

### 1. `TC-R09` — Whitespace-only Password Accepted
- **File**: `qa_testing/tests/01_auth.test.js`
- **Severity**: Medium (Security / Input Validation)
- **Expected**: HTTP 422 Unprocessable Entity (Whitespace string `"      "` should be rejected).
- **Actual**: HTTP 201 Created (Backend allowed account creation with empty whitespace password).

### 2. `TC-O04` — Special Characters in OTP Error Code
- **File**: `qa_testing/tests/01_auth.test.js`
- **Severity**: Low (Contract Consistency)
- **Expected**: HTTP 422 Unprocessable Entity.
- **Actual**: HTTP 400 Bad Request.

### 3. `TC-XSS` — XSS Test Timeout
- **File**: `qa_testing/tests/03_input_validation.test.js`
- **Severity**: Low (Test Timeout)
- **Expected**: Response returned within timeout.
- **Actual**: Timed out due to SMTP attempt fallback during user registration in XSS loop.

### 4. `TC-REG-INP02` — Missing `category_id` Registration Error Code
- **File**: `qa_testing/tests/03_input_validation.test.js`
- **Severity**: Low (Contract Consistency)
- **Expected**: HTTP 422 Unprocessable Entity.
- **Actual**: HTTP 404 Not Found.

### 5. `TC-PAG01` — Pagination `page=0` Internal Server Error
- **File**: `qa_testing/tests/05_api_config_errhandling.test.js`
- **Severity**: Medium (Robustness / Error Handling)
- **Expected**: HTTP 400/422 Bad Request or HTTP 200 dengan default page=1.
- **Actual**: HTTP 500 Internal Server Error (SQL query offset calculation overflow/negative).

### 6. `TC-PAG02` — Pagination Negative Page Internal Server Error
- **File**: `qa_testing/tests/05_api_config_errhandling.test.js`
- **Severity**: Medium (Robustness / Error Handling)
- **Expected**: HTTP 400/422 Bad Request.
- **Actual**: HTTP 500 Internal Server Error.

---

## ✅ Retested & Verified Defect Fixes (Passed in Run #02)
- ✅ **BFLA & BOLA Access Control**: Seluruh endpoint terproteksi (`/registrations`, `/submissions`, `/auth/juri`) menolak request unauthenticated dengan status 401 dan role tidak sah dengan status 403.
- ✅ **SQL Injection**: 10+ skenario payload injection SQL (`' OR '1'='1`, `'; DROP TABLE users; --`, dll) terbukti aman dan tidak menyebabkan HTTP 500 Server Error.
- ✅ **NeonDB Integration**: Seluruh operasi CRUD pada schema Drizzle berjalan sempurna tanpa error migrasi.
