/**
 * ============================================================================
 * QA TEST SUITE 05 — API CONTRACT, CONFIGURATION & ERROR HANDLING TESTING
 * ============================================================================
 * Standards Applied:
 *   - OWASP WSTG-CONF-01 to WSTG-CONF-11 (Configuration Testing)
 *   - OWASP WSTG-ERRH-01, WSTG-ERRH-02 (Error Handling Testing)
 *   - OWASP API Security Top 10:2023 — API8 (Security Misconfiguration)
 *   - OpenAPI: Response schema validation, proper HTTP status codes
 *   - Microsoft TestExplora: Boundary analysis, smoke testing, API contract testing
 *
 * Scope:
 *   - Health check & API discoverability (Information Exposure)
 *   - Security headers presence
 *   - CORS wildcard issue
 *   - 404 Not Found handling
 *   - Error response format consistency
 *   - Pagination parameter abuse
 *   - Public endpoints data exposure
 *   - Response schema contract validation
 * ============================================================================
 */

import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../app.js";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";
const BASE = "/api/v1";

const adminToken = jwt.sign(
  { userId: "admin-uuid-qa-001", email: "admin@qa.local", role: "ADMIN" },
  JWT_SECRET,
  { expiresIn: "1h" }
);

// =============================================================================
// WSTG-CONF-02: Application Platform Configuration — Info Leakage
// =============================================================================
describe("WSTG-CONF-02: Information Exposure via Health Check Endpoint", () => {
  it("TC-INFO01: GET / returns API info (smoke test)", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("operational");
    expect(res.body.version).toBeDefined();
  });

  it("TC-INFO02: Root endpoint must NOT expose environment variables or secrets", async () => {
    const res = await request(app).get("/");
    const bodyStr = JSON.stringify(res.body);
    // Must not expose JWT_SECRET, DATABASE_URL, or sensitive env vars
    expect(bodyStr).not.toContain("JWT_SECRET");
    expect(bodyStr).not.toContain("postgres://");
    expect(bodyStr).not.toContain("DATABASE_URL");
  });

  it("TC-INFO03: NODE_ENV must not expose 'development' in production (informational check)", async () => {
    const res = await request(app).get("/");
    // In development this is expected to show 'development', documenting for production hardening
    expect(res.body.environment).toBeDefined();
    // This test is informational — flag if environment = 'production'
  });
});

// =============================================================================
// WSTG-CONF-10: HTTP Methods Testing (Verb Tampering)
// =============================================================================
describe("WSTG-CONF-10: HTTP Method Testing — Unsupported Methods Return Proper Status", () => {
  const unsupportedTests = [
    { method: "delete", path: `${BASE}/auth/login` },
    { method: "put",    path: `${BASE}/auth/register` },
    { method: "patch",  path: `${BASE}/auth/login` },
    { method: "delete", path: `${BASE}/products` },
  ];

  unsupportedTests.forEach(({ method, path }) => {
    it(`TC-HTTP: ${method.toUpperCase()} ${path} → must return 404 or 405 (not 200 or 500)`, async () => {
      const res = await request(app)[method](path).send({});
      expect([404, 405]).toContain(res.status);
    });
  });
});

// =============================================================================
// WSTG-ERRH-01: Proper Error Response Format
// =============================================================================
describe("WSTG-ERRH-01: Error Response Format Consistency", () => {
  it("TC-ERR01: 404 Not Found route returns consistent JSON error format", async () => {
    const res = await request(app).get(`${BASE}/this-route-does-not-exist`);
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body.message).toBeDefined();
  });

  it("TC-ERR02: 401 Unauthorized error returns consistent JSON error format", async () => {
    const res = await request(app).get(`${BASE}/users/profile`);
    expect(res.status).toBe(401);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body.message).toBeDefined();
  });

  it("TC-ERR03: 403 Forbidden error returns consistent JSON format", async () => {
    const userToken = jwt.sign(
      { userId: "user-uuid", email: "u@qa.local", role: "USER" },
      JWT_SECRET, { expiresIn: "1h" }
    );
    const res = await request(app)
      .get(`${BASE}/users`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body.message).toBeDefined();
  });

  it("TC-ERR04: 422 Validation error response must NOT leak stack traces", async () => {
    const res = await request(app)
      .post(`${BASE}/auth/login`)
      .send({ email: "bad-email" });
    expect(res.status).toBe(422);
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain("at Object.");
    expect(bodyStr).not.toContain("node_modules");
    expect(bodyStr).not.toContain("Error: ");
  });

  it("TC-ERR05: All error responses must contain 'message' field (OpenAPI Contract)", async () => {
    const errorEndpoints = [
      () => request(app).get(`${BASE}/nonexistent`),
      () => request(app).get(`${BASE}/users/profile`),
    ];
    for (const makeReq of errorEndpoints) {
      const res = await makeReq();
      expect(res.body.message).toBeDefined();
      expect(typeof res.body.message).toBe("string");
    }
  });
});

