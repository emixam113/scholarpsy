// src/lib/mailer.ts
import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
    },
});

export async function sendResetPasswordEmail(email: string, token: string) {
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;

    await transporter.sendMail({
        from: `"ScholarPsy" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Réinitialisation de votre mot de passe - ScholarPsy',
        html: `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
					<h1 style="color: white; margin: 0; font-size: 28px;">ScholarPsy</h1>
				</div>
				<div style="background: #f8fafc; padding: 32px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0;">
					<h2 style="color: #1e293b; margin-top: 0;">Réinitialisation de mot de passe</h2>
					<p style="color: #475569;">Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.</p>
					<div style="text-align: center; margin: 32px 0;">
						<a href="${resetUrl}" style="background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
							Réinitialiser mon mot de passe
						</a>
					</div>
					<p style="color: #94a3b8; font-size: 14px;">Ce lien expire dans <strong>1 heure</strong>. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
					<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
					<p style="color: #94a3b8; font-size: 12px; text-align: center;">ScholarPsy — Recherche académique en psychologie</p>
				</div>
			</div>
		`,
    });
}