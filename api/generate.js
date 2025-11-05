import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subject, tone = 'professional', keyPoints } = req.body;

  if (!subject) {
    return res.status(400).json({ error: 'Subject is required' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional email writer. Generate complete, well-structured emails based on the given subject and tone. Include appropriate greetings and closings."
        },
        {
          role: "user",
          content: `Write a ${tone} email with subject: "${subject}"${keyPoints ? `\nKey points to include: ${keyPoints}` : ''}`
        }
      ],
      max_tokens: 500,
      temperature: 0.8,
    });

    const generatedEmail = completion.choices[0].message.content;
    
    res.status(200).json({ 
      email: generatedEmail,
      subject: subject
    });
  } catch (error) {
    console.error('Email generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate email',
      details: error.message 
    });
  }
}