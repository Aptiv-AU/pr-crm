import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: "noreply@notify.aptiv.com.au",
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  events: {
    createUser: async ({ user }) => {
      // Each signup gets its own org. An invite-token flow is required
      // before two users can share an org — auto-joining the oldest org
      // (the previous behaviour) silently exposed every existing tenant.
      const org = await db.organization.create({
        data: { name: "My Organization", currency: "AUD" },
      });
      await db.user.update({
        where: { id: user.id! },
        data: { organizationId: org.id },
      });
    },
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.organizationId = (user as { organizationId?: string | null })
          .organizationId ?? null;
      }
      return session;
    },
  },
});
