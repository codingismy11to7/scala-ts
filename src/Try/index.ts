import { Either, Left, Right } from "../Either";
import { NoSuchElementException, UnsupportedOperationException } from "../Exceptions";
import { lazily } from "../Lazy";
import { None, Option, Some } from "../Option";

interface TryBase<T> {
  readonly isFailure: boolean;
  readonly isSuccess: boolean;

  failed(): Try<Error>;
  filter(p: (t: T) => boolean): Try<T>;
  flatMap<U>(f: (t: T) => Try<U>): Try<U>;
  fold<U>(fa: (e: Error) => U, fb: (t: T) => U): U;
  foreach<U>(f: (t: T) => U): void;
  get(): T;
  getOrElse<U>(def: () => U): T | U;
  map<U>(f: (t: T) => U): Try<U>;
  orElse<U>(def: () => Try<U>): Try<T | U>;
  recover<U>(f: (e: Error) => U): Try<T | U>;
  recoverWith<U>(f: (e: Error) => Try<U>): Try<T | U>;
  toEither(): Either<Error, T>;
  toOption(): Option<T>;
  transform<U>(s: (t: T) => Try<U>, f: (e: Error) => Try<U>): Try<U>;
}

interface Success<T> extends TryBase<T> {
  readonly isFailure: false;
  readonly isSuccess: true;
  readonly value: T;
}

interface Failure<T> extends TryBase<T> {
  readonly isFailure: true;
  readonly isSuccess: false;
  readonly exception: Error;
}

export type Try<T> = Success<T> | Failure<T>;

class SuccessImpl<T> implements Success<T> {
  readonly isFailure = false;
  readonly isSuccess = true;
  toEither = lazily(() => Right<Error, T>(this.value));
  toOption = lazily(() => Some(this.value));

  constructor(readonly value: T) {}

  failed = () => Failure<UnsupportedOperationException>(new UnsupportedOperationException("Success.failed"));
  filter(p: (t: T) => boolean): Try<T> {
    return this.flatMap(t =>
      p(t) ? this : Failure<T>(new NoSuchElementException(`Predicate does not hold for ${this.value}`)),
    );
  }
  flatMap = <U>(f: (t: T) => Try<U>) => {
    const x = Try(() => f(this.value));
    return x.isFailure ? ((x as unknown) as Try<U>) : x.get();
  };
  fold = <U>(fa: (e: Error) => U, fb: (t: T) => U) =>
    this.map(fb)
      .recover(fa)
      .get();
  foreach = <U>(f: (t: T) => U) => {
    f(this.value);
  };
  get = () => this.value;
  getOrElse = () => this.value;
  map = <U>(f: (t: T) => U) => Try(() => f(this.value));
  orElse = () => this;
  recover = () => this;
  recoverWith = () => this;
  transform = <U>(s: (t: T) => Try<U>, f: (e: Error) => Try<U>) => this.flatMap(s);
}

class FailureImpl<T> implements Failure<T> {
  readonly isFailure = true;
  readonly isSuccess = false;
  toEither = lazily(() => Left<Error, T>(this.exception));

  constructor(readonly exception: Error) {}

  failed = () => Success(this.exception);
  filter = () => this;
  flatMap = <U>() => (this as unknown) as Try<U>;
  fold = <U>(fa: (e: Error) => U) => fa(this.exception);
  foreach = () => {};
  get = () => {
    throw this.exception;
  };
  getOrElse = <U>(def: () => U) => def();
  map = <U>() => (this as unknown) as Try<U>;
  orElse = <U>(def: () => Try<U>) => this.failed().flatMap(def);
  recover = <U>(f: (e: Error) => U) => Try(() => f(this.exception));
  recoverWith = <U>(f: (e: Error) => Try<U>) => this.failed().flatMap(f);
  toOption = () => None;
  transform = <U>(s: (t: T) => Try<U>, f: (e: Error) => Try<U>) => this.failed().flatMap(f);
}

export function Success<T>(value: T): Success<T> {
  return new SuccessImpl(value);
}

export function Failure<T>(exception: Error): Failure<T> {
  return new FailureImpl(exception);
}

export function Try<T>(f: () => T): Try<T> {
  try {
    return Success(f());
  } catch (e) {
    return Failure(e instanceof Error ? e : new Error(e));
  }
}
