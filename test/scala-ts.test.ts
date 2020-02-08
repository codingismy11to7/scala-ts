import { NoSuchElementException, UnsupportedOperationException } from "../src/Exceptions";
import { lazily } from "../src/Lazy";
import { None } from "../src/Option";
import { Failure, Success, Try } from "../src/Try";

describe("Lazy", () => {
  it("only creates an item once", () => {
    const mockFn = jest.fn(() => {});
    const lazyInt = lazily(() => {
      mockFn();
      return 42;
    });

    expect(lazyInt()).toBe(42);
    expect(lazyInt()).toBe(42);
    expect(lazyInt()).toBe(42);
    expect(mockFn.mock.calls.length).toBe(1);
  });
});

describe("Try", () => {
  const createError = (msg: string | number = "fail") => new Error(msg.toString());
  const throwError = (msg?: string | number) => {
    throw createError(msg);
  };
  const makeFailed: (msg?: string | number) => Try<number> = msg =>
    Math.random() < 0.5 ? Failure(createError(msg)) : Try(() => throwError(msg));

  it("Try() works", () => {
    expect(
      makeFailed("X")
        .failed()
        .get().message,
    ).toBe("X");

    const t1 = Try(() => 42);
    expect(t1.isSuccess).toBeTruthy();
    expect(t1.get()).toBe(42);

    const t2 = Try(() => {
      throw new Error("e");
    });
    expect(t2.isFailure).toBeTruthy();
    expect(t2.failed().isSuccess).toBeTruthy();
    expect(t2.failed().get() instanceof Error).toBeTruthy();
    expect(t2.failed().get().message).toBe("e");

    const t3 = Try(() => {
      throw new Error("f");
    });
    expect(t3.isFailure).toBeTruthy();
    expect(t3.failed().isSuccess).toBeTruthy();
    expect(t3.failed().get() instanceof Error).toBeTruthy();
    expect(t3.failed().get().message).toBe("f");
  });

  it("failed() works", () => {
    const t = Success(42).failed();
    expect(t.isFailure).toBeTruthy();
    expect(t.failed().get() instanceof UnsupportedOperationException).toBeTruthy();
    expect(t.failed().get().message).toMatch("Success.failed");
  });

  it("filter() works", () => {
    const t1 = Success(42);
    const t2 = t1.filter(v => v > 50);
    const t3 = t1.filter(v => v < 50);

    expect(t2.isFailure).toBeTruthy();
    expect(t2.failed().get() instanceof NoSuchElementException).toBeTruthy();
    expect(t2.failed().get().message).toMatch("Predicate does not hold for");
    expect(t3).toBe(t1);

    const t4 = makeFailed();
    expect(t4.failed().get().message).toBe("fail");
    expect(t4.filter(v => v < 50)).toBe(t4);

    // filter function throwing should be caught
    const t5 = t1.filter(() => throwError());
    expect(t5.isFailure).toBeTruthy();
    expect(t5.failed().get().message).toBe("fail");
  });

  it("flatMap() works", () => {
    const t1 = Success(42);

    expect(t1.flatMap(v => Success(v * 2)).get()).toBe(84);
    expect(
      t1
        .flatMap(v => makeFailed(v))
        .failed()
        .get().message,
    ).toBe("42");

    const t2 = makeFailed();
    expect(t2.flatMap(v => Success(v * 2))).toBe(t2);

    // if the flatMap itself throws, should be treated as if it returned Failure
    expect(
      t1
        .flatMap(v => throwError(v))
        .failed()
        .get().message,
    ).toBe("42");
    expect(t2.flatMap(v => throwError(v))).toBe(t2);
  });

  it("fold() works", () => {
    const t1 = Success(42);
    const t2 = makeFailed();

    expect(
      t1.fold(
        e => e.message,
        v => (v / 2).toString(),
      ),
    ).toBe("21");
    expect(
      t2.fold(
        e => e.message,
        v => (v / 2).toString(),
      ),
    ).toBe("fail");

    // fun one, if the success function throws, then the failed function runs on that exception
    // scala> Success(42).fold(e => e.toString -> e.toString.length, _ => sys.error("e"))
    // res23: (String, Int) = (java.lang.RuntimeException: e,29)
    expect(
      t1.fold(
        e => e.message + e.message.length,
        v => throwError(v),
      ),
    ).toBe("422");
    expect(
      t2.fold(
        e => e.message + e.message.length,
        v => throwError(v),
      ),
    ).toBe("fail4");

    // if failure function throws, it just throws
    // scala> Failure(new Exception("o")).fold(_ => sys.error("f"), identity)
    // java.lang.RuntimeException: f
    //   at scala.sys.package$.error(package.scala:27)
    expect(() =>
      t2.fold(
        e => throwError(e.message + e.message),
        v => throwError(v),
      ),
    ).toThrowError("failfail");
  });

  it("foreach() works", () => {
    const fn = jest.fn(n => n);

    Success(42).foreach(fn);
    makeFailed().foreach(fn);
    expect(() => Success(42).foreach(v => throwError(v.toString()))).toThrowError("42");
    makeFailed().foreach(v => throwError(v.toString())); // shouldn't do anything

    expect(fn.mock.calls.length).toBe(1);
    expect(fn.mock.calls[0][0]).toBe(42);
  });

  it("get() works", () => {
    expect(Success(42).get()).toBe(42);
    expect(() => makeFailed().get()).toThrowError("fail");
  });

  it("getOrElse() works", () => {
    expect(Success(42).getOrElse(() => 21)).toBe(42);
    expect(makeFailed().getOrElse(() => 21)).toBe(21);

    expect(Success(42).getOrElse(() => throwError())).toBe(42);
    expect(() => makeFailed().getOrElse(() => throwError("e"))).toThrowError("e");
  });

  it("map() works", () => {
    expect(
      Success(42)
        .map(v => v / 2)
        .get(),
    ).toBe(21);

    const t1 = makeFailed();
    expect(t1.map(v => v / 2)).toBe(t1);

    // map catches exceptions
    expect(
      Success(42)
        .map(v => throwError(v))
        .failed()
        .get().message,
    ).toBe("42");
    expect(t1.map(v => throwError("X"))).toBe(t1);
  });

  it("orElse() works", () => {
    const t1 = Success(42);
    const t2 = Success(21);
    const t3 = makeFailed();

    expect(t1.orElse(() => t2)).toBe(t1);
    expect(t1.orElse(() => t3)).toBe(t1);
    expect(t3.orElse(() => t1)).toBe(t1);

    expect(t1.orElse(() => throwError())).toBe(t1);
    // exceptions thrown in orElse are caught
    expect(
      t3
        .orElse(() => makeFailed("f"))
        .failed()
        .get().message,
    ).toBe("f");
  });

  it("recover() works", () => {
    const t1 = Success(42);
    const t2 = makeFailed();

    expect(t1.recover(e => e.message)).toBe(t1);
    expect(t2.recover(e => e.message).get()).toBe("fail");

    expect(
      t1.recover(e => {
        throw e;
      }),
    ).toBe(t1);

    // exceptions in recover return a failure
    // scala> Failure(new Exception("o")).recover({case e => sys.error("1")})
    // res33: scala.util.Try[Nothing] = Failure(java.lang.RuntimeException: 1)
    expect(t2.recover(() => throwError("f")).get).toThrowError("f");
  });

  it("recoverWith() works", () => {
    const t1 = Success(42);
    const t2 = Success(21);
    const t3 = makeFailed("fail1");
    const t4 = makeFailed("fail2");

    expect(t1.recoverWith(() => t2)).toBe(t1);
    expect(t1.recoverWith(() => t3)).toBe(t1);
    expect(t3.recoverWith(() => t1)).toBe(t1);
    expect(t3.recoverWith(() => t4)).toBe(t4);

    expect(t1.recoverWith(() => throwError("f"))).toBe(t1);
    // exceptions in recoverWith behave the same as recover
    expect(t3.recover(() => throwError("f")).get).toThrowError("f");
  });

  it("toEither() works", () => {
    const e1 = Success(42).toEither();
    const e2 = makeFailed().toEither();

    expect(e1.isRight).toBeTruthy();
    expect(e1.value).toBe(42);
    expect(e2.isLeft).toBeTruthy();
    expect(e2.value instanceof Error).toBeTruthy();
    expect(() => {
      throw e2.value;
    }).toThrowError("fail");
  });

  it("toOption() works", () => {
    const o1 = Success(42).toOption();
    const o2 = makeFailed().toOption();

    expect(o1.isDefined).toBeTruthy();
    expect(o1.exists(n => n === 42)).toBeTruthy();
    expect(o2).toBe(None);
  });

  it("transform() works", () => {
    const t1 = Success(42);
    const t2 = makeFailed();

    expect(
      t1
        .transform(
          v => Success<string | number>(v * 2),
          e => Success(e.message),
        )
        .get(),
    ).toBe(84);

    expect(
      t2
        .transform(
          v => Success<string | number>(v * 2),
          e => Success(e.message),
        )
        .get(),
    ).toBe("fail");

    expect(
      t1
        .transform(
          v => makeFailed(v * 2),
          e => makeFailed(e.message + e.message),
        )
        .failed()
        .get().message,
    ).toBe("84");

    expect(
      t2
        .transform(
          v => makeFailed(v * 2),
          e => makeFailed(e.message + e.message),
        )
        .failed()
        .get().message,
    ).toBe("failfail");

    // exception returns a Failure
    expect(
      t1
        .transform(
          v => throwError(v / 2),
          () => makeFailed(),
        )
        .failed()
        .get().message,
    ).toBe("21");

    expect(
      t2
        .transform(
          v => makeFailed(v),
          e => throwError(e.message + e.message),
        )
        .failed()
        .get().message,
    ).toBe("failfail");
  });
});
