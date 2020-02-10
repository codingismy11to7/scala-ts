import { days, FiniteDuration, hours, minutes, seconds, TimeUnit } from "../src/Duration";

describe("Duration", () => {
  it("invalid values should be rejected", () => {
    expect(() => new FiniteDuration(Number.MAX_SAFE_INTEGER, TimeUnit.Days)).toThrowError("285 years");
    expect(() => new FiniteDuration(Number.MIN_SAFE_INTEGER, TimeUnit.Days)).toThrowError("285 years");
  });

  it("conversions should work", () => {
    expect(new FiniteDuration(1.5, TimeUnit.Days).equals(new FiniteDuration(1, TimeUnit.Days))).toBeTruthy();
    expect(new FiniteDuration(48, TimeUnit.Hours).equals(new FiniteDuration(2, TimeUnit.Days))).toBeTruthy();
    expect(new FiniteDuration(48, TimeUnit.Hours).toDays()).toBe(2);
    expect(new FiniteDuration(49, TimeUnit.Hours).toDays()).toBe(2);
    expect(new FiniteDuration(2, TimeUnit.Days).equals(new FiniteDuration(49, TimeUnit.Hours))).toBeFalsy();
  });

  it("toCoarsest should work", () => {
    expect(new FiniteDuration(42, TimeUnit.Days).toCoarsest().length).toBe(42);
    expect(new FiniteDuration(18720, TimeUnit.Minutes).toCoarsest().length).toBe(13);
    expect(new FiniteDuration(18720, TimeUnit.Minutes).toCoarsest().unit).toBe(TimeUnit.Days);
    expect(new FiniteDuration(840, TimeUnit.Minutes).toCoarsest().length).toBe(14);
    expect(new FiniteDuration(840, TimeUnit.Minutes).toCoarsest().unit).toBe(TimeUnit.Hours);
    const d = new FiniteDuration(841, TimeUnit.Minutes);
    expect(d.toCoarsest()).toBe(d);
  });

  it("toString should work", () => {
    expect(new FiniteDuration(42, TimeUnit.Days).toString()).toBe("42 days");
    expect(new FiniteDuration(1, TimeUnit.Milliseconds).toString()).toBe("1 millisecond");
  });

  it("math should work", () => {
    expect(
      minutes(59)
        .plus(minutes(1))
        .equals(hours(1)),
    ).toBeTruthy();
    expect(
      hours(48)
        .dividedBy(2)
        .equals(days(1)),
    ).toBeTruthy();
    expect(
      seconds(3)
        .times(20)
        .equals(minutes(1)),
    ).toBeTruthy();
    expect(() => days(285 * 365.241).plus(days(365))).toThrowError("285 years");
  });
});
