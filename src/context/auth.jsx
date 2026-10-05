import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase.js";

const AuthContext = createContext({
  user: null,
  loading: true,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(
        auth,
        (nextUser) => {
          setUser(nextUser);
          setLoading(false);
        },
        (error) => {
          console.error(
            "Unable to restore the Firebase sign-in session.",
            error,
          );
          setLoading(false);
        },
      ),
    [],
  );

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
