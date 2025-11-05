export default function handler(req, res) {
  res.status(200).json({
    environment: {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 
        `✅ Set (length: ${process.env.GOOGLE_CLIENT_ID.length})` : '❌ Missing',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 
        `✅ Set (length: ${process.env.GOOGLE_CLIENT_SECRET.length})` : '❌ Missing',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 
        `✅ Set (length: ${process.env.OPENAI_API_KEY.length})` : '❌ Missing',
      VERCEL_URL: process.env.VERCEL_URL || 'Not set'
    },
    timestamp: new Date().toISOString()
  });
}
