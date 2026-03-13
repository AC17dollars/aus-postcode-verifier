"use client";

import { type ReactNode } from "react";
import { Provider } from "urql";
import { graphqlClient } from "@/lib/graphql-client";

interface GraphQLProviderProps {
  readonly children: ReactNode;
}

export function GraphQLProvider({ children }: GraphQLProviderProps) {
  return <Provider value={graphqlClient}>{children}</Provider>;
}
