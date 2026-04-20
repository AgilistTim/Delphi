export const config = {
  calendlyUrl: process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/agilist-tim/delphi-follow-up",
  perAccountSessions: 3,
  perAccountTokens: 150000,
  perSessionTokens: 50000,
  requestTurnaroundHours: 24
};
