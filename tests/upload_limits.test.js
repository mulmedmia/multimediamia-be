import test from "node:test";
import assert from "node:assert/strict";
import upload, { thumbnailFileFilter } from "../src/lib/multer.js";

test("upload accepts exactly JPEG, PNG and WebP MIME types", async () => {
  for (const mimetype of ["image/jpeg", "image/png", "image/webp"]) {
    assert.equal(await new Promise((resolve, reject) => {
      thumbnailFileFilter({}, { mimetype }, (error, accepted) => error ? reject(error) : resolve(accepted));
    }), true);
  }
  for (const mimetype of ["image/svg+xml", "image/gif", "text/plain"]) {
    await assert.rejects(new Promise((resolve, reject) => {
      thumbnailFileFilter({}, { mimetype }, (error, accepted) => error ? reject(error) : resolve(accepted));
    }));
  }
});

test("upload cap defaults to exactly 2 MiB", () => {
  assert.equal(upload.limits.fileSize, 2 * 1024 * 1024);
});
