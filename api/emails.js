// Remove axios import at top

function extractEmailData(email) {
  const headers = email.payload?.headers || [];
  const parts = email.payload?.parts || [];
  
  const fromHeader = headers.find(h => h.name === 'From');
  const subjectHeader = headers.find(h => h.name === 'Subject');
  const dateHeader = headers.find(h => h.name === 'Date');
  
  let body = '';
  if (email.snippet) {
    body = email.snippet;
  } else if (parts.length > 0) {
    const textPart = parts.find(part => part.mimeType === 'text/plain');
    if (textPart && textPart.body && textPart.body.data) {
      try {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      } catch (e) {
        body = 'Unable to decode email content';
      }
    }
  }
  
  return {
    id: email.id,
    from: fromHeader?.value || 'Unknown',
    subject: subjectHeader?.value || 'No Subject',
    date: dateHeader?.value || '',
    snippet: email.snippet,
    body: body,
    internalDate: email.internalDate,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { access_token, maxResults = 10 } = req.query;

  if (!access_token) {
    return res.status(400).json({ error: 'Access token required' });
  }

  try {
    // Use fetch instead of axios
    const emailsResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=INBOX`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!emailsResponse.ok) {
      throw new Error(`Gmail API error: ${emailsResponse.status}`);
    }

    const emailsData = await emailsResponse.json();
    const emails = emailsData.messages || [];

    if (emails.length === 0) {
      return res.status(200).json([]);
    }

    // Get details for each email
    const emailDetails = await Promise.all(
      emails.map(async (message) => {
        try {
          const emailResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
            {
              headers: {
                Authorization: `Bearer ${access_token}`,
              },
            }
          );
          
          const emailData = await emailResponse.json();
          return extractEmailData(emailData);
        } catch (error) {
          console.error(`Error fetching email ${message.id}:`, error.message);
          return null;
        }
      })
    );

    const validEmails = emailDetails.filter(email => email !== null);
    
    res.status(200).json(validEmails);
    
  } catch (error) {
    console.error('Emails fetch error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch emails',
      details: error.message 
    });
  }
}
