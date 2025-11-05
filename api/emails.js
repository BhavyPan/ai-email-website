import axios from 'axios';

function extractEmailData(email) {
  const headers = email.payload?.headers || [];
  const parts = email.payload?.parts || [];
  
  const fromHeader = headers.find(h => h.name === 'From');
  const subjectHeader = headers.find(h => h.name === 'Subject');
  const dateHeader = headers.find(h => h.name === 'Date');
  const toHeader = headers.find(h => h.name === 'To');
  
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
  } else if (email.payload?.body?.data) {
    try {
      body = Buffer.from(email.payload.body.data, 'base64').toString('utf-8');
    } catch (e) {
      body = 'Unable to decode email content';
    }
  }
  
  return {
    id: email.id,
    threadId: email.threadId,
    from: fromHeader?.value || 'Unknown',
    subject: subjectHeader?.value || 'No Subject',
    date: dateHeader?.value || '',
    to: toHeader?.value || '',
    snippet: email.snippet,
    body: body,
    internalDate: email.internalDate,
    labelIds: email.labelIds || [],
    headers: headers
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { access_token, maxResults = 20 } = req.query;

  if (!access_token) {
    return res.status(400).json({ error: 'Access token required' });
  }

  try {
    const emailsResponse = await axios.get(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=INBOX`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const emails = emailsResponse.data.messages || [];

    if (emails.length === 0) {
      return res.status(200).json([]);
    }

    const emailDetailsPromises = emails.map(async (message) => {
      try {
        const emailResponse = await axios.get(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          }
        );
        
        return extractEmailData(emailResponse.data);
      } catch (error) {
        console.error(`Error fetching email ${message.id}:`, error.message);
        return {
          id: message.id,
          error: 'Failed to fetch email details',
          rawError: error.message
        };
      }
    });

    const emailDetails = await Promise.all(emailDetailsPromises);
    
    const validEmails = emailDetails
      .filter(email => !email.error)
      .sort((a, b) => {
        const dateA = new Date(a.internalDate || a.date);
        const dateB = new Date(b.internalDate || b.date);
        return dateB - dateA;
      });
    
    res.status(200).json(validEmails);
    
  } catch (error) {
    console.error('Emails fetch error:', error.response?.data || error.message);
    
    let errorMessage = 'Failed to fetch emails';
    let statusCode = 500;
    
    if (error.response?.status === 401) {
      errorMessage = 'Invalid or expired access token. Please login again.';
      statusCode = 401;
    } else if (error.response?.status === 403) {
      errorMessage = 'Gmail API access denied. Please check permissions.';
      statusCode = 403;
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error.message;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: error.response?.data?.error?.message || error.message 
    });
  }
}