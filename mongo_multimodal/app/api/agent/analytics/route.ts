/**
 * Agent Analytics API
 * Provides insights into agent usage patterns and tool effectiveness
 */

import { NextRequest } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const sessionId = searchParams.get('sessionId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const db = await getDb();

    // Build filter
    const filter: any = {};
    if (projectId) filter.projectId = projectId;
    if (sessionId) filter.sessionId = sessionId;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Get conversations with tool executions
    const conversations = await db
      .collection('conversations')
      .find({
        ...filter,
        toolExecutions: { $exists: true, $ne: [] }
      })
      .project({
        projectId: 1,
        sessionId: 1,
        timestamp: 1,
        plan: 1,
        toolExecutions: 1,
        references: 1
      })
      .toArray();

    // Calculate analytics
    const analytics = {
      totalConversations: conversations.length,
      conversationsWithPlans: conversations.filter((c) => c.plan).length,

      // Tool usage statistics
      toolUsage: {} as Record<string, { count: number; avgDuration: number; totalDuration: number }>,

      // Step budget analysis
      stepBudget: {
        avgStepsPerConversation: 0,
        maxSteps: 0,
        minSteps: 0,
        conversationsExceedingBudget: 0
      },

      // Plan accuracy
      planAccuracy: {
        totalPlans: 0,
        avgEstimatedVsActual: 0,
        plansWithExternalData: 0
      },

      // Reference statistics
      references: {
        totalReferences: 0,
        avgReferencesPerConversation: 0,
        byType: {} as Record<string, number>
      },

      // Most used project data items
      topReferencedItems: [] as Array<{ dataId: string; count: number; filename?: string }>
    };

    let totalSteps = 0;
    let totalEstimatedError = 0;
    const allToolExecutions: any[] = [];
    const referenceCounts = new Map<string, number>();

    for (const conv of conversations) {
      // Tool executions
      if (conv.toolExecutions) {
        const executions = Array.isArray(conv.toolExecutions) ? conv.toolExecutions : [];
        allToolExecutions.push(...executions);
        totalSteps += executions.length;

        analytics.stepBudget.maxSteps = Math.max(
          analytics.stepBudget.maxSteps,
          executions.length
        );

        if (analytics.stepBudget.minSteps === 0) {
          analytics.stepBudget.minSteps = executions.length;
        } else {
          analytics.stepBudget.minSteps = Math.min(
            analytics.stepBudget.minSteps,
            executions.length
          );
        }

        // Count tool usage
        for (const execution of executions) {
          const toolName = execution.tool;
          if (!analytics.toolUsage[toolName]) {
            analytics.toolUsage[toolName] = { count: 0, avgDuration: 0, totalDuration: 0 };
          }
          analytics.toolUsage[toolName].count++;
          analytics.toolUsage[toolName].totalDuration += execution.duration || 0;
        }
      }

      // Plan analysis
      if (conv.plan) {
        analytics.planAccuracy.totalPlans++;
        if (conv.plan.needsExternalData) {
          analytics.planAccuracy.plansWithExternalData++;
        }

        const actualToolCalls = conv.toolExecutions?.length || 0;
        const estimated = conv.plan.estimatedToolCalls || 0;
        if (estimated > 0) {
          totalEstimatedError += Math.abs(actualToolCalls - estimated) / estimated;
        }
      }

      // References
      if (conv.references) {
        const refs = Array.isArray(conv.references) ? conv.references : [];
        analytics.references.totalReferences += refs.length;

        for (const ref of refs) {
          // Count by type
          if (!analytics.references.byType[ref.type]) {
            analytics.references.byType[ref.type] = 0;
          }
          analytics.references.byType[ref.type]++;

          // Count references per item
          if (ref.dataId) {
            referenceCounts.set(
              ref.dataId,
              (referenceCounts.get(ref.dataId) || 0) + 1
            );
          }
        }
      }
    }

    // Calculate averages
    if (conversations.length > 0) {
      analytics.stepBudget.avgStepsPerConversation = totalSteps / conversations.length;
      analytics.references.avgReferencesPerConversation =
        analytics.references.totalReferences / conversations.length;

      if (analytics.planAccuracy.totalPlans > 0) {
        analytics.planAccuracy.avgEstimatedVsActual =
          1 - totalEstimatedError / analytics.planAccuracy.totalPlans;
      }
    }

    // Calculate tool average durations
    for (const toolName in analytics.toolUsage) {
      const tool = analytics.toolUsage[toolName];
      tool.avgDuration = tool.count > 0 ? tool.totalDuration / tool.count : 0;
    }

    // Get top referenced items
    const topRefs = Array.from(referenceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Enrich with filenames
    for (const [dataId, count] of topRefs) {
      try {
        if (ObjectId.isValid(dataId)) {
          const item = await db.collection('projectData').findOne(
            { _id: new ObjectId(dataId) },
            { projection: { metadata: 1 } }
          );

          analytics.topReferencedItems.push({
            dataId,
            count,
            filename: item?.metadata?.filename || 'Unknown'
          });
        }
      } catch (error) {
        console.error('Error fetching item for analytics:', error);
        analytics.topReferencedItems.push({
          dataId,
          count,
          filename: 'Unknown'
        });
      }
    }

    // Additional insights
    const insights = {
      mostUsedTool: Object.entries(analytics.toolUsage)
        .sort((a, b) => b[1].count - a[1].count)[0]?.[0] || 'none',

      slowestTool: Object.entries(analytics.toolUsage)
        .sort((a, b) => b[1].avgDuration - a[1].avgDuration)[0]?.[0] || 'none',

      planningAdoptionRate: conversations.length > 0
        ? analytics.conversationsWithPlans / conversations.length
        : 0,

      externalDataUsageRate: analytics.planAccuracy.totalPlans > 0
        ? analytics.planAccuracy.plansWithExternalData / analytics.planAccuracy.totalPlans
        : 0
    };

    return Response.json({
      analytics,
      insights,
      dateRange: {
        start: startDate || 'all time',
        end: endDate || 'present'
      },
      filters: {
        projectId: projectId || 'all projects',
        sessionId: sessionId || 'all sessions'
      }
    });
  } catch (error) {
    console.error('Error generating analytics:', error);
    return Response.json(
      { error: 'Failed to generate analytics' },
      { status: 500 }
    );
  }
}
