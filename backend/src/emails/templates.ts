export const emailTemplates = {
  otp: (otpCode: string, name: string): { subject: string; html: string } => ({
    subject: `[Dada Mani ERP] Admin Security Verification OTP: ${otpCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
        <div style="background: #0f172a; padding: 18px; border-radius: 6px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 1px;">DADA MANI ENTERPRISE OPERATIONS</h2>
        </div>
        <div style="padding: 24px 0;">
          <p style="font-size: 15px; color: #334155;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 14px; color: #475569;">A login attempt was initiated for your Administrator account. Please use the one-time verification code below to authorize your session.</p>
          <div style="background: #f1f5f9; padding: 18px; border-radius: 8px; text-align: center; margin: 24px 0; border: 1px dashed #cbd5e1;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0284c7;">${otpCode}</span>
          </div>
          <p style="font-size: 13px; color: #64748b;">This OTP is valid for <strong>5 minutes</strong>. Maximum 3 attempts permitted. If you did not initiate this request, please contact IT Security immediately.</p>
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
          &copy; ${new Date().getFullYear()} Dada Mani Enterprise Operations Management System. All rights reserved.
        </div>
      </div>
    `,
  }),

  welcome: (name: string, email: string, temporaryPass: string, role: string): { subject: string; html: string } => ({
    subject: `Welcome to Dada Mani Enterprise Operations System`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
        <div style="background: #0f172a; padding: 18px; border-radius: 6px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">DADA MANI ENTERPRISE</h2>
        </div>
        <div style="padding: 24px 0;">
          <p style="font-size: 15px; color: #334155;">Welcome aboard, <strong>${name}</strong>!</p>
          <p style="font-size: 14px; color: #475569;">Your account has been provisioned with the role <strong>${role}</strong>.</p>
          <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 18px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${temporaryPass}</code></p>
          </div>
          <p style="font-size: 13px; color: #e11d48;">Please log in and update your password immediately upon first access.</p>
        </div>
      </div>
    `,
  }),

  vehicleExpiryAlert: (vehicleReg: string, expiryType: string, expiryDate: string, daysLeft: number): { subject: string; html: string } => ({
    subject: `[COMPLIANCE ALERT] Vehicle ${vehicleReg} - ${expiryType} Expiry in ${daysLeft} Days`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fecdd3; border-radius: 8px; background: #ffffff;">
        <div style="background: #be123c; padding: 18px; border-radius: 6px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 18px;">FLEET COMPLIANCE ALERT</h2>
        </div>
        <div style="padding: 20px 0;">
          <p style="font-size: 14px; color: #1e293b;">The following vehicle compliance document requires immediate renewal attention:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr style="background: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Registration No:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${vehicleReg}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Document Type:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${expiryType}</td></tr>
            <tr style="background: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Expiry Date:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0; color: #e11d48; font-weight: bold;">${expiryDate}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Days Remaining:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${daysLeft} day(s)</td></tr>
          </table>
          <p style="font-size: 13px; color: #475569;">Please initiate renewal processing to avoid fines or operational groundings.</p>
        </div>
      </div>
    `,
  }),

  tenderAssigned: (managerName: string, tenderNumber: string, title: string, deadline: string): { subject: string; html: string } => ({
    subject: `[Tender Assignment] ${tenderNumber} - ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
        <h3 style="color: #0f172a;">New Tender Assignment</h3>
        <p>Hello ${managerName},</p>
        <p>You have been assigned as lead manager for Tender <strong>${tenderNumber}</strong> (${title}).</p>
        <p><strong>Submission Deadline:</strong> ${deadline}</p>
        <p>Please log in to the Dada Mani ERP portal to review specifications, scope of work, and bid preparation.</p>
      </div>
    `,
  }),

  workOrderAssigned: (managerName: string, orderNumber: string, title: string, siteLocation: string): { subject: string; html: string } => ({
    subject: `[Work Order Assignment] ${orderNumber} - ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
        <h3 style="color: #0f172a;">Work Order Assigned</h3>
        <p>Hello ${managerName},</p>
        <p>Work Order <strong>${orderNumber}</strong> (${title}) at site <strong>${siteLocation}</strong> has been assigned to you.</p>
        <p>Please track fleet allocation, milestones, and daily log reports.</p>
      </div>
    `,
  }),
};
