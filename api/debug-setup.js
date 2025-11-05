export default function handler(req, res) {
  const baseUrl = 'https://ai-email-website-f2lev23gn-bhavy-pans-projects.vercel.app';
  const redirectUri = `${baseUrl}/api/token`;
  
  // Build the exact auth URL that should work
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=https://www.googleapis.com/auth/gmail.readonly%20https://www.googleapis.com/auth/gmail.send&` +
    `access_type=offline&` +
    `prompt=consent`;

  res.status(200).json({
    environment: {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 
        `✅ Set (first 10 chars: ${process.env.GOOGLE_CLIENT_ID.substring(0, 10)}...)` : '❌ Missing',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 
        `✅ Set (first 10 chars: ${process.env.GOOGLE_CLIENT_SECRET.substring(0, 10)}...)` : '❌ Missing',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'
    },
    urls: {
      baseUrl,
      redirectUri,
      exactRedirectUriForGoogle: redirectUri,
      authUrl: `${authUrl.substring(0, 100)}...` // Truncated for display
    },
    instructions: [
      '1. Copy the "exactRedirectUriForGoogle" and add it to Google Cloud Console',
      '2. Visit the full authUrl in your browser to test OAuth',
      '3. Make sure your email is added to OAuth consent screen test users'
    ],
    fullAuthUrl: authUrl
  });
}
