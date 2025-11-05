import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { access_token, to, subject, body } = req.body;

  if (!access_token || !to || !subject || !body) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['access_token', 'to', 'subject', 'body']
    });
  }

  try {
    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      body
    ];

    const email = emailLines.join('\r\n');
    
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await axios.post(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        raw: encodedEmail
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json({ 
      success: true, 
      message: 'Email sent successfully',
      id: response.data.id,
      threadId: response.data.threadId
    });
    
  } catch (error) {
    console.error('Send email error:', error.response?.data || error.message);
    
    let errorMessage = 'Failed to send email';
    let statusCode = 500;
    
    if (error.response?.status === 401) {
      errorMessage = 'Invalid or expired access token. Please login again.';
      statusCode = 401;
    } else if (error.response?.status === 403) {
      errorMessage = 'Gmail send permission denied. Please check scope permissions.';
      statusCode = 403;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: error.response?.data?.error?.message || error.message 
    });
  }
}