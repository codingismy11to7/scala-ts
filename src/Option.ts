import { List, Set, ValueObject } from "immutable";
import { equalityFunction, hashFunction } from "./equality";
import { lazily } from "./Lazy";
import { defined, UndefOrNullOr } from "./UndefOr";

export interface Option<T> extends ValueObject {
  readonly isEmpty: boolean;
  readonly isDefined: boolean;
  contains(elem: any): boolean;
  map<U>(f: (t: T) => U): Option<U>;
  flatMap<U>(f: (t: T) => Option<U>): Option<U>;
  fold<U, V>(ifUndef: () => U, ifDef: (t: T) => V): U | V;
  getOrElse<U>(orElse: () => U): T | U;
  orElse<U>(alternative: () => Option<U>): Option<T | U>;
  foreach<U>(f: (t: T) => U): void;
  exists(f: (t: T) => boolean): boolean;
  forall(f: (t: T) => boolean): boolean;
  filter(f: (t: T) => boolean): Option<T>;
  filterNot(f: (t: T) => boolean): Option<T>;
  orNull(): T | null;
  toArray(): T[];
  toList(): List<T>;
  toSet(): Set<T>;
}

export function Option<T>(t: UndefOrNullOr<T>): Option<T> {
  return defined(t) ? Some(t) : None;
}

export function OptionEmpty<T>(): Option<T> {
  return None;
}

class SomeImpl<T> implements Some<T> {
  readonly isEmpty = false;
  readonly isDefined = true;
  toList = lazily(() => List.of(this.value));
  toSet = lazily(() => Set.of(this.value));

  constructor(readonly value: T) {}

  contains = (elem: any) => equalityFunction()(this.value, elem);
  map = <U>(f: (t: T) => U) => Some(f(this.value));
  flatMap = <U>(f: (t: T) => Option<U>) => f(this.value);
  fold = <U, V>(_ifUndef: () => U, ifDef: (t: T) => V) => ifDef(this.value);
  getOrElse = () => this.value;
  orElse = () => this;
  foreach = <U>(f: (t: T) => U) => {
    f(this.value);
  };
  exists = (f: (t: T) => boolean) => f(this.value);
  forall = (f: (t: T) => boolean) => f(this.value);
  filter = (f: (t: T) => boolean) => (f(this.value) ? this : None);
  filterNot = (f: (t: T) => boolean) => (!f(this.value) ? this : None);
  orNull = () => this.value;
  toArray = () => [this.value];

  hashCode = () => hashFunction()(this.value);
  equals = (other: any) => (other instanceof SomeImpl ? equalityFunction()(this.value, other.value) : false);
}

export interface Some<T> extends Option<T> {
  readonly isEmpty: false;
  readonly isDefined: true;
  readonly value: T;
}

export function Some<T>(t: T): Some<T> {
  return new SomeImpl(t);
}

export const None: Option<never> = {
  isEmpty: true,
  isDefined: false,
  contains: () => false,
  map: <U>() => None,
  flatMap: <U>() => None,
  fold: <U>(ifUndef: () => U) => ifUndef(),
  getOrElse: <U>(orElse: () => U) => orElse(),
  orElse: <U>(alternative: () => Option<U>) => alternative(),
  foreach: () => {},
  exists: () => false,
  forall: () => true,
  filter: () => None,
  filterNot: () => None,
  orNull: () => null,
  toArray: () => [],
  toList: () => List() as List<never>,
  toSet: () => Set() as Set<never>,

  hashCode: () => hashFunction()(false),
  equals: (other: any) => other === None,
};
