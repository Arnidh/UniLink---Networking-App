
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Profile, getProfileById } from "@/services/api";
import { useNavigate } from "react-router-dom";

export type UserRole = "student" | "professor" | "alumni";

interface AuthContextType {
  currentUser: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // This function is defined separately to avoid potential infinite loops
  const fetchProfile = async (userId: string) => {
    try {
      console.log("Fetching profile for user:", userId);
      const profileData = await getProfileById(userId);
      
      if (profileData) {
        console.log("Profile fetched:", profileData);
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (currentUser?.id) {
      await fetchProfile(currentUser.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener first to prevent missing events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event);
        setSession(session);
        setCurrentUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to prevent potential recursive issues with Supabase auth
          setTimeout(async () => {
            await fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Existing session check:", session ? "Found" : "None");
      setSession(session);
      setCurrentUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Add useEffect to handle redirects based on authentication
  useEffect(() => {
    if (!isLoading) {
      const currentPath = window.location.pathname;
      
      // Redirect unauthenticated users to signin
      if (!currentUser && !['/', '/signin', '/signup'].includes(currentPath)) {
        navigate('/signin');
        return;
      }
      
      // Redirect authenticated users from signin/signup
      if (profile && (currentPath === '/signin' || currentPath === '/')) {
        // Redirect to role-specific dashboard if on specific page
        if (currentPath === '/signin' || currentPath === '/') {
          navigate('/dashboard');
        }
      }
    }
  }, [profile, isLoading, navigate, currentUser]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      if (data?.user) {
        console.log("Sign in successful:", data.user.id);
        await fetchProfile(data.user.id);
        toast.success('Welcome back!', {
          description: "You've successfully signed in."
        });
      }
    } catch (error: any) {
      console.error("Sign in error:", error.message);
      setError(error.message || "Failed to sign in");
      toast.error('Sign in failed', {
        description: error.message || "An error occurred while signing in"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (name: string, email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role
          }
        }
      });
      
      if (error) throw error;
      
      toast.success('Account created!', {
        description: "Your account has been successfully created."
      });
      
      // Auto sign-in after signup
      if (data.user) {
        setTimeout(async () => {
          await fetchProfile(data.user!.id);
        }, 1000);
      }
    } catch (error: any) {
      setError(error.message || "Failed to sign up");
      toast.error('Sign up failed', {
        description: error.message || "An error occurred while signing up"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
      setCurrentUser(null);
      setSession(null);
      toast.success('Signed out', {
        description: "You've been successfully signed out."
      });
      navigate('/signin');
    } catch (error: any) {
      toast.error('Error signing out', {
        description: error.message || "An error occurred while signing out"
      });
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates as any)
        .eq('id', currentUser.id);
      
      if (error) throw error;
      
      if (profile) {
        setProfile({ ...profile, ...updates });
      }
      
      toast.success('Profile updated', {
        description: "Your profile has been successfully updated."
      });
    } catch (error: any) {
      toast.error('Error updating profile', {
        description: error.message || "An error occurred while updating your profile"
      });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      profile, 
      session,
      isLoading, 
      error, 
      signIn, 
      signUp, 
      signOut,
      updateProfile,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
