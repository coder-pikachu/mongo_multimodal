const VOYAGE_API_URL = 'https://api.voyageai.com/v1/multimodalembeddings';

interface VoyageAIInput {
  inputs: Array<{
    content: Array<TextContent | ImageContent>;
  }>;
  model: string;
  input_type: 'query' | 'document';
}

interface TextContent {
  type: "text";
  text: string;
}

interface ImageContent {
  type: "image_base64";
  image_base64: string;
}


interface VoyageAIInput {
  inputs: Array<{
    content: Array<TextContent | ImageContent>;
  }>;
  model: string;
}

interface TextContent {
  type: "text";
  text: string;
}

interface ImageContent {
  type: "image_base64";
  image_base64: string;
}

interface VoyageAIResponse {
  object: "list";
  data: Array<EmbeddingData>;
  model: string;
  usage: Usage;
}

interface EmbeddingData {
  object: "embedding";
  embedding: number[];
  index: number;
}

interface Usage {
  text_tokens: number;
  image_pixels: number;
  total_tokens: number;
}

export async function generateMultimodalEmbedding(
  content: { text?: string; base64?: string },
  taskType: 'query' | 'document' = 'document'
): Promise<number[]> {
  if (!process.env.VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY is not set');
  }

  const input: VoyageAIInput = {
    model: 'voyage-multimodal-3',
    inputs: [{ content: [] }],
    input_type: taskType
  };

  if (content.text) {
    input.inputs[0].content.push({
      type: 'text',
      text: content.text
    });
  }

  if (content.base64) {
    input.inputs[0].content.push({
      type: 'image_base64',
      image_base64: "data:image/jpeg;base64,"+content.base64
    });
  }

  if (input.inputs[0].content.length === 0) {
    throw new Error('No content provided');
  }

  try {
    const response = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(error);
      throw new Error(error.message || 'Failed to generate embedding');
    }

    const result: VoyageAIResponse = await response.json();

    // Combine embeddings if there are multiple inputs
    if (result.data.length > 1) {
      // Average the embeddings
      const combined = new Array(result.data[0].embedding.length).fill(0);
      for (const embedding of result.data) {
        for (let i = 0; i < embedding.embedding.length; i++) {
          combined[i] += embedding.embedding[i];
        }
      }
      for (let i = 0; i < combined.length; i++) {
        combined[i] /= result.data.length;
      }
      return combined;
    }

    return result.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}
