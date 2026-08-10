import { loginUser } from "../services/auth.service.js";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  
  console.log("Trying to login with:");
  console.log("Email:", email);
  console.log("Password:", password);
  
  try {
    const result = await loginUser(email, password);
    console.log("Login successful! Result:", result);
  } catch (err) {
    console.error("Login failed! Error:", err.message);
    console.error(err.stack);
  }
}

run().catch(console.error);
