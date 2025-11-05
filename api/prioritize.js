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

  try {
    const emailContent = emails.map((email, index) => {
      const from = email.from || 'Unknown Sender';
      const subject = email.subject || 'No Subject';
      const snippet = email.snippet || email.body?.substring(0, 150) || 'No content';
      
      return `Email ${index}:
From: ${from}
Subject: ${subject}
Preview: ${snippet}
---`;
    }).join('\n');

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an email priority classifier. Analyze each email and assign a priority level:
          
          HIGH: Urgent emails requiring immediate attention
          - Time-sensitive requests
          - Important people (boss, clients, family)
          - Critical business matters
          - Deadline-driven content
          
          MEDIUM: Important but not urgent
          - Work discussions
          - Project updates
          - Important notifications
          
          LOW: Non-urgent communications
          - Newsletters
          - Promotions
          - Social notifications
          - Automated emails
          
          Respond with ONLY a valid JSON array. Each object must have:
          - index (number)
          - priority ("high", "medium", or "low")
          - reason (brief explanation)
          
          Example: [{"index": 0, "priority": "high", "reason": "Urgent client request"}]`
        },
        {
          role: "user",
          content: `Classify these emails by priority:\n\n${emailContent}`
        }
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    const responseText = completion.choices[0].message.content;
    
    let priorities;
    try {
      priorities = JSON.parse(responseText);
      
      if (!Array.isArray(priorities)) {
        throw new Error('Response is not an array');
      }
      
      priorities.forEach((item, idx) => {
        if (typeof item.index !== 'number' || 
            !['high', 'medium', 'low'].includes(item.priority) ||
            typeof item.reason !== 'string') {
          throw new Error(`Invalid item at index ${idx}`);
        }
      });
      
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Response:', responseText);
      throw new Error('AI returned invalid JSON format');
    }

    res.status(200).json({ 
      priorities,
      totalClassified: priorities.length
    });
    
  } catch (error) {
    console.error('Prioritization error:', error);
    
    let errorMessage = 'Failed to prioritize emails';
    
    if (error.message.includes('JSON')) {
      errorMessage = 'AI response format error. Please try again.';
    } else if (error.code === 'insufficient_quota') {
      errorMessage = 'AI service quota exceeded. Please check your OpenAI API limits.';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error.message 
    });
  }
}