import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: "noreply@pressroom.app",
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  events: {
    createUser: async ({ user }) => {
      // Assign new users to an existing org, or create one
      let org = await db.organization.findFirst();
      if (!org) {
        org = await db.organization.create({
          data: { name: "My Organization", currency: "AUD" },
        });
      }
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).organizationId = (user as any).organizationId;
      }
      return session;
    },
  },
});
