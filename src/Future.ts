import { List } from "immutable";
import { IllegalStateException, NoSuchElementException } from "./Exceptions";
import { lazily } from "./Lazy";
import { errorAny } from "./misc";
import { None, Option, OptionEmpty, Some } from "./Option";
import { Failure, FailureAny, Success, Try } from "./Try";

export interface Future<T> {
  toPromise(): Promise<T>;
  onComplete<U>(f: (t: Try<T>) => U): void;
  foreach<U>(f: (t: T) => U): void;
  isCompleted(): boolean;
  value(): Option<Try<T>>;
  transform<S>(f: (t: Try<T>) => Try<S>): Future<S>;
  transform<S>(s: (t: T) => S, f: (e: Error) => Error): Future<S>;
  transformWith<S>(f: (t: Try<T>) => Future<S>): Future<S>;
  failed(): Future<Error>;
  fallbackTo<U>(that: Future<U>): Future<T | U>;
  filter(p: (t: T) => boolean): Future<T>;
  flatMap<S>(f: (t: T) => Future<S>): Future<S>;
  map<S>(f: (t: T) => S): Future<S>;
  mapTo<S>(): Future<S>;
  recover<U>(f: (e: Error) => U): Future<T | U>;
  recoverWith<U>(f: (e: Error) => Future<U>): Future<T | U>;
  zip<U>(that: Future<U>): Future<[T, U]>;
  zipWith<U>(that: Future<U>): <R>(f: (t: T, u: U) => R) => Future<R>;
}

export function futureFromPromise<T>(jP: Promise<T>): Future<T> {
  const p = newPromiseF<T>();
  jP.then(t => p.success(t)).catch(e => p.failureAny(e));
  return p.future();
}
export function newFuture<T>(body: () => T): Future<T> {
  return futureFromPromise(
    new Promise<T>(resolve => resolve(body())),
  );
}
export function failedFuture<T>(exception: Error): Future<T> {
  return failedPromiseF<T>(exception).future();
}

export function findFuture<T>(futures: Iterable<Future<T>>): (p: (t: T) => boolean) => Future<Option<T>> {
  return p => {
    const promise = newPromiseF<Option<T>>();
    const fs = List(futures);
    fs.forEach(f =>
      f.foreach(t => {
        if (p(t)) promise.trySuccess(Some(t));
      }),
    );
    const loop: (rem: List<Future<T>>) => void = rem => {
      if (rem.isEmpty()) promise.trySuccess(None);
      else rem.get(0)!.onComplete(() => loop(rem.shift()));
    };
    loop(fs);
    return promise.future();
  };
}

export function firstCompletedOf<T>(futures: Iterable<Future<T>>): Future<T> {
  const p = newPromiseF<T>();
  List(futures).forEach(f => f.onComplete(t => p.tryComplete(t)));
  return p.future();
}

export function foldFuturesLeftL<T, R>(futures: List<Future<T>>): (zero: R) => (op: (r: R, t: T) => R) => Future<R> {
  return zero => op => {
    const loop: (rem: List<Future<T>>, acc: R) => Future<R> = (rem, acc) =>
      rem.isEmpty() ? successfulFuture(acc) : rem.get(0)!.flatMap(v => loop(rem.shift(), op(acc, v)));

    return loop(futures, zero);
  };
}

export function foldFuturesLeft<T, R>(...futures: Future<T>[]): (zero: R) => (op: (r: R, t: T) => R) => Future<R> {
  return foldFuturesLeftL(List(futures));
}

export function futureFromTry<T>(result: Try<T>): Future<T> {
  return promiseFromTry(result).future();
}

export function reduceFuturesLeftL<T, R>(futures: List<Future<T>>): (op: (r: R | T, t: T) => R) => Future<R | T> {
  return op =>
    futures.isEmpty()
      ? failedFuture(new NoSuchElementException("reduceLeft attempted on empty collection"))
      : futures.get(0)!.flatMap(init => foldFuturesLeftL<T, R | T>(futures.shift())(init)(op));
}

