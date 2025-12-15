import dotenv from "dotenv";
dotenv.config(); // Must be first

import nodemailer, { Transporter } from "nodemailer";
import { emailAccounts, EmailAccountKey, validateEmailAccount } from "./emailConfig.js";

/**
 * Create a Nodemailer transporter for a given account key
 */
export const createTransporter = (accountKey: EmailAccountKey = "noreply"): Transporter => {
  // Debug logging
  console.log(`Creating transporter for: ${accountKey}`);
  console.log('Account config:', {
    user: !!emailAccounts[accountKey].user ? '[SET]' : '[MISSING]',
    pass: !!emailAccounts[accountKey].pass ? '[SET]' : '[MISSING]',
    host: emailAccounts[accountKey].host,
    port: emailAccounts[accountKey].port
  });

  const account = validateEmailAccount(accountKey);

  return nodemailer.createTransport({  // ← FIXED: createTransport not createTransporter
    host: account.host,
    port: account.port,
    secure: account.secure,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });
};
