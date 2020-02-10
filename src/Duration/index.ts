import { ValueObject } from "immutable";
import { hashFunction, hashItems } from "../equality";
import { IllegalArgumentException } from "../Exceptions";
import { lazily } from "../Lazy";

export enum TimeUnit {
  Microseconds = 1,
  Milliseconds = Microseconds * 1000,
  Seconds = Milliseconds * 1000,
  Minutes = Seconds * 60,
  Hours = Minutes * 60,
  Days = Hours * 24,
}

export const micros = (length: number) => new FiniteDuration(length, TimeUnit.Microseconds);
export const millis = (length: number) => new FiniteDuration(length, TimeUnit.Milliseconds);
export const seconds = (length: number) => new FiniteDuration(length, TimeUnit.Seconds);
export const minutes = (length: number) => new FiniteDuration(length, TimeUnit.Minutes);
export const hours = (length: number) => new FiniteDuration(length, TimeUnit.Hours);
export const days = (length: number) => new FiniteDuration(length, TimeUnit.Days);

function timeOOB() {
  throw new IllegalArgumentException("requirement failed: Duration is limited to +-(2^53-1)μs (ca. 285 years)");
}

const intg = (n: number) => Math.trunc(n);

function toMicros(length: number, unit: TimeUnit): number {
  return length * unit;
}

export class FiniteDuration implements ValueObject {
  hashCode = lazily(() => hashFunction()(this.asMicros));

  private readonly asMicros: number;

  constructor(readonly length: number, readonly unit: TimeUnit) {
    const asMicros = toMicros(intg(length), unit);
    if (asMicros > Number.MAX_SAFE_INTEGER || asMicros < Number.MIN_SAFE_INTEGER) timeOOB();

    this.asMicros = asMicros;
  }

  equals = (o: any) => o instanceof FiniteDuration && o.asMicros === this.asMicros;

  toString = () => {
    const unit = () => {
      switch (this.unit) {
        case TimeUnit.Microseconds:
          return "microsecond";
        case TimeUnit.Milliseconds:
          return "millisecond";
        case TimeUnit.Seconds:
          return "second";
        case TimeUnit.Minutes:
          return "minute";
        case TimeUnit.Hours:
          return "hour";
        default:
          return "day";
      }
    };
    return `${this.length} ${unit()}${this.length === 1 ? "" : "s"}`;
  };

  toMicros = () => this.asMicros;
  toMillis = () => intg(this.asMicros / TimeUnit.Milliseconds);
  toSeconds = () => intg(this.asMicros / TimeUnit.Seconds);
  toMinutes = () => intg(this.asMicros / TimeUnit.Minutes);
  toHours = () => intg(this.asMicros / TimeUnit.Hours);
  toDays = () => intg(this.asMicros / TimeUnit.Days);

  add = (amt: FiniteDuration) => micros(this.asMicros + amt.asMicros).toCoarsest();
  // tslint:disable-next-line: member-ordering
  plus = this.add;
  subtract = (amt: FiniteDuration) => micros(this.asMicros - amt.asMicros).toCoarsest();
  // tslint:disable-next-line: member-ordering
  minus = this.subtract;
  mul = (factor: number) => micros(this.asMicros * factor);
  // tslint:disable-next-line: member-ordering
  times = this.mul;
  div = (factor: number) => micros(this.asMicros / factor);
  // tslint:disable-next-line: member-ordering
  dividedBy = this.div;
  negate = () => new FiniteDuration(0 - this.length, this.unit);

  gt = (other: FiniteDuration) => this.asMicros > other.asMicros;
  gteq = (other: FiniteDuration) => this.asMicros >= other.asMicros;
  lt = (other: FiniteDuration) => this.asMicros < other.asMicros;
  lteq = (other: FiniteDuration) => this.asMicros <= other.asMicros;
  compare = (other: FiniteDuration) => (this.gt(other) ? 1 : this.lt(other) ? -1 : 0);
  max = (other: FiniteDuration) => (this.gt(other) ? this : other);
  min = (other: FiniteDuration) => (this.lt(other) ? this : other);

  toCoarsest = () => {
    const loop: (length: number, unit: TimeUnit) => [number, TimeUnit] = (length, unit) => {
      const check: (factor: number, nextUnit: TimeUnit) => [number, TimeUnit] = (factor, nextUnit) =>
        length % factor === 0 ? loop(length / factor, nextUnit) : [length, unit];

      switch (unit) {
        case TimeUnit.Days:
          return [length, unit];
        case TimeUnit.Hours:
          return check(24, TimeUnit.Days);
        case TimeUnit.Minutes:
          return check(60, TimeUnit.Hours);
        case TimeUnit.Seconds:
          return check(60, TimeUnit.Minutes);
        case TimeUnit.Milliseconds:
          return check(1000, TimeUnit.Seconds);
        default:
          return check(1000, TimeUnit.Milliseconds);
      }
    };

    const [newLen, newUnit] = loop(this.length, this.unit);
    return newUnit === this.unit ? this : new FiniteDuration(newLen, newUnit);
  };

  fromNow = () => new Deadline(this);

  delay = <U>(func: () => U) => window.setTimeout(func, this.toMillis());
  repeat = <U>(func: () => U) => window.setInterval(func, this.toMillis());
}

const now = () => new Date().getTime();

export class Deadline implements ValueObject {
  private readonly endTime: number;

  constructor(readonly time: FiniteDuration) {
    this.endTime = now() + time.toMillis();
  }

  hasTimeLeft = () => now() < this.endTime;

  isOverdue = () => now() > this.endTime;

  timeLeft = () => millis(this.endTime - now()).toCoarsest();

  then = <U>(func: () => U) => window.setTimeout(func, this.endTime - now());

  hashCode = () => hashItems(this.endTime, this.time);
  equals = (other: any) =>
    other instanceof Deadline ? other.endTime === this.endTime && other.time.equals(this.time) : false;
}
