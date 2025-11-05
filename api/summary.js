import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { emails } = req.body;

  if (!emails || !Array.isArray(emails)) {
    return res.status(400).json({ error: 'Emails array required' });
  }

  const emailsToProcess = emails.slice(0, 10);

  try {
    const emailContent = emailsToProcess.map((email, index) => {
      const from = email.from || 'Unknown Sender';
      const subject = email.subject || 'No Subject';
      const snippet = email.snippet || email.body?.substring(0, 200) || 'No content available';
      
      return `Email ${index + 1}:
From: ${from}
Subject: ${subject}
Preview: ${snippet}
---`;
    }).join('\n\n');

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an expert email assistant. Analyze the provided emails and create a concise, insightful summary.
          
          Focus on:
          - Key topics and themes across emails
          - Urgent matters requiring attention
          - Important senders or conversations
          - Action items or next steps
          
          Keep the summary under 250 words and make it easy to scan. Use bullet points if helpful.`
        },
        {
          role: "user",
          content: `Please provide a smart summary of these recent emails:\n\n${emailContent}`
        }
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const summary = completion.choices[0].message.content;
    
    res.status(200).json({ 
      summary,
      emailsProcessed: emailsToProcess.length
    });
    
  } catch (error) {
    console.error('Summary error:', error);
    
    let errorMessage = 'Failed to generate summary';
    
    if (error.code === 'insufficient_quota') {
      errorMessage = 'AI service quota exceeded. Please check your OpenAI API limits.';
    } else if (error.code === 'invalid_api_key') {
      errorMessage = 'Invalid AI API key. Please check your OpenAI API configuration.';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error.message 
    });
  }
}