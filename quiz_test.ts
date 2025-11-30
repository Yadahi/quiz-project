import {
  assertEquals,
  assertThrows,
  assertMatch,
  assert
} from "@std/assert";
import {
  stub,
  returnsNext,
  assertSpyCall,
  assertSpyCalls
} from "@std/testing/mock";
import Quiz from "./quiz.ts";

// --- Custom Disposable Helpers ---

// A helper that mocks CLI args and auto-restores them on scope exit
function usingArgs(args: string[]) {
  const original = Object.getOwnPropertyDescriptor(Deno, "args");
  Object.defineProperty(Deno, "args", { value: args, configurable: true });

  return {
    [Symbol.dispose]: () => {
      if (original) Object.defineProperty(Deno, "args", original);
    }
  };
}

// A helper that ensures a file is deleted when the test finishes
function usingFileCleanup(path: string) {
  return {
    [Symbol.dispose]: () => {
      try { Deno.removeSync(path); } catch { /* ignore */ }
    }
  };
}

// A helper that stubs Deno.exit
function usingExitStub() {
  return stub(Deno, "exit", (code?: number) => {
    throw new Error("process.exit: " + code);
  });
}

// --- Main / CLI Tests ---

Deno.test("main() - should exit with no parameters", () => {
  using _args = usingArgs([]);
  using runStub = stub(Quiz, "run", (): [number, number] => [1, 1]);
  using createStub = stub(Quiz, "create", () => { });
  using exitStub = usingExitStub();

  assertThrows(
    () => Quiz.main(),
    Error,
    "process.exit"
  );

  // Assert: Exit was called exactly once with argument -1
  assertSpyCalls(exitStub, 1);
  assertSpyCall(exitStub, 0, { args: [-1] });

  // Assert: Run and Create were NOT called
  assertSpyCalls(createStub, 0);
  assertSpyCalls(runStub, 0);
});

Deno.test("main() - should exit with one parameter", () => {
  using _args = usingArgs(["create"]);
  using runStub = stub(Quiz, "run", (): [number, number] => [1, 1]);
  using createStub = stub(Quiz, "create", () => { });
  using _exit = usingExitStub();

  assertThrows(
    () => Quiz.main(),
    Error,
    "process.exit"
  );

  assertSpyCalls(createStub, 0);
  assertSpyCalls(runStub, 0);
});

Deno.test("main() - should call 'run' when running a quiz", () => {
  using _args = usingArgs(["run", "test.txt"]);
  using runStub = stub(Quiz, "run", (): [number, number] => [1, 1]);
  using createStub = stub(Quiz, "create", () => { });

  Quiz.main();

  assertSpyCalls(createStub, 0);
  assertSpyCall(runStub, 0, { args: ["test.txt"] });
});

Deno.test("main() - should call 'create' when creating a quiz", () => {
  using _args = usingArgs(["create", "test.txt"]);
  using runStub = stub(Quiz, "run", (): [number, number] => [1, 1]);
  using createStub = stub(Quiz, "create", () => { });

  Quiz.main();

  assertSpyCalls(runStub, 0);
  assertSpyCall(createStub, 0, { args: ["test.txt"] });
});

Deno.test("createSample() - should create a sample quiz file", () => {
  const filename = "sample_exist.txt";
  using _cleanup = usingFileCleanup(filename);

  Quiz.createSample(filename);

  Deno.statSync(filename); // Throws if missing
  assert(true);
});

Deno.test("createSample() - should have correct content format", () => {
  const filename = "sample_content.txt";
  using _cleanup = usingFileCleanup(filename);

  Quiz.createSample(filename);
  const contents = Deno.readTextFileSync(filename).split("\n");

  assertEquals(contents.length, 3);
  assertMatch(contents[0], /(^TF,.+,[TF]$)|(MC,.+,\d+,(.*,)+(.*))$/im);
  assertMatch(contents[1], /(^TF,.+,[TF]$)|(MC,.+,\d+,(.*,)+(.*))$/im);
});

