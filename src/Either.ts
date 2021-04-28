import { List, Set, ValueObject } from "immutable";
import { equalityFunction, hashFunction } from "./equality";
import { lazily } from "./Lazy";
import { None, Option, Some } from "./Option";
import { UndefOr } from "./UndefOr";

interface EitherBase<A, B> extends ValueObject {
  readonly isLeft: boolean;
  readonly isRight: boolean;

  exists(f: (b: B) => boolean): boolean;
  filterOrElse<A1>(p: (b: B) => boolean, zero: () => A1): Either<A | A1, B>;
  flatMap<A1, B1>(f: (b: B) => Either<A1, B1>): Either<A, B> | Either<A1, B1>;
  fold<C, D>(fa: (a: A) => C, fb: (b: B) => D): C | D;
  forall(f: (b: B) => boolean): boolean;
  foreach<U>(f: (b: B) => U): void;
  getOrElse<B1>(or: () => B1): B | B1;
  left(): LeftProjection<A, B>;
  map<B1>(f: (b: B) => B1): Either<A, B1>;
  orElse<A1, B1>(or: () => Either<A1, B1>): Either<A, B> | Either<A1, B1>;
  swap(): Either<B, A>;
  toOption(): Option<B>;
  toUndefOr(): UndefOr<B>;
  toArray(): B[];
  toList(): List<B>;
  toSet(): Set<B>;
}

export interface Left<A, B> extends EitherBase<A, B> {
  readonly isLeft: true;
  readonly isRight: false;
  readonly value: A;
}

export interface Right<A, B> extends EitherBase<A, B> {
  readonly isLeft: false;
  readonly isRight: true;
  readonly value: B;
}

export type Either<A, B> = Left<A, B> | Right<A, B>;

class LeftImpl<A, B> implements Left<A, B> {
  readonly isLeft = true;
  readonly isRight = false;
  left: () => LeftProjection<A, B> = lazily(() => new LeftProjection<A, B>(this));
  swap = lazily(() => Right<A, B>(this.value));

  constructor(readonly value: A) {}

  exists = () => false;
  filterOrElse = () => this;
  flatMap = () => this;
  fold = <C, D>(fa: (a: A) => C, fb: (b: B) => D) => fa(this.value);
  forall = () => true;
  foreach = () => {};
  getOrElse = <B1>(or: () => B1) => or();
  map = <B1>() => (this as unknown) as Either<A, B1>;
  orElse = <A1, B1>(or: () => Either<A1, B1>) => or();
  toOption = () => None;
  toUndefOr = () => undefined;
  toArray = () => [];
  toList = () => List();
  toSet = () => Set();

  hashCode = () => hashFunction()(this.value);
  equals = (other: any) => (other instanceof LeftImpl ? equalityFunction()(this.value, other.value) : false);
}

class RightImpl<A, B> implements Right<A, B> {
  readonly isLeft = false;
  readonly isRight = true;
  left: () => LeftProjection<A, B> = lazily(() => new LeftProjection<A, B>(this));
  swap = lazily(() => Left<B, A>(this.value));
  toOption = lazily(() => Some(this.value));
  toList = lazily(() => List.of(this.value));
  toSet = lazily(() => Set.of(this.value));

  constructor(readonly value: B) {}

  exists = (f: (b: B) => boolean) => f(this.value);
  filterOrElse = <A1>(p: (b: B) => boolean, zero: () => A1) => (p(this.value) ? this : Left<A1, B>(zero()));
  flatMap = <A1, B1>(f: (b: B) => Either<A1, B1>) => f(this.value);
  fold = <C, D>(fa: (a: A) => C, fb: (b: B) => D) => fb(this.value);
  forall = (f: (b: B) => boolean) => f(this.value);
  foreach = <U>(f: (b: B) => U) => {
    f(this.value);
  };
  getOrElse = () => this.value;
  map = <B1>(f: (b: B) => B1) => Right<B1, A>(f(this.value));
  orElse = () => this;
  toUndefOr = () => this.value;
  toArray = () => [this.value];

  hashCode = () => hashFunction()(this.value);
  equals = (other: any) => (other instanceof RightImpl ? equalityFunction()(this.value, other.value) : false);
}

export function Left<A, B = any>(a: A): Left<A, B> {
  return new LeftImpl<A, B>(a);
}

export function Right<B, A = any>(b: B): Right<A, B> {
  return new RightImpl<A, B>(b);
}

class LeftProjection<A, B> {
  toList = lazily(() => List(this.toArray()));
  toSet = lazily(() => Set(this.toArray()));

  constructor(readonly e: Either<A, B>) {}

  exists = (p: (a: A) => boolean) => (this.e.isLeft ? p(this.e.value) : false);
  filterToOption<B1>(p: (a: A) => boolean): Option<Either<A, B1>> {
    return this.e.isRight || !p(this.e.value) ? None : Some((this.e as unknown) as Left<A, B1>);
  }
  flatMap<A1, B1>(f: (a: A) => Either<A1, B1>): Either<A1, B | B1> {
    return this.e.isLeft ? f(this.e.value) : ((this.e as unknown) as Right<A1, B>);
  }
  forall = (p: (a: A) => boolean) => (this.e.isLeft ? p(this.e.value) : true);
  foreach = <U>(f: (a: A) => U) => {
    if (this.e.isLeft) f(this.e.value);
  };
  getOrElse = <A1>(or: () => A1) => (this.e.isRight ? or() : this.e.value);
  map<A1>(f: (a: A) => A1): Either<A | A1, B> {
    return this.e.isRight ? this.e : Left<A | A1>(this.e.value);
  }
  toOption: () => Option<A> = () => Option(this.toUndefOr());
  toUndefOr: () => UndefOr<A> = () => (this.e.isLeft ? this.e.value : undefined);
  toArray = () => (this.e.isLeft ? [this.e.value] : []);
}
