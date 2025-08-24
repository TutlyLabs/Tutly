import { z } from "zod";

import { db } from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { PRISMA_SCHEMA, SCHEMA_CONTEXT } from "@/lib/prismaSchema";

export const aiQueryRouter = createTRPCRouter({
  getAvailableModels: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    try {
      // Get user's Gemini API key
      const account = await db.account.findFirst({
        where: {
          userId: currentUser.id,
          providerId: "gemini",
        },
      });

      if (!account?.accessToken) {
        return {
          ok: false,
          error:
            "No Gemini API key found. Please configure it in integrations.",
          models: [],
        };
      }

      // Fetch available models from Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${account.accessToken}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const models = data.models || [];

      // Filter for text generation models and extract relevant info
      const availableModels = models
        .filter(
          (model: any) =>
            model.supportedGenerationMethods?.includes("generateContent") &&
            model.name.includes("gemini"),
        )
        .map((model: any) => ({
          name: model.name,
          displayName: model.displayName || model.name.split("/").pop(),
          description: model.description || "",
          version: model.version || "",
        }));

      return {
        ok: true,
        models: availableModels,
      };
    } catch (error) {
      console.error("Failed to fetch models:", error);
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch models",
        models: [],
      };
    }
  }),

  executeAIQueryCombined: protectedProcedure
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
        // Get user's Gemini API key
        const account = await db.account.findFirst({
          where: {
            userId: currentUser.id,
            providerId: "gemini",
          },
        });

        if (!account?.accessToken) {
          return {
            ok: false,
            error:
              "No Gemini API key found. Please configure it in integrations.",
          };
        }

        // Helper function to make API calls with retry logic
        const makeGeminiRequest = async (
          prompt: string,
          maxTokens: number,
          temperature: number,
          maxRetries = 3,
        ): Promise<Response> => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent?key=${account.accessToken}`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    contents: [
                      {
                        parts: [{ text: prompt }],
                      },
                    ],
                    generationConfig: {
                      temperature: temperature,
                      maxOutputTokens: maxTokens,
                    },
                  }),
                },
              );

              if (!response.ok) {
                if (response.status === 503 && attempt < maxRetries) {
                  // Service unavailable - wait and retry
                  const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
                  console.log(
                    `Gemini API 503 error on attempt ${attempt}/${maxRetries}, retrying in ${waitTime}ms`,
                  );
                  await new Promise((resolve) => setTimeout(resolve, waitTime));
                  continue;
                } else if (response.status >= 500 && attempt < maxRetries) {
                  // Other server errors - retry with backoff
                  const waitTime = Math.pow(2, attempt) * 1000;
                  console.log(
                    `Gemini API ${response.status} error on attempt ${attempt}/${maxRetries}, retrying in ${waitTime}ms`,
                  );
                  await new Promise((resolve) => setTimeout(resolve, waitTime));
                  continue;
                } else {
                  // Client error or max retries reached
                  throw new Error(
                    `Gemini API error: ${response.status} after ${attempt} attempts`,
                  );
                }
              }

              return response;
            } catch (error) {
              if (attempt === maxRetries) {
                throw error;
              }
              // Network error - wait 500ms base + exponential backoff and retry
              const waitTime = 500 + Math.pow(2, attempt) * 1000;
              console.log(
                `Network error on attempt ${attempt}/${maxRetries}, retrying in ${waitTime}ms`,
              );
              await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
          }

          // This should never be reached due to the throw in the catch above, but TypeScript needs it
          throw new Error("All retry attempts failed");
        };

        // Step 1: Generate Prisma Query
        const queryGenerationPrompt = `You are a Prisma query generator for a learning management system. Generate ONLY a safe Prisma query based on the user's request.

FIRST: Check if the user's query needs clarification for specific course/assignment/quiz selection.

IF THE QUERY IS TOO GENERAL AND NEEDS CLARIFICATION:
- If user asks about "my course" but teaches multiple courses, generate a query to list their courses first
- If user asks about mentors without specifying course, list available courses first
- If user asks about assignments without specifying course, list courses first
- If user asks about students without specifying course, list courses first

