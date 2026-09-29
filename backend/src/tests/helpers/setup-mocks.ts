// No test may reach a real mail server. nodemailer is replaced wholesale, which
// covers every EmailService path (OTP, welcome, alerts, assignment emails).
jest.mock('nodemailer', () => {
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });
  const transport = { sendMail, verify: jest.fn().mockResolvedValue(true) };
  return {
    __esModule: true,
    default: { createTransport: jest.fn(() => transport), createTestAccount: jest.fn() },
    createTransport: jest.fn(() => transport),
    createTestAccount: jest.fn(),
  };
});
