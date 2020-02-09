export class UnsupportedOperationException extends Error {
  constructor(msg: string) {
    super(`UnsupportedOperationException: ${msg}`);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NoSuchElementException extends Error {
  constructor(msg: string) {
    super(`NoSuchElementException: ${msg}`);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class IllegalStateException extends Error {
  constructor(msg: string) {
    super(`IllegalStateException: ${msg}`);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
