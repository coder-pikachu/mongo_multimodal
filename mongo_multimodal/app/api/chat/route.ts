import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { getDb } from '@/lib/mongodb';
import { doPaginatedVectorSearch } from '@/lib/utils';
import { ObjectId } from 'mongodb';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, data, projectId } = await req.json();

  const lastMessage = messages[messages.length - 1];
  const imagePart = data?.imageUrl ? { type: 'image' as const, image: new URL(data.imageUrl) } : null;

  // Get project information for context
  const db = await getDb();
  const project = projectId ? await db.collection('projects').findOne({
    _id: new ObjectId(projectId)
  }) : null;

  // Perform RAG search if no image context is provided
  let ragContext = '';
  if (!imagePart && projectId && lastMessage.content) {
    try {
      const searchResults = await doPaginatedVectorSearch(db, projectId, lastMessage.content, 'text', 1, 3);
      if (searchResults.results && searchResults.results.length > 0) {
        ragContext = `

## Relevant Project Context
Based on your question, here are some relevant documents from the project:

${searchResults.results.map((result: any, index: number) => `
### ${index + 1}. ${result.metadata?.filename || 'Document'}
**Type**: ${result.type} | **Relevance**: ${Math.round(result.score * 100)}%
${result.analysis?.description ? `**Description**: ${result.analysis.description}` : ''}
${result.content?.text ? `**Content**: ${result.content.text.substring(0, 500)}${result.content.text.length > 500 ? '...' : ''}` : ''}
`).join('\n')}

Please use this context along with your knowledge to provide a comprehensive answer.`;
      }
    } catch (error) {
      console.error('RAG search error:', error);
    }
  }

  const result = await streamText({
    model: anthropic('claude-3-5-sonnet-20240620'),
    system: `You are Claude, an expert AI assistant specializing in multimodal data analysis and conversational support.

## Project Context
${project ? `**Project**: ${project.name}
**Description**: ${project.description}

You are having a conversation within the context of this specific project. Your responses should be relevant to the project's scope and objectives.` : 'You are having a conversation about multimodal data stored in MongoDB.'}

## Your Role
You provide **intelligent, contextual responses** by:

- **Analyzing images** when provided with detailed visual descriptions
- **Using project context** from relevant documents when available
- **Providing comprehensive answers** that combine visual analysis with textual information
- **Maintaining conversation continuity** while staying relevant to the project

## Response Format
Always format your responses in **rich markdown** with:

- **Clear structure** using headings (##, ###) when appropriate
- **Emphasis** with **bold** and *italic* text for key points
- **Lists** for organized information (bullets or numbered)
- **Code blocks** for technical content or data
- **Tables** for comparative information
- **Blockquotes** for highlighting important insights
- **Proper formatting** for readability and engagement

## Analysis Standards
- Provide **detailed, accurate analysis** of any visual content
- **Cross-reference** image content with project context when available
- **Highlight key findings** and actionable insights
- **Ask clarifying questions** when more information would be helpful
- **Acknowledge limitations** when information is incomplete

## Conversation Guidelines
- **Be conversational** yet professional
- **Build on previous messages** in the conversation
- **Stay focused** on the project context and user's needs
- **Provide value** beyond simple descriptions—offer insights and analysis

Remember: You're not just describing what you see or know—you're providing intelligent analysis and insights that help users understand their data and make informed decisions.`,
    messages: [
      ...messages.slice(0, -1),
      {
        ...lastMessage,
        content: [
          { type: 'text', text: lastMessage.content + ragContext },
          ...(imagePart ? [imagePart] : []),
        ]
      }
    ],
  });

  return result.toTextStreamResponse();
}