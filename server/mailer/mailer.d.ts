import { Transporter } from "nodemailer";
import { EmailAccountKey } from "./emailConfig.js";
/**
 * Create a Nodemailer transporter for a given account key
 */
export declare const createTransporter: (accountKey?: EmailAccountKey) => Transporter;
