import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../src/models/auth.model.js";
import {
  createSubmissionSchema,
  updateSubmissionSchema,
  updateSubmissionStatusSchema,
} from "../src/models/submission.model.js";
import { createRegistrationSchema } from "../src/models/registration.model.js";
import {
  validateReferralCodeSchema,
  reviewReferralSchema,
} from "../src/models/referral.model.js";
import {
  submitMissionSchema,
  reviewMissionSubmissionSchema,
} from "../src/models/mission.model.js";
import {
  createProductSchema,
  updateProductSchema,
} from "../src/models/product.model.js";

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
        registration_id: "reg_123",
        project_name: "Project Beta",
        description: "Deskripsi project yang memenuhi syarat minimal karakter",
        flow_application: "Flow aplikasi lengkap yang memenuhi syarat minimal",
        links: [],
      });
      assert.equal(invalid.success, false);
    });

    test("createSubmissionSchema should reject invalid link URL", () => {
      const invalid = createSubmissionSchema.safeParse({
        registration_id: "reg_123",
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
        registration_id: "reg_123",
        project_name: "Project Beta",
        description: "Deskripsi project yang memenuhi syarat minimal karakter",
        flow_application: "Flow aplikasi lengkap yang memenuhi syarat minimal",
        thumbnail_url: "https://ik.imagekit.io/mia2026/submission-thumbnails/test.webp",
        links: [
          {
            link_type: "GITHUB",
            url: "https://github.com/mia2026/project",
          },
          {
            link_type: "YOUTUBE",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          },
          {
            link_type: "PRESENTATION",
            url: "https://docs.google.com/presentation/d/123",
          },
          {
            link_type: "ORIGINALITY_STATEMENT",
            url: "https://drive.google.com/file/d/123/view",
          },
        ],
      });
      assert.equal(valid.success, true);
    });

    test("createSubmissionSchema should accept valid thumbnail_url and thumbnail", () => {
      const valid = createSubmissionSchema.safeParse({
        registration_id: "reg_123",
        project_name: "Project Beta",
        description: "Deskripsi project yang memenuhi syarat minimal karakter",
        flow_application: "Flow aplikasi lengkap yang memenuhi syarat minimal",
        thumbnail_url: "https://ik.imagekit.io/mia2026/submission-thumbnails/test.webp",
        links: [
          {
            link_type: "GITHUB",
            url: "https://github.com/mia2026/project",
          },
        ],
      });
      assert.equal(valid.success, true);
    });

    test("createSubmissionSchema should reject missing thumbnail_url and thumbnail", () => {
      const invalid = createSubmissionSchema.safeParse({
        registration_id: "reg_123",
        project_name: "Project Beta",
        description: "Deskripsi project yang memenuhi syarat minimal karakter",
        flow_application: "Flow aplikasi lengkap yang memenuhi syarat minimal",
        links: [
          {
            link_type: "GITHUB",
            url: "https://github.com/mia2026/project",
          },
        ],
      });
      assert.equal(invalid.success, false);
      assert.ok(invalid.error.issues.some((i) => i.path.includes("thumbnail_url")));
    });

    test("createSubmissionSchema should reject invalid thumbnail_url format", () => {
      const invalid = createSubmissionSchema.safeParse({
        registration_id: "reg_123",
        project_name: "Project Beta",
        description: "Deskripsi project yang memenuhi syarat minimal karakter",
        flow_application: "Flow aplikasi lengkap yang memenuhi syarat minimal",
        thumbnail_url: "not-a-valid-url",
        links: [
          {
            link_type: "GITHUB",
            url: "https://github.com/mia2026/project",
          },
        ],
      });
      assert.equal(invalid.success, false);
      assert.ok(invalid.error.issues.some((i) => i.path.includes("thumbnail_url")));
    });

    test("createSubmissionSchema should accept optional admin_feedback", () => {
      const valid = createSubmissionSchema.safeParse({
        registration_id: "reg_123",
        project_name: "Project Beta",
        description: "Deskripsi project yang memenuhi syarat minimal karakter",
        flow_application: "Flow aplikasi lengkap yang memenuhi syarat minimal",
        thumbnail_url: "https://ik.imagekit.io/mia2026/submission-thumbnails/test.webp",
        admin_feedback: "Catatan dari admin",
        links: [
          {
            link_type: "GITHUB",
            url: "https://github.com/mia2026/project",
          },
        ],
      });
      assert.equal(valid.success, true);
    });

    test("updateSubmissionSchema should accept optional admin_feedback", () => {
      const valid = updateSubmissionSchema.safeParse({
        admin_feedback: "Perbaiki bagian responsivitas",
      });
      assert.equal(valid.success, true);
    });

    test("updateSubmissionStatusSchema should accept optional admin_feedback", () => {
      const valid = updateSubmissionStatusSchema.safeParse({
        status: "APPROVED",
        is_verified: true,
        admin_feedback: "Karya disetujui untuk Show It",
      });
      assert.equal(valid.success, true);
      assert.equal(valid.data.admin_feedback, "Karya disetujui untuk Show It");
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

  describe("Mission Submission & Review Validation", () => {
    test("submitMissionSchema should accept submission with registration_id and category_id", () => {
      const valid = submitMissionSchema.safeParse({
        submission_url: "https://drive.google.com/file/d/abc/view",
        notes: "Untuk tim UI/UX (Jurig Kopken)",
        registration_id: "reg_uiux_123",
        category_id: "cat_uiux_01",
      });
      assert.equal(valid.success, true);
      assert.equal(valid.data.registration_id, "reg_uiux_123");
    });

    test("reviewMissionSubmissionSchema should accept optional registration_id when approving", () => {
      const valid = reviewMissionSubmissionSchema.safeParse({
        status: "APPROVED",
        awarded_xp: 100,
        awarded_diamond: 20,
        admin_feedback: "Mantap!",
        registration_id: "reg_uiux_123",
      });
      assert.equal(valid.success, true);
      assert.equal(valid.data.registration_id, "reg_uiux_123");
    });
  });

  describe("Product Validation", () => {
    test("createProductSchema should accept product with only Diamond price", () => {
      const valid = createProductSchema.safeParse({
        name: "Stiker Keren",
        description: "Stiker eksklusif merchandise lomba MIA 2026",
        price: 50,
        price_xp: 0,
        reward_xp: 0,
      });
      assert.equal(valid.success, true);
      assert.equal(valid.data.price, 50);
      assert.equal(valid.data.price_xp, 0);
    });

    test("createProductSchema should accept product with only XP price", () => {
      const valid = createProductSchema.safeParse({
        name: "Badge XP Spesial",
        description: "Badge penghargaan peserta lomba dengan poin XP",
        price: 0,
        price_xp: 150,
        reward_xp: 0,
      });
      assert.equal(valid.success, true);
      assert.equal(valid.data.price, 0);
      assert.equal(valid.data.price_xp, 150);
    });

    test("createProductSchema should reject product if both Diamond price and XP price are 0", () => {
      const invalid = createProductSchema.safeParse({
        name: "Produk Gratisan",
        description: "Deskripsi barang gratisan tanpa harga sama sekali",
        price: 0,
        price_xp: 0,
      });
      assert.equal(invalid.success, false);
      assert.ok(
        invalid.error.issues.some((i) =>
          i.message.includes("Minimal salah satu harga")
        )
      );
    });

    test("createProductSchema should reject product with XP price having reward XP (gabisa konversi ke XP)", () => {
      const invalid = createProductSchema.safeParse({
        name: "Produk Kontradiktif",
        description: "Beli pakai XP tapi dapat reward XP juga (tidak diizinkan)",
        price: 10,
        price_xp: 100,
        reward_xp: 50,
      });
      assert.equal(invalid.success, false);
      assert.ok(
        invalid.error.issues.some((i) =>
          i.message.includes("tidak dapat dikonversi ke XP")
        )
      );
    });

    test("updateProductSchema should reject price_xp > 0 with reward_xp > 0", () => {
      const invalid = updateProductSchema.safeParse({
        price_xp: 200,
        reward_xp: 20,
      });
      assert.equal(invalid.success, false);
      assert.ok(
        invalid.error.issues.some((i) =>
          i.message.includes("tidak dapat dikonversi ke XP")
        )
      );
    });
  });
});

