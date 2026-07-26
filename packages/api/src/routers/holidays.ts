import { z } from "zod";

import { createTRPCRouter, permissionProcedure } from "../trpc";

export const holidaysRouter = createTRPCRouter({
  addHoliday: permissionProcedure("holiday", "create")
    .input(
      z.object({
        reason: z.string(),
        description: z.string().optional(),
        startDate: z.string().transform((str) => new Date(str)),
        endDate: z.string().transform((str) => new Date(str)),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const holiday = await ctx.db.holidays.create({
        data: {
          reason: input.reason,
          description: input.description ?? null,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      });
      return holiday;
    }),

  deleteHoliday: permissionProcedure("holiday", "delete")
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const holiday = await ctx.db.holidays.delete({
        where: { id: input.id },
      });
      return holiday;
    }),

  editHolidays: permissionProcedure("holiday", "update")
    .input(
      z.object({
        id: z.string(),
        reason: z.string(),
        description: z.string().optional(),
        startDate: z.string().transform((str) => new Date(str)),
        endDate: z.string().transform((str) => new Date(str)),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const holiday = await ctx.db.holidays.update({
        where: { id: input.id },
        data: {
          reason: input.reason,
          description: input.description ?? null,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      });
      return holiday;
    }),
});
