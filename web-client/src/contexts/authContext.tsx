import { createContext, useContext, useEffect, useRef, useState } from "react";
import { User } from "../types";
import {
  getTokenFromLocalStorage,
  parseJwt,
  saveTokenToLocalStorage,
} from "../utils";
import api, { setJwt } from "../utils/api";
import useRefreshComponent from "../hooks/useRefreshComponent";
import useToast from "../hooks/useToast";

interface AuthContextType {
  login: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (code: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    confirmpassword: string
  ) => Promise<void>;
  user: User | undefined;
  authenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthContextProvider(props: { children: React.ReactNode }) {
  const flag = useRef(false);
  const temporaryAccessToken = useRef("");

  const [user, setUser] = useState<User>();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshComponent = useRefreshComponent();
  const toast = useToast();

  async function fetchUser() {
    if (authenticated) {
      const userResponse = await api.user.getCurrentUser();
      if (userResponse) setUser(userResponse.user);
    }
  }

  async function login(email: string, password: string) {
    const success = await api.auth
      .login(email, password)
      .catch((err) =>
        toast.error({ title: err.errMsg || "something went wrong" })
      );
    if (!success) return;

    if (success.token) {
      saveTokenToLocalStorage(success.token);
    }
    temporaryAccessToken.current = success.token;

    setAuthenticated(true);
    setTimeout(() => {
      refreshComponent.byId("page");
    }, 10);
  }

  async function register(
    name: string,
    email: string,
    password: string,
    confirmpassword: string
  ) {
    const success = await api.auth
      .register(name, email, password, confirmpassword)
      .catch((err) =>
        toast.error({ title: err.errMsg || "something went wrong" })
      );
    if (!success) return;

    temporaryAccessToken.current = success.token;

    if (success.token) {
      saveTokenToLocalStorage(success.token);
    }

    setAuthenticated(true);
    setTimeout(() => {
      refreshComponent.byId("page");
    }, 10);
  }

  async function signInWithGoogle(code: string) {
    const success = await api.auth
      .loginWithGoogle(code)
      .catch((err) =>
        toast.error({ title: err.Msg || "something went wrong" })
      );
    if (!success) return;

    saveTokenToLocalStorage(success.token);
    // localStorage.removeItem("mixr-la

    setAuthenticated(true);
    setTimeout(() => {
      refreshComponent.byId("page");
    }, 10);
  }

  useEffect(() => {
    if (!flag.current) {
      setAuthenticated(false);
      const localToken = getTokenFromLocalStorage();
      if (localToken) {
        if (Number(parseJwt(localToken).exp) < Date.now() / 1000) {
          api.auth.logout();
        }
        setJwt(localToken);
        setAuthenticated(true);
      }

      flag.current = true;

      setTimeout(() => {
        setLoading(false);
      }, 10);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [authenticated]);

  const value: AuthContextType = {
    login,
    register,
    user,
    authenticated,
    loading,
    signInWithGoogle,
  };

  return (
    <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
