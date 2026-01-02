"use client";

import React from "react";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  createHttpLink,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

const ApolloClientProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();

  const httpLink = createHttpLink({
    uri: process.env.NEXT_PUBLIC_BACKEND_URL,
  });

  const authLink = setContext((_, { headers }) => {
    const token = Cookies.get("accessToken"); // Must be non-httpOnly
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : "",
      },
    };
  });

  const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, extensions }) => {
        // Check for UNAUTHENTICATED error
        if (
          extensions?.code === "UNAUTHENTICATED" ||
          message.includes("UNAUTHENTICATED") ||
          message.includes("Unauthorized")
        ) {
          // Clear authentication tokens
          Cookies.remove("accessToken");
          Cookies.remove("organizationId");
          Cookies.remove("logo");

          // Redirect to login
          router.push("/login");
        }
      });
    }

    if (networkError) {
      // Handle network errors (e.g., 401 Unauthorized)
      if ("statusCode" in networkError && networkError.statusCode === 401) {
        // Clear authentication tokens
        Cookies.remove("accessToken");
        Cookies.remove("organizationId");
        Cookies.remove("logo");

        // Redirect to login
        router.push("/login");
      }
    }
  });

  const client = new ApolloClient({
    link: errorLink.concat(authLink).concat(httpLink),
    cache: new InMemoryCache(),
  });

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};

export default ApolloClientProvider;
