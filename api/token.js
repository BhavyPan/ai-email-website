export default async function handler(req, res) {
  console.log('Token endpoint called with method:', req.method);
  
  if (req.method === 'GET') {
    const { code, error } = req.query;
    
    console.log('OAuth callback received:', { code: code ? 'present' : 'missing', error });

    if (error) {
      console.error('OAuth error from Google:', error);
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1>Authentication Failed</h1>
            <p>Google returned an error: <strong>${error}</strong></p>
            <a href="/" style="padding: 10px 20px; background: #4285f4; color: white; text-decoration: none; border-radius: 5px;">Return to Home</a>
          </body>
        </html>
      `);
    }

    if (!code) {
      console.error('No authorization code received');
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1>Authentication Failed</h1>
            <p>No authorization code received from Google.</p>
            <a href="/" style="padding: 10px 20px; background: #4285f4; color: white; text-decoration: none; border-radius: 5px;">Return to Home</a>
          </body>
        </html>
      `);
    }

    try {
      // Use your exact production URL
      const baseUrl = 'https://ai-email-website-e28nqblzq-bhavy-pans-projects.vercel.app';
      const redirectUri = `${baseUrl}/api/token`;
      
      console.log('Exchanging code for tokens...', {
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        redirectUri,
        codeLength: code.length
      });

      // Use fetch instead of axios
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        })
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
        throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed');
      }

      console.log('Token exchange successful');
      const { access_token, refresh_token, expires_in } = tokenData;

      // Redirect back to main app with tokens
      const appUrl = `${baseUrl}/?access_token=${access_token}&refresh_token=${refresh_token || ''}&expires_in=${expires_in}`;
      console.log('Redirecting to app with tokens');
      
      return res.redirect(appUrl);

    } catch (error) {
      console.error('Token exchange error:', error.message);

      return res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1>Authentication Failed</h1>
            <p><strong>Error:</strong> ${error.message}</p>
            <a href="/" style="padding: 10px 20px; background: #4285f4; color: white; text-decoration: none; border-radius: 5px;">Return to Home</a>
          </body>
        </html>
      `);
    }
  }

  // Handle other methods
  res.status(405).json({ error: 'Method not allowed' });
}