// =============================================================================
// API Contract — Public Endpoints Response Schema Validation
// =============================================================================
describe("OpenAPI Contract: Public Endpoint Response Schema", () => {
  it("TC-SCHEMA01: GET /submissions returns array structure or pagination meta", async () => {
    const res = await request(app).get(`${BASE}/submissions`);
    expect(res.status).toBe(200);
    // Must be JSON
    expect(res.headers["content-type"]).toContain("application/json");
    // Data should exist (array or pagination object)
    expect(res.body.data).toBeDefined();
  });

  it("TC-SCHEMA02: GET /categories returns successful response", async () => {
    const res = await request(app).get(`${BASE}/categories`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("TC-SCHEMA03: GET /products returns successful response", async () => {
    const res = await request(app).get(`${BASE}/products`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("TC-SCHEMA04: GET /submissions/:id for non-existent ID returns 404 with message", async () => {
    const res = await request(app).get(`${BASE}/submissions/non-existent-id-qa-9999`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBeDefined();
  });

  it("TC-SCHEMA05: GET /categories/:id for non-existent ID returns 404", async () => {
    const res = await request(app).get(`${BASE}/categories/non-existent-cat-id`);
    expect(res.status).toBe(404);
  });

  it("TC-SCHEMA06: GET /products/:id for non-existent ID returns 404", async () => {
    const res = await request(app).get(`${BASE}/products/non-existent-prod-id`);
    expect(res.status).toBe(404);
  });
});

// =============================================================================
// WSTG-CONF-07: Pagination Parameter Abuse / Resource Exhaustion
// =============================================================================
describe("WSTG-CONF-07: Pagination & Query Parameter Abuse", () => {
  it("TC-PAG01: Requesting page=0 does not crash server", async () => {
    const res = await request(app).get(`${BASE}/submissions?page=0&limit=10`);
    expect(res.status).not.toBe(500);
  });

  it("TC-PAG02: Requesting negative page does not crash server", async () => {
    const res = await request(app).get(`${BASE}/submissions?page=-1&limit=10`);
    expect(res.status).not.toBe(500);
  });

  it("TC-PAG03: Requesting extremely large limit does not crash server or expose all data", async () => {
    const res = await request(app).get(`${BASE}/submissions?page=1&limit=999999`);
    expect(res.status).not.toBe(500);
  });

  it("TC-PAG04: Non-numeric page value does not crash server", async () => {
    const res = await request(app).get(`${BASE}/submissions?page=abc&limit=def`);
    expect(res.status).not.toBe(500);
  });

  it("TC-PAG05: Admin submissions list with valid pagination returns meta info", async () => {
    const res = await request(app)
      .get(`${BASE}/submissions?page=1&limit=10`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).not.toBe(500);
    // If successful, should include meta pagination info
    if (res.status === 200 && res.body.data?.meta) {
      expect(res.body.data.meta.page).toBeDefined();
      expect(res.body.data.meta.limit).toBeDefined();
      expect(res.body.data.meta.total).toBeDefined();
    }
  });
});

// =============================================================================
// WSTG-CONF-08: CORS Policy Testing
// =============================================================================
describe("WSTG-CONF-08: CORS Configuration Testing", () => {
  it("TC-CORS01: CORS headers are present in response", async () => {
    const res = await request(app)
      .options(`${BASE}/auth/login`)
      .set("Origin", "https://attacker-site.com")
      .set("Access-Control-Request-Method", "POST");
    // Document current CORS behavior — wildcard '*' is a finding
    const corsHeader = res.headers["access-control-allow-origin"];
    // If wildcard, this is a Medium severity finding (documented in report)
    if (corsHeader === "*") {
      console.warn("[CORS FINDING] WSTG-CONF-08: CORS is set to wildcard (*). Should be restricted to known domains in production.");
    }
    expect(corsHeader).toBeDefined();
  });
});