export function reduceFuturesLeft<T, R>(...futures: Future<T>[]): (op: (r: R | T, t: T) => R) => Future<R | T> {
  return reduceFuturesLeftL(List(futures));
}

export function sequenceFuturesL<A>(inp: List<Future<A>>): Future<List<A>> {
  return traverseFuturesL<Future<A>, A>(inp)(a => a);
}

export function sequenceFutures<A>(...inp: Future<A>[]): Future<A[]> {
  return sequenceFuturesL<A>(List(inp)).map(as => as.toArray());
}

export function successfulFuture<T>(result: T): Future<T> {
  return successfulPromiseF(result).future();
}

export function traverseFuturesL<A, B>(inp: List<A>): (fn: (a: A) => Future<B>) => Future<List<B>> {
  return fn => {
    const loop: (rem: List<A>, acc: List<B>) => Future<List<B>> = (rem, acc) =>
      rem.isEmpty()
        ? successfulFuture(acc)
        : fn(rem.get(0)!)
            .map(b => acc.push(b))
            .flatMap(bs => loop(rem.shift(), bs));

    return loop(inp, List());
  };
}
export function traverseFutures<A, B>(...inp: A[]): (fn: (a: A) => Future<B>) => Future<B[]> {
  return fn => traverseFuturesL<A, B>(List(inp))(fn).map(bs => bs.toArray());
}

export const futureUnit: () => Future<void> = lazily(() => newFuture(() => {}));
export const futureNever: () => Future<never> = lazily(() => futureFromPromise(new Promise(() => {})));

export interface PromiseF<T> {
  future(): Future<T>;
  isCompleted(): boolean;
  tryComplete(result: Try<T>): boolean;
  complete(result: Try<T>): this;
  completeWith(other: Future<T>): this;
  failure(cause: Error): this;
  failureAny(cause: any): this;
  success(value: T): this;
  tryFailure(cause: Error): boolean;
  trySuccess(value: T): boolean;
}

export function newPromiseF<T>(): PromiseF<T> {
  return PromiseFPromise.unfulfilled();
}

export function failedPromiseF<T>(exception: Error): PromiseF<T> {
  return promiseFromTry<T>(Failure(exception));
}
export function promiseFromTry<T>(result: Try<T>): PromiseF<T> {
  return PromiseFPromise.fulfilled(result);
}
export function successfulPromiseF<T>(result: T): PromiseF<T> {
  return promiseFromTry(Success(result));
}

const failure = <T>(e: any) => FailureAny<T>(e);

class PromiseFPromise<T> implements PromiseF<T>, Future<T> {
  static unfulfilled<T>(): PromiseF<T> {
    let pResolve: (t: T) => void;
    let pReject: (e: Error) => void;
    const jPromise = new Promise<T>((resolve, reject) => {
      pResolve = resolve;
      pReject = reject;
    });
    // noinspection JSUnusedAssignment
    return new PromiseFPromise(jPromise, pResolve!, pReject!);
  }

  static fulfilled<T>(t: Try<T>) {
    const p = t.isSuccess ? Promise.resolve(t.value) : Promise.reject(t.exception);
    return new PromiseFPromise<T>(
      p,
      () => {},
      () => {},
      Some(t),
    );
  }

  private constructor(
    private readonly p: Promise<T>,
    private readonly resolve: (t: T) => void,
    private readonly reject: (e: Error) => void,
    private _value: Option<Try<T>> = OptionEmpty<Try<T>>(),
  ) {}

  future = () => this;

  isCompleted = () => this._value.isDefined;

  tryComplete = (result: Try<T>) => {
    if (this._value.isEmpty) {
      this._value = Some(result);
      result.fold(
        e => this.reject(e),
        t => this.resolve(t),
      );
      return true;
    } else {
      return false;
    }
  };
  tryFailure = (cause: Error) => this.tryComplete(Failure(cause));
  trySuccess = (value: T) => this.tryComplete(Success(value));

