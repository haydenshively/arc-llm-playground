import { useEffect, useRef, useState } from "react";

export function useDebouncedMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  delay: number
): T {
  const [state, setState] = useState<T>(() => factory());

  const depsRef = useRef(deps);
  const factoryRef = useRef(factory);

  useEffect(() => {
    depsRef.current = deps;
    factoryRef.current = factory;
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setState(factoryRef.current());
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [delay, ...deps]);

  return state;
}
