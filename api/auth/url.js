export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if environment variables are set
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.error('GOOGLE_CLIENT_ID is missing');
    return res.status(500).json({ 
      error: 'Server configuration error: GOOGLE_CLIENT_ID is missing',
      setupRequired: true
    });
  }

  try {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${baseUrl}/api/token&` +
      `response_type=code&` +
      `scope=https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send&` +
      `access_type=offline&` +
      `prompt=consent`;

    res.status(200).json({ 
      authUrl,
      baseUrl,
      status: 'success'
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate authentication URL',
      details: error.message 
    });
  }
}