EXAMPLES OF QUERIES NEEDING CLARIFICATION:
- "Who are the mentors in my course?" → First show: db.course.findMany({ where: { createdById: "${currentUser.id}" }, select: { id: true, title: true } })
- "What assignments are due?" → First show: db.course.findMany({ where: { createdById: "${currentUser.id}" }, select: { id: true, title: true } })
- "Show me students in my course" → First show: db.course.findMany({ where: { createdById: "${currentUser.id}" }, select: { id: true, title: true } })

SECURITY RULES BASED ON USER ROLE:

${
  currentUser.role === "INSTRUCTOR" || currentUser.role === "ADMIN"
    ? `
INSTRUCTOR/ADMIN PRIVILEGES:
1. Can perform: findMany, findFirst, count, aggregate, groupBy
2. CANNOT perform: create, update, delete, upsert, updateMany, deleteMany (read-only access)
3. ALWAYS use 'select' to specify only necessary fields for read operations
4. NEVER select sensitive fields like: password, access_token, refresh_token, oneTimePassword, auth, p256dh
5. Use proper where clauses for data security
6. Current user ID: "${currentUser.id}", username: "${currentUser.username}", role: "${currentUser.role}"
`
    : `
STUDENT/MENTOR RESTRICTIONS:
1. ONLY generate read operations (findMany, findFirst, count, aggregate, groupBy)
2. NO mutations (create, update, delete, upsert, updateMany, deleteMany) allowed
3. ALWAYS use 'select' to specify only necessary fields
4. NEVER select sensitive fields like: password, access_token, refresh_token, oneTimePassword, auth, p256dh
5. Always include proper where clauses for data security
6. Current user ID: "${currentUser.id}", username: "${currentUser.username}", role: "${currentUser.role}"
`
}

CRITICAL PRISMA SYNTAX RULES:
1. For counting relations, use _count: { relationName: true } in select
2. For relation fields in select, use: { select: { field: true } }
3. NEVER use count: true inside a relation select - this is INVALID
4. For simple counts, use db.model.count()
5. For aggregations, use db.model.aggregate()

IMPORTANT WHERE CLAUSE RULES:
1. NEVER use empty strings in where clauses: { where: { id: "" } } is INVALID
2. NEVER use null directly: { where: { userId: null } } is INVALID
3. For null checks, use: { where: { userId: { equals: null } } } or { where: { userId: { not: null } } }
4. Always use meaningful values in where clauses
5. For optional filters, omit the where clause entirely rather than using empty values

SENSITIVE FIELDS TO NEVER SELECT:
- password, oneTimePassword (from User)
- access_token, refresh_token, id_token, token_type (from Account)
- auth, p256dh (from PushSubscription)
- Any field containing "token", "password", "secret", "key"

PRISMA SCHEMA:
${PRISMA_SCHEMA}

ADDITIONAL CONTEXT:
${SCHEMA_CONTEXT}

${previousContext ? `Previous context: ${previousContext}` : ""}

User query: "${userQuery}"

IMPORTANT: Return ONLY the Prisma query code, nothing else. No explanations, no markdown, no additional text.
- Do NOT include "prisma" prefix
- Do NOT include "await" keyword  
- Do NOT include any explanatory text
- Start directly with "db."
- End after the closing parenthesis and semicolon (if any)

