import fs from "node:fs";

function main() {
  const [mode, filename] = Deno.args;

  if (!mode || !filename) {
    Deno.exit(-1);
  }
  if (mode === "run") {
    const [totalQuestions, totalCorrect] = run(filename);
    console.log(
      `You have ${totalCorrect}/${totalQuestions} (${
        (totalCorrect / totalQuestions) * 100
      }%) correct.`
    );
  } else if (mode === "create") {
    create(filename);
  }
}

function createSample(filename: string) {
  const records: string[] = [
    "tf,the sky is blue,t",
    "mc,How many legs does a dog have?,2,a,b,c,d",
  ];
  const sampleRecords = records.join("\n");

  Deno.writeTextFileSync(filename, sampleRecords);
}

function displayTrueFalse(question: string, answer: string): boolean {
  console.log(question);
  let userInput;
  let answerIsInvalid = true;
  do {
    userInput = prompt("Is this statement true or false? (T/F):");
    answerIsInvalid =
      !userInput ||
      (!!userInput &&
        userInput.toUpperCase() !== "T" &&
        userInput.toUpperCase() !== "F");
  } while (answerIsInvalid);

  const isCorrect =
    !!userInput && userInput.toUpperCase() === answer.toUpperCase();

  if (isCorrect) {
    console.log("Correct!");
  } else {
    console.log(`Incorrect. The answer is ${answer}`);
  }

  return isCorrect;
}

function displayMultipleChoice(
  question: string,
  answer: string,
  choices: string[]
): boolean {
  let answerIsInvalid = true;
  let userInput;

  console.log(question);
  for (let i = 0; i < choices.length; i++) {
    console.log(`${i + 1}) ${choices[i]}`);
  }

  do {
    userInput = prompt("Enter choice:");
    const number = Number(userInput);
    answerIsInvalid = !number || number <= 0 || number > choices.length;
    if (answerIsInvalid) {
      console.log(
        `Your answer '${userInput}' is invalid. It needs to be a number in the range of 1 to ${choices.length}`
      );
    }
  } while (answerIsInvalid);

  const isCorrect = !!userInput && Number(userInput) === Number(answer);
  if (isCorrect) {
    console.log(`Correct.`);
  } else {
    console.log(`Incorrect. The answer is ${answer}`);
  }

  return isCorrect;
}

function displayQuestion(line: string): boolean {
  const [type, question, answer, ...choices] = line.split(",");

  if (type.toUpperCase() === "MC") {
    return displayMultipleChoice(question, answer, choices);
  } else {
    return displayTrueFalse(question, answer);
  }
}

function run(filename: string): [number, number] {
  const records: string[] = Deno.readTextFileSync(filename)?.split(/\r?\n/);
  const answers: Record<string, boolean> = {};
  let correctAnswers = 0;
  let falseAnswers = 0;

  for (const line of records) {
    const answer = displayQuestion(line);
    const question = line.split(",")[1];
    answers[question] = answer;
    if (answer) {
      correctAnswers++;
    } else {
      falseAnswers++;
    }
  }
  return [records.length, correctAnswers];
}

function createTrueFalse(): string {
  const question = prompt("Enter the question:");
  const answer = prompt("Enter the answer (T/F):");
  if (!question || !answer) {
    return "";
  }
  const line = `TF,${question},${answer}`;
  return line;
}

function createMultipleChoice(): string {
  let answer;
  const choices: string[] = [];
  const question = prompt("Enter the question:");
  if (!question) {
    return "";
  }

  //   collection option with validation rule, at least two options are needed
  let option;
  do {
    option = prompt("Enter a possible answer (ENTER to end):");
    if (option) {
      choices.push(option);
    } else {
      if (choices.length < 2)
        console.log(
          `You need to add at least two options (you have ${choices.length})`
        );
    }
  } while (option || choices.length < 2);

  //   show the question
  console.log(question);
  for (let i = 0; i < choices.length; i++) {
    console.log(`${i + 1}) ${choices[i]}`);
  }

  //   getting the right answer with validation
  let answerIsValid;
  while (!answerIsValid) {
    answer = prompt("Which one is the correct answer:");
    const number = Number(answer);
    answerIsValid = !!answer && number > 0 && number <= choices.length;
    if (!answerIsValid) {
      console.log(`Type valid answer (number between 1 and ${choices.length})`);
    }
  }

  return ["MC", question, answer, ...choices].join(",");
}

function createQuestion(): string {
  let result = "";
  let typeQuestion;
  let typeQuestionIsInvalid = true;

  do {
    typeQuestion = prompt(
      "What type of question do you want to create (MC, TF or ENTER to end)"
    );

    // validating the answer
    typeQuestionIsInvalid =
      !!typeQuestion &&
      typeQuestion.toUpperCase() !== "MC" &&
      typeQuestion.toUpperCase() !== "TF";

    //   validation error message
    if (typeQuestionIsInvalid) {
      console.log(
        `Please choose MC, TF or ENTER to end. You typed ${typeQuestion}`
      );
    } else if (typeQuestion) {
      // calling the right method
      if (typeQuestion.toUpperCase() === "MC") {
        result = createMultipleChoice();
      } else if (typeQuestion.toUpperCase() === "TF") {
        result = createTrueFalse();
      }
    }
  } while (typeQuestionIsInvalid);

  return result;
}

function create(filename: string) {
  const questions: string[] = [];

  while (true) {
    const newQuestion = createQuestion();
    if (!newQuestion) {
      break;
    }
    questions.push(newQuestion);
  }

  const lines = questions.join("\n");
  Deno.writeTextFileSync(filename, lines, { append: true });
}

const Quiz = {
  main,
  createSample,
  displayTrueFalse,
  displayMultipleChoice,
  displayQuestion,
  run,
  createTrueFalse,
  createMultipleChoice,
  createQuestion,
  create,
};
export default Quiz;
// call the main function if this file is being executed directly
if (import.meta.main) {
  main();
}
