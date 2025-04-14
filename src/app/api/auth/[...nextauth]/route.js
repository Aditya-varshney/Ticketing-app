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
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Email and password are required");
          }
          
          await connectToDatabase();
          
          // Optimize the query by selecting only required fields
          const user = await User.findOne({ 
            where: { email: credentials.email },
            attributes: ['id', 'name', 'email', 'password', 'role', 'profile_image']
          });
          
          if (!user) {
            throw new Error("No user found with this email");
          }
          
          const isPasswordValid = await compare(credentials.password, user.password);
          
          if (!isPasswordValid) {
            throw new Error("Invalid password");
          }
          
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            profile_image: user.profile_image,
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
        token.profile_image = user.profile_image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.profile_image = token.profile_image;
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
    updateAge: 24 * 60 * 60, // 1 day
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false, // Disable debug mode even in development
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
