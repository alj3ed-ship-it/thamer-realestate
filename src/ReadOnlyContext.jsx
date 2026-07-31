import { createContext, useContext } from "react";

const ReadOnlyContext = createContext(false);

export function ReadOnlyProvider({ value, children }) {
  return (
    <ReadOnlyContext.Provider value={value}>
      {children}
    </ReadOnlyContext.Provider>
  );
}

export function useReadOnly() {
  return useContext(ReadOnlyContext);
}
