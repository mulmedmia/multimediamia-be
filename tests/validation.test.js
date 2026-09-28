import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../src/models/auth.model.js";
import { createSubmissionSchema } from "../src/models/submission.model.js";
import { createRegistrationSchema } from "../src/models/registration.model.js";
import {
  validateReferralCodeSchema,
  reviewReferralSchema,
} from "../src/models/referral.model.js";

describe("Validation Schemas Suite", () => {
  describe("Auth Validation", () => {
    test("registerSchema should pass valid registration data", () => {
      const valid = registerSchema.safeParse({
        name: "Boby Johari",
        email: "test@example.com",
        password: "secretPassword123",
      });
      assert.equal(valid.success, true);
    });

    test("registerSchema should reject invalid email format", () => {
      const invalid = registerSchema.safeParse({
        name: "Boby Johari",
        email: "not-an-email",
        password: "secretPassword123",
      });
      assert.equal(invalid.success, false);
      assert.ok(invalid.error.issues.some((i) => i.path.includes("email")));
    });

    test("registerSchema should reject short password (< 6 chars)", () => {
      const invalid = registerSchema.safeParse({
        name: "Boby Johari",
        email: "test@example.com",
        password: "123",
      });
      assert.equal(invalid.success, false);
      assert.ok(invalid.error.issues.some((i) => i.path.includes("password")));
    });

    test("loginSchema should reject invalid email or empty password", () => {
      const invalid = loginSchema.safeParse({
        email: "bad-email",
        password: "",
      });
      assert.equal(invalid.success, false);
    });

    test("verifyOtpSchema should reject OTP with length other than 6", () => {
      const shortOtp = verifyOtpSchema.safeParse({
        email: "test@example.com",
        otp: "123",
      });
      assert.equal(shortOtp.success, false);

      const validOtp = verifyOtpSchema.safeParse({
        email: "test@example.com",
        otp: "123456",
      });
      assert.equal(validOtp.success, true);
    });

    test("resetPasswordSchema should require newPassword of min 6 chars", () => {
      const valid = resetPasswordSchema.safeParse({
        email: "test@example.com",
        otp: "654321",
        newPassword: "newSafePassword2026",
      });
      assert.equal(valid.success, true);
    });
  });

  describe("Submission Validation", () => {
    test("createSubmissionSchema should reject empty links array", () => {
      const invalid = createSubmissionSchema.safeParse({
        category_id: "cat_123",
        team_name: "Tim Alpha",
        project_name: "Project Beta",
        description: "Deskripsi project yang memenuhi syarat minimal karakter",
        flow_application: "Flow aplikasi lengkap yang memenuhi syarat minimal",
        links: [],
      });
      assert.equal(invalid.success, false);
    });

    test("createSubmissionSchema should reject invalid link URL", () => {
      const invalid = createSubmissionSchema.safeParse({
        category_id: "cat_123",
        team_name: "Tim Alpha",
        project_name: "Project Beta",
        description: "Deskripsi project yang memenuhi syarat minimal karakter",
        flow_application: "Flow aplikasi lengkap yang memenuhi syarat minimal",
        links: [
          {
            link_type: "GITHUB",
            url: "not-a-valid-url",
          },
        ],
      });
      assert.equal(invalid.success, false);
    });

    test("createSubmissionSchema should pass with valid links and required fields", () => {
      const valid = createSubmissionSchema.safeParse({
        category_id: "cat_123",
        team_name: "Tim Alpha",
        project_name: "Project Beta",
        description: "Deskripsi project yang memenuhi syarat minimal karakter",
        flow_application: "Flow aplikasi lengkap yang memenuhi syarat minimal",
        links: [
          {
            link_type: "GITHUB",
            url: "https://github.com/mia2026/project",
          },
          {
            link_type: "YOUTUBE",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          },
        ],
      });
      assert.equal(valid.success, true);
    });
  });

  describe("Registration Validation", () => {
    test("createRegistrationSchema should reject missing user_id or category_id", () => {
      const invalid = createRegistrationSchema.safeParse({
        file_url: "https://drive.google.com/file/d/123/view",
      });
      assert.equal(invalid.success, false);
    });

    test("createRegistrationSchema should pass valid registration payload", () => {
      const valid = createRegistrationSchema.safeParse({
        user_id: "usr_12345",
        category_id: "cat_wia_01",
        file_url: "https://drive.google.com/file/d/123/view",
        team_name: "Creative Devs",
        team_members: "Member 1, Member 2",
      });
      assert.equal(valid.success, true);
    });

    test("createRegistrationSchema should accept team names with common symbols", () => {
      const symbolsToTest = [
        "UI & UX Team",
        "Team_Alpha",
        "Garuda (Tim 1)",
        "UI/UX Fighters",
        "Bismillah Juara!",
        "Team #1",
        "C++ Masters",
        "[PRO] Gamers",
        "Let's Go",
        "\"The Champions\"",
      ];

      for (const teamName of symbolsToTest) {
        const result = createRegistrationSchema.safeParse({
          user_id: "usr_12345",
          category_id: "cat_wia_01",
          file_url: "https://drive.google.com/file/d/123/view",
          team_name: teamName,
          team_members: "Member 1, Member 2",
        });
        assert.equal(result.success, true, `Failed for team name: ${teamName}`);
      }
    });

    test("createRegistrationSchema should accept trimmed drive urls with http or https", () => {
      const resultHttpsTrimmed = createRegistrationSchema.safeParse({
        user_id: "usr_12345",
        category_id: "cat_wia_01",
        file_url: "  https://drive.google.com/drive/folders/xyz123  ",
        team_name: "Trim Team",
      });
      assert.equal(resultHttpsTrimmed.success, true);

      const resultHttp = createRegistrationSchema.safeParse({
        user_id: "usr_12345",
        category_id: "cat_wia_01",
        file_url: "http://drive.google.com/file/d/123/view",
        team_name: "Http Team",
      });
      assert.equal(resultHttp.success, true);
    });

    test("createRegistrationSchema should reject disallowed characters in team_name", () => {
      const invalid = createRegistrationSchema.safeParse({
        user_id: "usr_12345",
        category_id: "cat_wia_01",
        file_url: "https://drive.google.com/file/d/123/view",
        team_name: "<script>alert(1)</script>",
      });
      assert.equal(invalid.success, false);
    });

    test("createRegistrationSchema should allow optional referral_code", () => {
      const valid = createRegistrationSchema.safeParse({
        user_id: "usr_12345",
        category_id: "cat_wia_01",
        file_url: "https://drive.google.com/file/d/123/view",
        team_name: "Referral Team",
        referral_code: "MIA-7K9PX2",
      });
      assert.equal(valid.success, true);
    });
  });

  describe("Referral Validation", () => {
    test("validateReferralCodeSchema should accept valid code", () => {
      const valid = validateReferralCodeSchema.safeParse({
        referral_code: "MIA-7K9PX2",
      });
      assert.equal(valid.success, true);
    });

    test("validateReferralCodeSchema should reject empty or short code", () => {
      const invalid = validateReferralCodeSchema.safeParse({
        referral_code: "ab",
      });
      assert.equal(invalid.success, false);
    });

    test("reviewReferralSchema should allow valid admin notes or empty body", () => {
      const empty = reviewReferralSchema.safeParse({});
      assert.equal(empty.success, true);

      const withNotes = reviewReferralSchema.safeParse({
        admin_notes: "Disetujui setelah pendaftaran diverifikasi panitia",
      });
      assert.equal(withNotes.success, true);
    });
  });
});

