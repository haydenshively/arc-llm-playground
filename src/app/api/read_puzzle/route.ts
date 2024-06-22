import { NextResponse } from "next/server";
import fs from "fs";
import { Annotation } from "../write_annotation/route";

type Grid = number[][];

type Example = {
  input: Grid;
  output: Grid;
};

export type Puzzle = {
  name: string;
  train: Example[];
  test: Example[];
};

const DATASET = "training";
const DIR_PUZZLES = `./data/puzzles/${DATASET}/`;
const DIR_ANNOTATIONS = `./data/annotations/${DATASET}/`;

const emptyExample = {
  inputDescription: '',
  outputDescription: '',
  innerMonologueAnalysis: '',
}

const emptyProblem = {
  inputDescription: '',
  innerMonologuePlanning: '',
  outputDescription: '',
}

export async function POST(req: Request) {
  const name = (await req.json()).name as string;
  const filename = name + ".json";

  // const filenames = fs
  //   .readdirSync(DIR_PUZZLES)
  //   .filter((filename) => filename.endsWith(".json"));
  // const filename = filenames[id % filenames.length];

  const puzzle = JSON.parse(fs.readFileSync(DIR_PUZZLES + filename, "utf8"));
  const puzzleName = filename.split(".")[0];

  let annotation: Annotation = {
    name: puzzleName,
    examples: Array(puzzle.train.length).fill(emptyExample),
    problems: Array(puzzle.test.length).fill(emptyProblem),
    rulesetHypothesis: "",
    potentiallyUsefulFunctions: "",
    pythonSolution: "",
  };
  if (fs.existsSync(DIR_ANNOTATIONS + filename)) {
    annotation = JSON.parse(
      fs.readFileSync(DIR_ANNOTATIONS + filename, "utf8")
    );
  }

  return NextResponse.json({
    puzzle: {
      name: puzzleName,
      ...puzzle,
    },
    annotation,
  });
}
