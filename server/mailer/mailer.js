import dotenv from "dotenv";
dotenv.config(); // Must be first
import nodemailer from "nodemailer";
import { emailAccounts } from "./emailConfig.js";
/**
 * Create a Nodemailer transporter for a given account key
 */
export const createTransporter = (accountKey = "noreply") => {
    const account = emailAccounts[accountKey];
    if (!account.user || !account.pass) {
        throw new Error(`Email account "${accountKey}" missing credentials`);
    }
    return nodemailer.createTransport({
        host: account.host,
        port: account.port,
        secure: account.secure,
        auth: {
            user: account.user,
            pass: account.pass,
        },
    });
};
