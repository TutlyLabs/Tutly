import { z } from "zod";

import { createLogger } from "@tutly/logger";

import {
  compileQuery,
  describeAllowlist,
  geminiResponseSchema,
  MAX_TAKE,
  QueryValidationError,
  queryDslSchema,
  runCompiledQuery,
} from "../lib/aiQueryDsl";
import { createTRPCRouter, staffProcedure } from "../trpc";

const logger = createLogger("api:aiQuery");

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

interface GeminiCandidateResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

interface GeminiModelListResponse {
  models?: {
    name?: string;
    displayName?: string;
    description?: string;
    version?: string;
    supportedGenerationMethods?: string[];
  }[];
}

export const aiQueryRouter = createTRPCRouter({
  getAvailableModels: staffProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    try {
      const account = await ctx.db.account.findFirst({
        where: { userId: currentUser.id, providerId: "gemini" },
      });

      if (!account?.accessToken) {
        return {
          ok: false,
          error:
            "No Gemini API key found. Please configure it in integrations.",
          models: [],
        };
      }

      const response = await fetch(
        `${GEMINI_BASE}/models?key=${account.accessToken}`,
        { method: "GET", headers: { "Content-Type": "application/json" } },
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = (await response.json()) as GeminiModelListResponse;
      const availableModels = (data.models ?? [])
        .filter(
          (model) =>
            model.supportedGenerationMethods?.includes("generateContent") &&
            model.name?.includes("gemini"),
        )
        .map((model) => ({
          name: model.name ?? "",
          displayName: model.displayName ?? model.name?.split("/").pop() ?? "",
          description: model.description ?? "",
          version: model.version ?? "",
        }));

      return { ok: true, models: availableModels };
    } catch (error) {
      logger.error(
        { err: error, userId: currentUser.id },
        "failed to fetch available models",
      );
      return { ok: false, error: "Failed to fetch models", models: [] };
    }
  }),

  /**
   * Natural-language data assistant. The model answers with JSON matching the
   * query DSL in `../lib/aiQueryDsl`; that JSON is validated and compiled to a
   * read-only, organization-scoped Prisma call by our own code. Model output is
   * never executed.
   */
  executeAIQueryCombined: staffProcedure
    .input(
      z.object({
        userQuery: z.string(),
        previousContext: z.string().optional(),
        selectedModel: z.string().optional().default("gemini-2.0-flash"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { userQuery, previousContext, selectedModel } = input;
      const currentUser = ctx.session.user;

      try {
        const account = await ctx.db.account.findFirst({
          where: { userId: currentUser.id, providerId: "gemini" },
        });

        if (!account?.accessToken) {
          return {
            ok: false,
            error:
              "No Gemini API key found. Please configure it in integrations.",
          };
        }

        const organizationId = currentUser.organizationId;
        if (!organizationId) {
          return {
            ok: false,
            error: "Your account is not attached to an organization.",
          };
        }

        const apiKey = account.accessToken;

        const callGemini = async (
          prompt: string,
          maxTokens: number,
          temperature: number,
          responseSchema?: Record<string, unknown>,
          maxRetries = 3,
        ): Promise<string> => {
          const generationConfig: Record<string, unknown> = {
            temperature,
            maxOutputTokens: maxTokens,
          };
          if (responseSchema) {
            generationConfig.responseMimeType = "application/json";
            generationConfig.responseSchema = responseSchema;
          }

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const response = await fetch(
                `${GEMINI_BASE}/${selectedModel}:generateContent?key=${apiKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig,
                  }),
                },
              );

              if (!response.ok) {
                if (response.status >= 500 && attempt < maxRetries) {
                  const waitTime = Math.pow(2, attempt) * 1000;
                  logger.warn(
                    { attempt, maxRetries, waitTime, status: response.status },
                    "gemini api server error, retrying",
                  );
                  await new Promise((resolve) => setTimeout(resolve, waitTime));
                  continue;
                }
                throw new Error(
                  `Gemini API error: ${response.status} after ${attempt} attempts`,
                );
              }

              const data = (await response.json()) as GeminiCandidateResponse;
              return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            } catch (error) {
              if (attempt === maxRetries) throw error;
              const waitTime = 500 + Math.pow(2, attempt) * 1000;
              logger.warn(
                { err: error, attempt, maxRetries, waitTime },
                "gemini api network error, retrying",
              );
              await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
          }

          throw new Error("All retry attempts failed");
        };

        const basePrompt = `You are a query planner for Tutly, a learning management system. Translate the user's question into a JSON query object. You do not write code — you only fill in the JSON structure described below.

The result is executed against one organization's data only; the organization filter is added by the server, so never try to express it yourself.

AVAILABLE MODELS, FIELDS AND RELATIONS (nothing outside this list exists):

${describeAllowlist()}

QUERY OBJECT:
- model: one of the model names above.
- operation: "findMany" (list rows), "findFirst" (one row), "count" (how many), or "aggregate" (numeric summary). Reads only; there is no way to write data.
- select: array of field names on the chosen model. Omit for a sensible default.
- include: array of { relation, select, take } to pull in related rows one level deep.
- countRelations: array of to-many relation names to return counts for (use this for "how many students in each course").
- where: { combinator: "AND" | "OR", conditions: [...], relationConditions: [...] }.
  - conditions: { field, op, value } or { field, op, values } for "in"/"notIn". Operators: equals, not, in, notIn, lt, lte, gt, gte, contains, startsWith, endsWith, isNull, isNotNull. Every value is written as a string; the server converts it to the field's real type.
  - relationConditions: { relation, mode, conditions }. mode is "some"/"every"/"none" for to-many relations and "is"/"isNot" for to-one relations.
- orderBy: array of { field, direction }.
- take: row limit, at most ${MAX_TAKE}.
- aggregate: { count, avg, sum, min, max } where avg/sum/min/max are arrays of numeric field names. Only used with operation "aggregate".

WHO IS ASKING:
- user id: "${currentUser.id}"
- username: "${currentUser.username}"
- role: "${currentUser.role}"
Interpret "my course" as a course whose createdById is that user id. If the question is too vague to pin down a specific course, plan a query that lists the user's courses (model "course", where createdById equals the user id) so they can pick one.

${previousContext ? `PREVIOUS CONVERSATION:\n${previousContext}\n` : ""}
USER QUESTION: "${userQuery}"`;

        let plan: ReturnType<typeof compileQuery> | null = null;
        let dsl: z.infer<typeof queryDslSchema> | null = null;
        let planningError = "";

        for (let attempt = 1; attempt <= 2 && !plan; attempt++) {
          const prompt =
            attempt === 1
              ? basePrompt
              : `${basePrompt}\n\nYour previous attempt was rejected: ${planningError}\nProduce a corrected query object that only uses the listed models and fields.`;

          const raw = await callGemini(prompt, 1024, 0.2, geminiResponseSchema());

          let parsed: unknown;
          try {
            parsed = JSON.parse(raw) as unknown;
          } catch {
            planningError = "The response was not valid JSON.";
            continue;
          }

          const validated = queryDslSchema.safeParse(parsed);
          if (!validated.success) {
            planningError = validated.error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; ");
            continue;
          }

          try {
            plan = compileQuery(validated.data, organizationId);
            dsl = validated.data;
          } catch (error) {
            if (!(error instanceof QueryValidationError)) throw error;
            planningError = error.message;
          }
        }

        if (!plan || !dsl) {
          return {
            ok: false,
            error: `I couldn't turn that into a supported query. ${planningError}`,
          };
        }

        const describedQuery = JSON.stringify(dsl, null, 2);

        let queryResults: unknown;
        try {
          queryResults = await runCompiledQuery(ctx.db, plan);
        } catch (error) {
          // Prisma error text names tables, columns and constraint values, so
          // it is logged but never returned to the client.
          logger.error(
            { err: error, model: plan.model, operation: plan.operation },
            "compiled query execution failed",
          );
          return {
            ok: false,
            error: "Query execution failed",
            query: describedQuery,
          };
        }

        const interpretationPrompt = `You are a helpful AI assistant for Tutly, a learning management system.

Current user: ${currentUser.name} (${currentUser.username}) - Role: ${currentUser.role}

User asked: "${userQuery}"

Query plan that was executed:
${describedQuery}

Query results:
${JSON.stringify(queryResults, null, 2)}

${previousContext ? `Previous context: ${previousContext}` : ""}

SPECIAL HANDLING FOR CLARIFICATION QUERIES:
If the query results show a list of courses and the user's original question was general (like "mentors in my course", "students in my course", "assignments"), then:
1. **Acknowledge their question**
2. **Show the available courses in a clean format**
3. **Ask them to specify which course** they want information about
4. **Provide an example of how to ask** (e.g., "Show me mentors in [Course Name]")

RESPONSE FORMAT REQUIREMENTS:
- Use markdown formatting for better readability
- Use headers (##, ###) to organize information but keep them concise
- **Choose the best format for the data**: bullet points, numbered lists, or tables
- Use **bold** for important information
- Use \`code\` for technical terms, field names, or values
- Use blockquotes (>) for highlighting key insights
- Keep responses conversational and helpful
- Use small, concise formatting - avoid large headers

TIMESTAMP FORMATTING:
- **ALWAYS convert all timestamps to IST (Indian Standard Time)**
- Display timestamps in this format: \`DD/MM/YYYY, HH:MM AM/PM IST\`
- Example: \`15/01/2024, 02:30 PM IST\`
- Apply this to ALL date and time fields in the query results

FORMATTING GUIDELINES:
- Use tables when you have 3+ records with the same structure (like student lists, course rosters, assignment results)
- Use bullet points for simple key-value pairs or short lists
- Use numbered lists for step-by-step information or hierarchical data
- For single values or counts, use simple statements with bold emphasis

Based on the query results, provide a helpful, conversational response to the user's question. Interpret the data meaningfully and offer insights. Choose the most appropriate formatting (tables, lists, or bullet points) based on the data structure.`;

        const assistantResponse =
          (await callGemini(interpretationPrompt, 2048, 0.7)) ||
          "I couldn't generate a response.";

        return {
          ok: true,
          query: describedQuery,
          data: queryResults,
          response: assistantResponse,
          userQuery,
        };
      } catch (error) {
        logger.error({ err: error }, "combined ai query failed");
        return { ok: false, error: "Failed to execute AI query" };
      }
    }),
});
