export default async function handler(req, res) {
  console.log('=== TOKEN ENDPOINT CALLED ===');
  
  if (req.method === 'GET') {
    const { code, error, error_description } = req.query;
    
    console.log('Query parameters:', { 
      code: code ? `present (${code.length} chars)` : 'missing',
      error,
      error_description 
    });

    if (error) {
      console.error('Google OAuth error:', { error, error_description });
      return res.status(400).send(`
        <html>
          <head><title>Authentication Failed</title></head>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1>🔐 OAuth Error from Google</h1>
            <div style="background: #fff3f3; border: 1px solid #ffcdd2; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>${error}</strong></p>
              ${error_description ? `<p>${error_description}</p>` : ''}
            </div>
            <a href="/" style="padding: 12px 24px; background: #4285f4; color: white; text-decoration: none; border-radius: 6px;">Return to Home</a>
          </body>
        </html>
      `);
    }

    if (!code) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1>No Authorization Code</h1>
            <p>Google didn't return an authorization code.</p>
            <a href="/" style="padding: 10px 20px; background: #4285f4; color: white; text-decoration: none; border-radius: 5px;">Return to Home</a>
          </body>
        </html>
      `);
    }

    try {
      const baseUrl = 'https://ai-email-website-f2lev23gn-bhavy-pans-projects.vercel.app';
      const redirectUri = `${baseUrl}/api/token`;
      
      console.log('Environment check:', {
        clientId: process.env.GOOGLE_CLIENT_ID ? `Set (${process.env.GOOGLE_CLIENT_ID.length} chars)` : 'Missing',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ? `Set (${process.env.GOOGLE_CLIENT_SECRET.length} chars)` : 'Missing',
        redirectUri
      });

      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error('Missing Google OAuth credentials in environment variables');
      }

      // Prepare the token exchange request
      const tokenBody = new URLSearchParams({
        code: code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });

      console.log('Token exchange request body:', tokenBody.toString());

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenBody
      });

      const responseText = await tokenResponse.text();
      console.log('Google token response:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        responseText: responseText
      });

      let tokenData;
      try {
        tokenData = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Google returned non-JSON response: ${responseText.substring(0, 200)}`);
      }

      if (!tokenResponse.ok) {
        console.error('Google token error details:', tokenData);
        throw new Error(`Google OAuth error: ${tokenData.error} - ${tokenData.error_description}`);
      }

      console.log('✅ Token exchange successful');
      const { access_token, refresh_token, expires_in } = tokenData;

      const appUrl = `${baseUrl}/?access_token=${access_token}&refresh_token=${refresh_token || ''}&expires_in=${expires_in}`;
      return res.redirect(appUrl);

    } catch (error) {
      console.error('❌ Token exchange failed:', error.message);
      
      return res.status(500).send(`
        <html>
          <head><title>Token Exchange Failed</title></head>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1>🔐 Token Exchange Failed</h1>
            <div style="background: #fff3f3; border: 1px solid #ffcdd2; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>${error.message}</strong></p>
            </div>
            <div style="text-align: left; display: inline-block; background: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h4>Common Solutions:</h4>
              <ol>
                <li><strong>Redirect URI Mismatch:</strong> The redirect URI in Google Cloud Console must match exactly</li>
                <li><strong>Invalid Credentials:</strong> Check if client ID and secret are correct</li>
                <li><strong>Authorization Code Expired:</strong> Codes expire quickly, try logging in again</li>
                <li><strong>OAuth Consent Screen:</strong> Make sure it's configured and published</li>
              </ol>
            </div>
            <br>
            <a href="/api/debug-setup" style="padding: 10px 20px; background: #34a853; color: white; text-decoration: none; border-radius: 5px; margin: 10px;">Check Setup</a>
            <a href="/" style="padding: 10px 20px; background: #4285f4; color: white; text-decoration: none; border-radius: 5px; margin: 10px;">Return Home</a>
          </body>
        </html>
      `);
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
