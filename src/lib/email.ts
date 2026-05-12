import nodemailer from "nodemailer";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://neo-marketing-hub.vercel.app";

function createTransport() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export interface MentionEmailPayload {
  to: string;
  recipientName: string;
  actorName: string;
  entityLabel: string;
  commentBody: string;
  link: string;
}

export async function sendMentionEmail(payload: MentionEmailPayload) {
  const transporter = createTransport();
  if (!transporter) {
    console.warn("[email] EMAIL_USER / EMAIL_PASS not set — skipping email");
    return;
  }

  const from = process.env.EMAIL_USER!;
  const fullLink = `${APP_URL}${payload.link}`;
  const preview = payload.commentBody.length > 200
    ? payload.commentBody.slice(0, 200) + "…"
    : payload.commentBody;

  const highlightedBody = preview.replace(
    /@([\w][\w\s'-]*)/g,
    '<span style="color:#5bcbf5;font-weight:600;">@$1</span>'
  );

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#061320;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#061320;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#0e2b48;border-radius:12px 12px 0 0;padding:24px 28px;border-bottom:1px solid #1d4368;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td>
              <div style="font-size:18px;font-weight:700;color:#e2e8f0;">NEO Marketing Hub</div>
              <div style="font-size:12px;color:#858889;margin-top:2px;text-transform:uppercase;letter-spacing:0.1em;">Notification</div>
            </td>
            <td align="right">
              <div style="background:rgba(91,203,245,0.15);border:1px solid rgba(91,203,245,0.3);border-radius:20px;padding:4px 12px;display:inline-block;">
                <span style="font-size:11px;font-weight:600;color:#5bcbf5;">@mention</span>
              </div>
            </td>
          </tr></table>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#0b1f35;padding:28px;border-left:1px solid #1d4368;border-right:1px solid #1d4368;">
          <p style="margin:0 0 16px;font-size:15px;color:#e2e8f0;line-height:1.5;">
            Hey <strong>${payload.recipientName}</strong> 👋
          </p>
          <p style="margin:0 0 20px;font-size:14px;color:#a8aaab;line-height:1.6;">
            <strong style="color:#e2e8f0;">${payload.actorName}</strong> mentioned you in a comment on <strong style="color:#e2e8f0;">${payload.entityLabel}</strong>.
          </p>

          <!-- Comment bubble -->
          <div style="background:#0e2b48;border:1px solid #1d4368;border-left:3px solid #5bcbf5;border-radius:8px;padding:16px 18px;margin:0 0 24px;">
            <p style="margin:0;font-size:13.5px;color:#cbd5e1;line-height:1.6;">${highlightedBody}</p>
          </div>

          <!-- CTA button -->
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:linear-gradient(180deg,#5bcbf5,#3aa6cc);border-radius:8px;">
              <a href="${fullLink}" style="display:inline-block;padding:12px 24px;font-size:13px;font-weight:700;color:#061320;text-decoration:none;border-radius:8px;">
                View in NEO Hub →
              </a>
            </td>
          </tr></table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#061320;border-radius:0 0 12px 12px;padding:18px 28px;border:1px solid #1d4368;border-top:none;">
          <p style="margin:0;font-size:11px;color:#5d6566;line-height:1.6;">
            You received this because you were @mentioned in NEO Marketing Hub.<br/>
            <a href="${APP_URL}" style="color:#5bcbf5;text-decoration:none;">Open the Hub</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"NEO Marketing Hub" <${from}>`,
      to: payload.to,
      subject: `${payload.actorName} mentioned you in ${payload.entityLabel}`,
      html,
    });
  } catch (err) {
    console.error("[email] Failed to send mention email:", err);
  }
}
