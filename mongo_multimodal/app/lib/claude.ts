interface MessageContent {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content:  MessageContent[];
}

interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export async function generateClaudeResponse(
  query: string,
  searchResults: any[]
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  // Prepare the messages array with user query and context
  const messages: ClaudeMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `I'm analyzing a research database and found relevant items, including text documents and images. Please help me understand and synthesize this information in relation to my query: "${query}"\n\nHere's what I found:\n\n1. For text documents, provide a concise summary of the key points and how they relate to my query.\n2. For images or diagrams, describe what you see and explain its relevance to my question.\n3. If there are connections between different items, please highlight those.\n4. Finally, give a comprehensive answer to my original query based on all the information provided.`
        }
      ]
    }
  ];

  // Add text content from documents
  const textContent = searchResults
    .filter(result => result.type === 'document' && result.content.text)
    .map((result, index) => `Document ${index + 1}: ${result.content.text}`)
    .join('\n\n');

  if (textContent) {
    messages[0].content.push({
      type: 'text',
      text: textContent
    });
  }

  // Add images with their descriptions
  for (const result of searchResults) {
    if (result.type === 'image' && result.content.base64) {
      messages[0].content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: result.content.base64
        }
      });

      if (result.analysis?.description) {
        messages[0].content.push({
          type: 'text',
          text: `Description of the above image: ${result.analysis.description}`
        });
      }
    }
  }

  // Add final instruction
  messages[0].content.push({
    type: 'text',
    text: 'Please provide a comprehensive response that:\n1. Answers the query using the provided context\n2. Cites specific information from the documents/images\n3. Highlights any relevant connections between different items\n4. Suggests potential follow-up questions or areas for further exploration'
  });

  try {
    const requestBody = {
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4096,
      messages: messages.map(msg => ({
        role: msg.role,
        content: Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: msg.content }]
      })),
      temperature: 0
    };

    console.log('Claude API Request:', {
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: requestBody
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Claude API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      throw new Error(`Claude API error: ${response.status} - ${errorBody}`);
    }

    const result: ClaudeResponse = await response.json();
    return result.content[0]?.text || '';
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}
