import { NextResponse } from "next/server";
import fs from "fs";


type Example = {
  inputDescription: string;
  outputDescription: string;
  innerMonologueAnalysis: string;
}

type Problem = {
  inputDescription: string;
  innerMonologuePlanning: string;
  outputDescription: string;
}


export type Annotation = {
  name: string;
  examples: Example[],
  problems: Problem[],
  rulesetHypothesis: string;
  potentiallyUsefulFunctions: string;
  pythonSolution: string;
}

export async function POST(req: Request) {
  const annotation = await req.json() as Annotation;

  fs.writeFileSync(`./data/annotations/training/${annotation.name}.json`, JSON.stringify(annotation));

  return NextResponse.json({});
}