  complete = (result: Try<T>) => {
    if (this.tryComplete(result)) {
      return this;
    } else throw new IllegalStateException("Promise already completed.");
  };
  failure = (cause: Error) => this.complete(Failure(cause));
  failureAny = (cause: any) => this.complete(FailureAny(cause));
  success = (value: T) => this.complete(Success(value));

  completeWith = (other: Future<T>) => {
    if (other !== this) {
      other.onComplete(t => this.tryComplete(t));
    }
    return this;
  };

  toPromise = () => this.p;

  onComplete = <U>(f: (t: Try<T>) => U) => {
    this.p.then(t => f(Success(t))).catch(e => f(failure<T>(e)));
  };

  foreach = <U>(f: (t: T) => U) => {
    this.p.then(f);
  };

  value = () => this._value;

  mapTo = <S>() => (this as unknown) as Future<S>;

  flatMap = <S>(f: (t: T) => Future<S>) => {
    const p = newPromiseF<S>();
    this.p.then(t => p.completeWith(f(t))).catch(e => p.failureAny(e));
    return p.future();
  };

  map = <S>(f: (t: T) => S) => {
    const p = newPromiseF<S>();
    this.p.then(t => p.success(f(t))).catch(e => p.failureAny(e));
    return p.future();
  };

  filter = (p: (t: T) => boolean) =>
    this.flatMap(t =>
      p(t)
        ? successfulFuture(t)
        : failedFuture<T>(new NoSuchElementException("Future.filter predicate is not satisfied")),
    );

  failed = () => {
    const p = newPromiseF<Error>();
    this.p
      .then(() => p.failure(new NoSuchElementException("Future.failed not completed with a throwable.")))
      .catch(e => p.success(errorAny(e)));
    return p.future();
  };

  fallbackTo = <U>(that: Future<U>) => {
    const p = newPromiseF<T | U>();
    this.p
      .then(t => p.success(t))
      .catch(e => {
        that.onComplete(t => (t.isSuccess ? p.success(t.value) : p.failureAny(e)));
      });
    return p.future();
  };

  recover = <U>(f: (e: Error) => U) => {
    const p = newPromiseF<T | U>();
    this.p.then(t => p.success(t)).catch(e => p.complete(Try(() => f(errorAny(e)))));
    return p.future();
  };

  recoverWith = <U>(f: (e: Error) => Future<U>) => {
    const p = newPromiseF<T | U>();
    this.p
      .then(t => p.success(t))
      .catch(e => {
        try {
          p.completeWith(f(errorAny(e)));
        } catch (e) {
          p.failureAny(e);
        }
      });
    return p.future();
  };

  transform<S>(): Future<S> {
    return arguments.length === 1 ? this.transformA<S>(arguments[0]) : this.transformB<S>(arguments[0], arguments[1]);
  }

  transformWith = <S>(f: (t: Try<T>) => Future<S>) => {
    const p = newPromiseF<S>();
    this.onComplete(t => {
      try {
        p.completeWith(f(t));
      } catch (e) {
        p.failureAny(e);
      }
    });
    return p.future();
  };

  zip = <U>(that: Future<U>) => this.zipWith(that)<[T, U]>((t, u) => [t, u]);

  zipWith = <U>(that: Future<U>) => <R>(f: (t: T, u: U) => R) => this.flatMap(t => that.map(u => f(t, u)));

  private transformA = <S>(f: (t: Try<T>) => Try<S>) => {
    const p = newPromiseF<S>();
    this.p
      .then(t => Success(t))
      .catch(e => failure<T>(e))
      .then(t => {
        try {
          p.complete(f(t));
        } catch (e) {
          p.failureAny(e);
        }
      });
    return p.future();
  };

  private transformB = <S>(s: (t: T) => S, f: (e: Error) => Error) => {
    const p = newPromiseF<S>();
    this.p
      .then(t => {
        try {
          p.success(s(t));
        } catch (e) {
          p.failureAny(e);
        }
      })
      .catch(e => {
        try {
          p.failure(f(errorAny(e)));
        } catch (e) {
          p.failureAny(e);
        }
      });
    return p.future();
  };
}
