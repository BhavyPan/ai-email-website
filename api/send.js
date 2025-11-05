export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { access_token, to, subject, body } = req.body;

  if (!access_token || !to || !subject || !body) {
    return res.status(400).json({ 
      error: 'Missing required fields'
    });
  }

  try {
    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body
    ];

    const email = emailLines.join('\r\n');
    
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Use fetch instead of axios
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedEmail
        })
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error?.message || 'Failed to send email');
    }

    res.status(200).json({ 
      success: true, 
      message: 'Email sent successfully',
      id: responseData.id
    });
    
  } catch (error) {
    console.error('Send email error:', error.message);
    res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    });
  }
}
