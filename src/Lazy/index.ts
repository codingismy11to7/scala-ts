class LazyVal<T> {
  private creator?: () => T;
  private value?: T;
  private created = false;

  constructor(creator: () => T) {
    this.creator = creator;
  }

  get() {
    if (!this.created) {
      this.value = this.creator!();
      this.creator = undefined;
      this.created = true;
    }
    return this.value!;
  }
}

export function lazily<T>(creator: () => T): () => T {
  const lv = new LazyVal(creator);
  return () => lv.get();
}
