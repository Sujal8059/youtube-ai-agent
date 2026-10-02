const nodemailer = require("nodemailer");

/**
 * Send an email alert with a beautifully formatted HTML list of new YouTube videos.
 *
 * @param {Object} options
 * @param {string} options.gmailUser - Gmail address to send from.
 * @param {string} options.gmailPass - Gmail App Password.
 * @param {string} options.alertTo - Recipient email address.
 * @param {string} options.keyword - The search keyword used.
 * @param {Array} options.videos - Array of video objects from youtube.js.
 * @returns {Promise<Object>} Nodemailer send result.
 */
async function sendAlert({ gmailUser, gmailPass, alertTo, keyword, videos }) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  // Fallback plain text version
  const textBody = videos
    .map(
      (v) =>
        `• ${v.title}\n  Channel: ${v.channel}\n  Views: ${v.views.toLocaleString()}\n  Published: ${new Date(v.publishedAt).toLocaleDateString()}\n  ${v.url}\n`
    )
    .join("\n");

  // Generate beautiful HTML cards for each video
  const videoCardsHtml = videos.map(v => {
    // Generate high-quality thumbnail URL directly from videoId
    const thumbUrl = `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
    const pubDate = new Date(v.publishedAt).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
    const views = v.views.toLocaleString();
    
    return `
      <div style="border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 24px; overflow: hidden; font-family: Helvetica, Arial, sans-serif; max-width: 600px; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <a href="${v.url}" target="_blank" style="display: block; text-decoration: none;">
          <img src="${thumbUrl}" alt="Thumbnail for ${v.title}" style="width: 100%; height: auto; display: block; border-bottom: 1px solid #e0e0e0;" />
        </a>
        <div style="padding: 16px;">
          <h3 style="margin: 0 0 12px 0; font-size: 18px; line-height: 1.4;">
            <a href="${v.url}" target="_blank" style="color: #065fd4; text-decoration: none;">
              ${v.title}
            </a>
          </h3>
          <p style="margin: 6px 0; color: #606060; font-size: 14px;">
            <strong>📺 Channel:</strong> ${v.channel}
          </p>
          <p style="margin: 6px 0; color: #606060; font-size: 14px;">
            <strong>👁️ Views:</strong> ${views} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>⏱️ Duration:</strong> ${v.duration}
          </p>
          <p style="margin: 6px 0; color: #606060; font-size: 14px;">
            <strong>📅 Uploaded:</strong> ${pubDate} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>🎯 Score:</strong> ${v.score}
          </p>
        </div>
      </div>
    `;
  }).join('');

  // Wrap in a nice main container
  const htmlBody = `
    <div style="background-color: #f7f9fa; padding: 24px 16px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <h2 style="font-family: Helvetica, Arial, sans-serif; color: #202124; margin-bottom: 8px;">
          YouTube AI Agent Alert
        </h2>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #5f6368; font-size: 16px; margin-bottom: 24px;">
          Found <strong>${videos.length}</strong> new high-quality video(s) for <strong>"${keyword}"</strong> in the last 48 hours.
        </p>
        
        ${videoCardsHtml}
        
        <p style="font-family: Helvetica, Arial, sans-serif; color: #9aa0a6; font-size: 12px; margin-top: 32px; text-align: center;">
          Sent automatically by your Node.js YouTube AI Agent
        </p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"YouTube AI Agent" <${gmailUser}>`,
    to: alertTo,
    subject: `🚀 YouTube Alert: ${videos.length} new video(s) for "${keyword}"`,
    text: `Found ${videos.length} new video(s) matching "${keyword}":\n\n${textBody}`,
    html: htmlBody, // The newly generated HTML goes here
  };

  const result = await transporter.sendMail(mailOptions);
  return result;
}

module.exports = { sendAlert };
