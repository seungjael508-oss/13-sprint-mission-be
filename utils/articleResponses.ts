type WriterSource = {
  userId?: number;
  user: { id: number; nickname: string };
} & Record<string, unknown>;

function serializeWriter<T extends WriterSource>(source: T) {
  const { userId: _userId, user, ...rest } = source;
  return { ...rest, writer: user };
}

export function serializeArticleResponse<T extends WriterSource>(article: T) {
  return serializeWriter(article);
}

export function serializeArticleCommentResponse<T extends WriterSource>(comment: T) {
  return serializeWriter(comment);
}
