export interface Retriever<TQuery, TResult> {
  retrieve(query: TQuery): Promise<TResult[]>;
}

export interface Reranker<TInput, TContext, TOutput> {
  rerank(items: TInput[], context: TContext): TOutput[];
}
