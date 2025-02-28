import { Db, ObjectId } from 'mongodb';
import { generateClaudeResponse } from './claude';
import { generateMultimodalEmbedding } from './voyageai';

export function formatDate(date: string | Date | undefined): string {
  if (!date) return '';

  // Parse the date if it's a string
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Use ISO format for consistency between server and client
  return dateObj.toISOString().split('T')[0];
}


export async function doVectorSearchAndAnalyse( type: any, query: any, db: Db, paramsFound?: { projectId: string; } )
{
 try {
   console.log( 'Query:', query );

   const queryEmbedding = await generateMultimodalEmbedding(
     { text: type === 'text' ? query : undefined, base64: type === 'image' ? query : undefined },
     'query'
   );

   // Perform vector search using MongoDB Atlas
   const results = await db.collection( 'projectData' )
     .aggregate( [
       {
         $vectorSearch: {
           "exact": false,
           ...( paramsFound?.projectId ? {
             "filter": {
               projectId: new ObjectId( paramsFound.projectId )
             }
           } : {} ),

           "limit": 2,
           "numCandidates": 2,
           "path": "embedding",
           "queryVector": queryEmbedding,

           index: 'vector_index'
         }
       },
       // Filter for scores higher than 0.6
       {
         $project: {
           _id: 1,
           type: 1,
           content: 1,
           metadata: 1,
           analysis: 1,
           createdAt: 1,
           score: { $meta: 'vectorSearchScore' }
         }
       }, {
         $match: {
           score: { $gte: 0.6 }
         }
       },
       {
         $sort: {
           score: -1
         }
       }
     ] )
     .toArray();

     console.log( 'Results:', results );


   // Generate a comprehensive response using Claude
   const claudeResponse = await generateClaudeResponse( query, results );

   // Merge Claude's analysis into each result
   const enrichedResults = results.map(result => ({
     ...result,
     analysis: {
       ...result.analysis,
       description: claudeResponse || '',
       tags: result.analysis.tags || [],
       insights: result.analysis.insights || []
     }
   }));

   return { results: enrichedResults, analysis: claudeResponse };
 } catch (error) {
   console.error( 'Error performing vector search and analysis:', error );
   throw error;
 }
}