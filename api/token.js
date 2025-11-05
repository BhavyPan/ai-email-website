import axios from 'axios';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { code, error } = req.query;
    
    if (error) {
      return res.status(400).send(`Authentication failed: ${error}`);
    }

    if (!code) {
      return res.status(400).send('Missing authorization code');
    }

    try {
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';
      
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', null, {
        params: {
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: `${baseUrl}/api/token`,
          grant_type: 'authorization_code',
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token, refresh_token, expires_in } = tokenResponse.data;
      
      const redirectUrl = `${baseUrl}/?access_token=${access_token}&refresh_token=${refresh_token || ''}&expires_in=${expires_in}`;
      return res.redirect(redirectUrl);

    } catch (error) {
      console.error('Token exchange error:', error.response?.data || error.message);
      return res.status(500).send(`
        <html>
          <body>
            <h1>Authentication Failed</h1>
            <p>${error.response?.data?.error_description || error.message}</p>
            <a href="/">Return to Home</a>
          </body>
        </html>
      `);
    }
  }

  if (req.method === 'POST') {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    try {
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';
      
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', null, {
        params: {
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: `${baseUrl}/api/token`,
          grant_type: 'authorization_code',
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      res.status(200).json(tokenResponse.data);
    } catch (error) {
      console.error('Token exchange error:', error.response?.data || error.message);
      res.status(500).json({ 
        error: 'Token exchange failed',
        details: error.response?.data?.error_description || error.message 
      });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}