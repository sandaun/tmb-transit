declare module 'gtfs-rt-bindings' {
  interface FeedMessageCodec {
    decode(buffer: Uint8Array): unknown;
    toObject(
      message: unknown,
      options: {
        arrays: boolean;
        defaults: boolean;
        enums: StringConstructor;
        longs: StringConstructor;
        objects: boolean;
      },
    ): unknown;
  }

  export const FeedMessage: FeedMessageCodec;
}
