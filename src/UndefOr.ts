import { List, Set } from "immutable";

export type UndefOr<T> = T | undefined;
export type UndefOrNullOr<T> = UndefOr<T> | null;

export function defined<T>(t: UndefOrNullOr<T>): t is T {
  return t !== undefined && t !== null;
}

export function map<T, U>(t: UndefOrNullOr<T>, f: (t: T) => U): UndefOr<U> {
  if (defined(t)) return f(t);
}

export function flatMap<T, U>(t: UndefOrNullOr<T>, f: (t: T) => UndefOrNullOr<U>) {
  if (defined(t)) return f(t);
}

export function fold<T, U>(t: UndefOrNullOr<T>, ifUndef: () => U, ifDef: (t: T) => U) {
  return defined(t) ? ifDef(t) : ifUndef();
}

export function getOrElse<T, U>(t: UndefOrNullOr<T>, orElse: () => U) {
  return defined(t) ? t : orElse();
}

export function orElse<T, U>(t: UndefOrNullOr<T>, alternative: () => UndefOr<U>): UndefOr<T | U> {
  return defined(t) ? t : alternative();
}

export function foreach<T, U>(t: UndefOrNullOr<T>, f: (t: T) => U) {
  if (defined(t)) f(t);
}

export function exists<T>(t: UndefOrNullOr<T>, f: (t: T) => boolean) {
  return defined(t) ? f(t) : false;
}

export function forall<T>(t: UndefOrNullOr<T>, f: (t: T) => boolean) {
  return defined(t) ? f(t) : true;
}

export function filter<T>(t: UndefOrNullOr<T>, f: (t: T) => boolean): UndefOr<T> {
  if (defined(t) && f(t)) return t;
}

export function filterNot<T>(t: UndefOrNullOr<T>, f: (t: T) => boolean): UndefOr<T> {
  if (defined(t) && !f(t)) return t;
}

export function orNull<T>(t: UndefOrNullOr<T>): T | null {
  return getOrElse(t, () => null);
}

export function toArray<T>(t: UndefOrNullOr<T>) {
  return defined(t) ? [t] : [];
}

export function toList<T>(t: UndefOrNullOr<T>) {
  return List(toArray(t));
}

export function toSet<T>(t: UndefOrNullOr<T>) {
  return Set(toArray(t));
}
