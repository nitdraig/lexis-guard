export interface Mutation {
  /** Strategy label for the finding (append, prepend, replace, encode). */
  strategy: string;
  /** The mutated payload. */
  payload: string;
}

/**
 * Deterministic mutation of a seed payload. The number of cases is capped so
 * fuzzing stays bounded and predictable.
 */
export function mutate(seed: string, maxMutations: number): Mutation[] {
  const mutations: Mutation[] = [];

  const encodings: Array<[string, string]> = [
    ['encode', encodeURIComponent(seed)],
    ['encode', encodeURIComponent(seed).replace(/%2f/gi, '%252f')]
  ];

  for (const [strategy, payload] of encodings) {
    if (mutations.length >= maxMutations) break;
    mutations.push({ strategy, payload });
  }

  if (mutations.length < maxMutations) {
    mutations.push({ strategy: 'replace', payload: seed.replace(/[a-z]/g, 'a') });
  }
  if (mutations.length < maxMutations) {
    mutations.push({ strategy: 'prepend', payload: `"${seed}` });
  }
  if (mutations.length < maxMutations) {
    mutations.push({ strategy: 'append', payload: `${seed}'` });
  }

  return mutations.slice(0, maxMutations);
}
