import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import { connectToDatabase } from "@/lib/mariadb/connect";
import { User } from "@/lib/mariadb/models";

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          console.log("NextAuth: Authorization attempt", { email: credentials?.email });
          
          if (!credentials?.email || !credentials?.password) {
            console.error("NextAuth: Email and password are required");
            throw new Error("Email and password are required");
          }
          
          await connectToDatabase();
          console.log("NextAuth: Database connected");
          
          const user = await User.findOne({ where: { email: credentials.email } });
          
          if (!user) {
            console.error("NextAuth: No user found with this email");
            throw new Error("No user found with this email");
          }
          
          console.log("NextAuth: User found, verifying password");
          const isPasswordValid = await compare(credentials.password, user.password);
          
          if (!isPasswordValid) {
            console.error("NextAuth: Invalid password");
            throw new Error("Invalid password");
          }
          
          console.log("NextAuth: Authentication successful", { id: user.id, role: user.role });
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
          };
        } catch (error) {
          console.error("NextAuth: Authorization error", error);
          throw error;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.avatar = user.avatar;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.avatar = token.avatar;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