// --- Quiz Run Tests ---

Deno.test("displayTrueFalse() - returns True if answered correctly", () => {
  using promptStub = stub(globalThis, "prompt", returnsNext(["T"]));

  const correct = Quiz.displayTrueFalse("Question?", "T");

  assertEquals(correct, true);
  assertSpyCalls(promptStub, 1);
});

Deno.test("displayTrueFalse() - returns False if answered incorrectly", () => {
  using promptStub = stub(globalThis, "prompt", returnsNext(["F"]));

  const correct = Quiz.displayTrueFalse("Question?", "T");

  assertEquals(correct, false);
  assertSpyCalls(promptStub, 1);
});

Deno.test("displayMultipleChoice() - returns True if correct", () => {
  using _promptStub = stub(globalThis, "prompt", returnsNext(["2"]));

  const correct = Quiz.displayMultipleChoice("Q", "2", ["A", "B"]);
  assertEquals(correct, true);
});

Deno.test("displayMultipleChoice() - returns False if incorrect", () => {
  using _promptStub = stub(globalThis, "prompt", returnsNext(["1"]));

  const correct = Quiz.displayMultipleChoice("Q", "2", ["A", "B"]);
  assertEquals(correct, false);
});

Deno.test("run() - calculates 2/2 score correctly", () => {
  const filename = "sample_run_2.txt";
  using _cleanup = usingFileCleanup(filename);
  using _promptStub = stub(globalThis, "prompt", returnsNext(["T", "2"]));

  Quiz.createSample(filename);

  const [count, correct] = Quiz.run(filename);
  assertEquals(count, 2);
  assertEquals(correct, 2);
});

Deno.test("run() - calculates 1/2 score correctly", () => {
  const filename = "sample_run_1.txt";
  using _cleanup = usingFileCleanup(filename);
  using _promptStub = stub(globalThis, "prompt", returnsNext(["F", "2"]));

  Quiz.createSample(filename);

  const [count, correct] = Quiz.run(filename);
  assertEquals(count, 2);
  assertEquals(correct, 1);
});

// --- Quiz Create Tests ---

Deno.test("createTrueFalse() - formats string correctly", () => {
  const input = ["Question text", "T"];
  using _promptStub = stub(globalThis, "prompt", returnsNext(input));

  const data = Quiz.createTrueFalse();
  assertEquals(data, `TF,${input.join(",")}`);
});

Deno.test("createMultipleChoice() - formats string correctly", () => {
  const inputs = ["Question", "Opt1", "Opt2", "Opt3", "Opt4", "", "2"];
  using _promptStub = stub(globalThis, "prompt", returnsNext(inputs));

  const data = Quiz.createMultipleChoice();
  const expected = "MC,Question,2,Opt1,Opt2,Opt3,Opt4";
  assertEquals(data, expected);
});

Deno.test("createQuestion() - handles TF selection", () => {
  const inputs = ["TF", "Question", "T"];
  using _promptStub = stub(globalThis, "prompt", returnsNext(inputs));

  assertEquals(Quiz.createQuestion(), inputs.join(","));
});

Deno.test("createQuestion() - handles MC selection", () => {
  const inputs = ["MC", "Q", "A", "B", "C", "D", "", "2", ""];
  using _promptStub = stub(globalThis, "prompt", returnsNext(inputs));

  const expected = "MC,Q,2,A,B,C,D";
  assertEquals(Quiz.createQuestion(), expected);
});

Deno.test("create() - generates a file from inputs", () => {
  const filename = "test_create.txt";
  const inputs = ["TF", "Q", "T", ""];

  using _cleanup = usingFileCleanup(filename);
  using _promptStub = stub(globalThis, "prompt", returnsNext(inputs));

  Quiz.create(filename);

  Deno.statSync(filename); // Throws if missing
  assert(true);
});