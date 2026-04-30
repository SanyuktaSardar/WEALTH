"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

export async function sendEmail({ to, subject, react }) {
    try {
        const data = await resend.emails.send({
            from: "Wealth <onboarding@resend.dev>",
            to,
            subject,
            react,
        });
        return { success: true, data };
    } catch (error) {
        return { success: false, error };
    }
}
