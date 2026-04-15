interface EmailOptions {
    email: string;
    subject: string;
    message: string;
    html?: string;
}
declare const sendEmail: (options: EmailOptions) => Promise<void>;
export default sendEmail;
//# sourceMappingURL=sendEmail.d.ts.map