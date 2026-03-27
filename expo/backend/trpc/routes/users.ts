import * as z from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../create-context";
import { db } from "@/backend/db";
import { User } from "@/types";

export const usersRouter = createTRPCRouter({
  register: publicProcedure
    .input(z.object({
      phone: z.string(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      language: z.enum(['en', 'es']).default('en'),
    }))
    .mutation(({ input }) => {
      const existing = db.getUserByPhone(input.phone);
      if (existing) {
        console.log(`[USERS] User already exists: ${input.phone}`);
        db.updateUser(existing.id, { name: input.name, email: input.email });
        return existing;
      }

      const user: User = {
        id: `user_${Date.now()}`,
        phone: input.phone,
        name: input.name,
        email: input.email,
        preferredChannel: 'whatsapp',
        language: input.language,
        notifyOnlyIfSavings: true,
        notifyCoverageRisk: true,
        createdAt: new Date().toISOString(),
      };

      console.log(`[USERS] Creating new user: ${input.phone}`);
      return db.createUser(user);
    }),

  login: publicProcedure
    .input(z.object({ phone: z.string() }))
    .mutation(({ input }) => {
      let user = db.getUserByPhone(input.phone);
      
      if (!user) {
        user = {
          id: `user_${Date.now()}`,
          phone: input.phone,
          preferredChannel: 'whatsapp',
          language: 'en',
          notifyOnlyIfSavings: true,
          notifyCoverageRisk: true,
          createdAt: new Date().toISOString(),
        };
        db.createUser(user);
      }

      console.log(`[USERS] User logged in: ${input.phone}`);
      return user;
    }),

  getProfile: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      return db.getUser(input.userId);
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      userId: z.string(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      language: z.enum(['en', 'es']).optional(),
      preferredChannel: z.enum(['whatsapp', 'sms', 'email']).optional(),
      notifyOnlyIfSavings: z.boolean().optional(),
      notifyCoverageRisk: z.boolean().optional(),
    }))
    .mutation(({ input }) => {
      const { userId, ...updates } = input;
      return db.updateUser(userId, updates);
    }),

  list: publicProcedure.query(() => {
    return db.getAllUsers();
  }),
});
