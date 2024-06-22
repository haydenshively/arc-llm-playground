import { NextResponse } from "next/server";
import fs from "fs";
import { Annotation } from "../write_annotation/route";

const DATASET = "training";
const DIR_PUZZLES = `./data/puzzles/${DATASET}/`;
const DIR_ANNOTATIONS = `./data/annotations/${DATASET}/`;

export async function POST(req: Request) {
  const puzzleFilenames = fs
    .readdirSync(DIR_PUZZLES)
    .filter((filename) => filename.endsWith(".json"));

  const annotationFilenames = fs
    .readdirSync(DIR_ANNOTATIONS)
    .filter((filename) => filename.endsWith(".json"));

  const annotations = await Promise.all(
    annotationFilenames.map(
      (filename) =>
        new Promise<Annotation>((resolve, reject) => {
          fs.readFile(DIR_ANNOTATIONS + filename, "utf8", (err, data) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(JSON.parse(data));
          });
        })
    )
  );

  const datasetInfo = puzzleFilenames.map((puzzleFilename) => {
    const annotationIdx = annotationFilenames.findIndex(
      (filename) => filename === puzzleFilename
    );
    return {
      name: puzzleFilename.split(".")[0],
      annotation: annotationIdx === -1 ? null : annotations[annotationIdx],
    };
  });

  return NextResponse.json({ datasetInfo });
}
