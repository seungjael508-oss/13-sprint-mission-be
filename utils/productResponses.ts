type WithWriter = {
  userId?: number;
  user: { id: number; nickname: string };
} & Record<string, unknown>;
type WithOwner = {
  userId?: number;
  comments?: WithWriter[];
} & Record<string, unknown>;

type SerializedWriter<T extends WithWriter> = Omit<T, 'userId' | 'user'> & {
  writer: T['user'];
};

type CommentSource<T extends WithOwner> = 'comments' extends keyof T
  ? NonNullable<T['comments']>[number]
  : never;
type SerializedComments<T extends WithOwner> = 'comments' extends keyof T
  ? { comments: SerializedWriter<CommentSource<T>>[] }
  : unknown;
type SerializedProduct<T extends WithOwner> = Omit<T, 'userId' | 'comments'> & {
  ownerId?: number;
} & SerializedComments<T>;

export function serializeProductResponse<T extends WithOwner>(product: T): SerializedProduct<T> {
  const { userId, comments, ...rest } = product;
  return {
    ...rest,
    ...(comments === undefined ? {} : { comments: comments.map(serializeProductCommentResponse) }),
    ...(userId === undefined ? {} : { ownerId: userId }),
  } as SerializedProduct<T>;
}

export function serializeProductCommentResponse<T extends WithWriter>(comment: T): SerializedWriter<T> {
  const { userId: _userId, user, ...rest } = comment;
  return { ...rest, writer: user };
}