Query:`;

        const queryResponse = await makeGeminiRequest(
          queryGenerationPrompt,
          1024,
          0.2,
        );

        const queryData = await queryResponse.json();
        let generatedQuery =
          queryData.candidates?.[0]?.content?.parts?.[0]?.text || "";

        generatedQuery = generatedQuery
          .trim()
          .replace(/```javascript/g, "")
          .replace(/```js/g, "")
          .replace(/```/g, "")
          .replace(/^await\s+/, "")
          .replace(/^prisma\s*/g, "")
          .replace(/^\s*[\r\n]+/g, "")
          .trim();

        const dbQueryMatch = generatedQuery.match(/db\.[^;]+/);
        if (dbQueryMatch) {
          generatedQuery = dbQueryMatch[0];
        }

        // Basic safety checks
        if (!generatedQuery.startsWith("db.")) {
          return {
            ok: false,
            error: "Invalid query format",
            query: generatedQuery,
          };
        }

        // Security checks
        const mutationOps = [
          "create",
          "update",
          "delete",
          "upsert",
          "deleteMany",
          "updateMany",
        ];

        // Block all mutation operations for everyone (read-only system)
        if (mutationOps.some((op) => generatedQuery.includes(`.${op}(`))) {
          return {
            ok: false,
            error:
              "Only read operations are allowed. This system is read-only for data integrity.",
            query: generatedQuery,
          };
        }

        // Security check: Ensure read queries use select (not required for mutations)
        const isReadOperation = ["findFirst", "findMany", "findUnique"].some(
          (op) => generatedQuery.includes(`.${op}(`),
        );
        if (isReadOperation && !generatedQuery.includes("select:")) {
          return {
            ok: false,
            error:
              "Read queries must use select to specify fields for security",
            query: generatedQuery,
          };
        }

        // Security check: Block sensitive fields
        const sensitiveFields = [
          "password",
          "oneTimePassword",
          "access_token",
          "refresh_token",
          "id_token",
          "token_type",
          "auth",
          "p256dh",
          "secret",
          "key",
        ];

        const hasSensitiveField = sensitiveFields.some((field) =>
          generatedQuery.toLowerCase().includes(field.toLowerCase()),
        );

        if (hasSensitiveField) {
          return {
            ok: false,
            error: "Query contains sensitive fields that are not allowed",
            query: generatedQuery,
          };
        }

        // Step 2: Execute the query with intelligent retry (regenerate on failure)
        let queryResults;
        let queryGenerationAttempts = 0;
        const maxQueryAttempts = 3;
        let currentQuery = generatedQuery;

        while (queryGenerationAttempts < maxQueryAttempts) {
          try {
            queryGenerationAttempts++;

            // Wait 500ms before each attempt (except the first one)
            if (queryGenerationAttempts > 1) {
              console.log(
                `Query execution attempt ${queryGenerationAttempts}/${maxQueryAttempts}, waiting 500ms...`,
              );
              await new Promise((resolve) => setTimeout(resolve, 500));
            }

            const executeQuery = (db: any) => {
              return eval(currentQuery);
            };
            queryResults = await executeQuery(db);

            // Success - update the final query used
            generatedQuery = currentQuery;
            break; // Exit the retry loop
          } catch (queryError) {
            console.error(
              `Query execution error on attempt ${queryGenerationAttempts}:`,
              queryError,
            );

            if (queryGenerationAttempts === maxQueryAttempts) {
              // Max retries reached - return error
              return {
                ok: false,
                error: `Query execution failed after ${maxQueryAttempts} attempts: ${queryError instanceof Error ? queryError.message : "Unknown error"}`,
                query: currentQuery,
              };
            }

            // Generate a corrected query based on the error
            try {
              const errorCorrectionPrompt = `You are a Prisma query generator. The previous query failed with an error. Generate a CORRECTED Prisma query.

ORIGINAL USER REQUEST: "${userQuery}"

FAILED QUERY:
${currentQuery}

ERROR MESSAGE:
${queryError instanceof Error ? queryError.message : String(queryError)}

SECURITY RULES (SAME AS BEFORE):
${
  currentUser.role === "INSTRUCTOR" || currentUser.role === "ADMIN"
    ? `
- Can perform: findMany, findFirst, count, aggregate, groupBy (READ-ONLY)
- CANNOT perform: create, update, delete, upsert, updateMany, deleteMany
`
    : `
- ONLY read operations: findMany, findFirst, count, aggregate, groupBy
- CANNOT perform: create, update, delete, upsert, updateMany, deleteMany
`
}

CRITICAL FIXES NEEDED:
1. Fix the exact syntax error mentioned in the error message
2. Ensure proper Prisma syntax (use _count: { relation: true } for counting)
3. Never use count: true inside relation selects
4. Use proper where clauses with valid values
5. For read operations, always include select with safe fields

CORRECTED QUERY (return ONLY the corrected Prisma query, nothing else):`;

              const correctionResponse = await makeGeminiRequest(
                errorCorrectionPrompt,
                1024,
                0.1,
              );
              const correctionData = await correctionResponse.json();

              let correctedQuery =
                correctionData.candidates?.[0]?.content?.parts?.[0]?.text || "";

              // Clean up the corrected query
              correctedQuery = correctedQuery
                .trim()
                .replace(/```javascript/g, "")
                .replace(/```js/g, "")
                .replace(/```/g, "")
                .replace(/^await\s+/, "")
                .replace(/^prisma\s*/g, "") // Remove "prisma" prefix
                .replace(/^\s*[\r\n]+/g, "") // Remove leading newlines
                .trim();

              // Additional cleaning - extract the actual db query if it's wrapped in text
              const correctedDbQueryMatch = correctedQuery.match(/db\.[^;]+/);
              if (correctedDbQueryMatch) {
                correctedQuery = correctedDbQueryMatch[0];
              }

              if (correctedQuery.startsWith("db.")) {
                currentQuery = correctedQuery;
                console.log(
                  `Generated corrected query attempt ${queryGenerationAttempts + 1}: ${correctedQuery}`,
                );
              } else {
                console.error(
                  "Failed to generate valid corrected query, using original",
                );
              }
            } catch (correctionError) {
              console.error(
                "Failed to generate corrected query:",
                correctionError,
              );
              // Continue with original query for final attempt
            }
          }
        }

        // Step 3: Generate AI interpretation
        const interpretationPrompt = `You are a helpful AI assistant for Tutly, a learning management system. 

Current user: ${currentUser.name} (${currentUser.username}) - Role: ${currentUser.role}

User asked: "${userQuery}"

Executed Prisma query:
${generatedQuery}

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
- For relative times, also include IST: \`2 hours ago (15/01/2024, 02:30 PM IST)\`
- Apply this to ALL date and time fields in the query results

DATA FORMATTING OPTIONS:

**For tabular data** (multiple records with same fields), use markdown tables:
| Field Name | Value 1 | Value 2 |
|------------|---------|---------|
| **Course** | \`React Fundamentals\` | \`JavaScript Advanced\` |
| **Students** | \`25\` | \`18\` |

**For simple lists**, use bullet points:
• **Course 1**: \`Introduction to React\` (Students: \`25\`)
• **Course 2**: \`Advanced JavaScript\` (Students: \`18\`)

**For statistics**, use bullet points:
• **Total Students**: \`43\`
• **Active Courses**: \`5\`
• **Completion Rate**: \`85%\`

**For nested data**, use numbered lists:
1. **Course Name**: \`React Fundamentals\`
   • Students enrolled: \`12\`
   • Start date: \`2024-01-15\`
   • Status: \`Active\`

FORMATTING GUIDELINES:
- Use tables when you have 3+ records with the same structure (like student lists, course rosters, assignment results)
- Use bullet points for simple key-value pairs or short lists
- Use numbered lists for step-by-step information or hierarchical data
- For single values or counts, use simple statements with bold emphasis

Based on the query results, provide a helpful, conversational response to the user's question. Interpret the data meaningfully and offer insights. Choose the most appropriate formatting (tables, lists, or bullet points) based on the data structure.`;

        const interpretationResponse = await makeGeminiRequest(
          interpretationPrompt,
          2048,
          0.7,
        );

        const interpretationData = await interpretationResponse.json();
        const assistantResponse =
          interpretationData.candidates?.[0]?.content?.parts?.[0]?.text ||
          "I couldn't generate a response.";

        return {
          ok: true,
          query: generatedQuery,
          data: queryResults,
          response: assistantResponse,
          userQuery,
        };
      } catch (error) {
        console.error("Combined AI Query error:", error);
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to execute AI query",
        };
      }
    }),
});
