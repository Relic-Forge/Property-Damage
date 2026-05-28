export class ShuffleBag<T> {
  private readonly items: T[];
  private bag: T[] = [];
  private last: T | null = null;

  constructor(items: T[] = []) {
    this.items = [...items];
  }

  next(): T | null {
    if (this.items.length === 0) return null;

    if (this.bag.length === 0) {
      this.bag = [...this.items].sort(() => Math.random() - 0.5);
      if (this.bag[0] === this.last && this.bag.length > 1) {
        [this.bag[0], this.bag[1]] = [this.bag[1], this.bag[0]];
      }
    }

    this.last = this.bag.pop() ?? null;
    return this.last;
  }
}
