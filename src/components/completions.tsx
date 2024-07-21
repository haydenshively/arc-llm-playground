import { Puzzle } from "@/app/api/read_puzzle/route";
import { Annotation } from "@/app/api/write_annotation/route";
import { useDebouncedMemo } from "@/hooks/useDebouncedMemo"
import { Button, Divider, Pagination, Textarea } from "@nextui-org/react";
import OpenAI from "openai";
import { useCallback, useEffect, useMemo, useState } from "react";
import llama3Tokenizer from 'llama3-tokenizer-js'
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
const jq = require('jq-web')

const NUM_COMPLETIONS = 10;

const PROMPT = `
# Solving Grid Puzzles

I'm working on a series of puzzles designed to test reasoning abilities. Each puzzle consists of one or more examples, and a single test case. Each example has an input and an output, while the test case has only the input. Our job is to predict the test case's output.

All inputs and outputs are N x M grids of colors (essentially pixel art). These grids can be represented by 2D arrays with the following color mapping:
Black: 0
Blue: 1
Red: 2
Green: 3
Yellow: 4
Grey: 5
Pink: 6
Orange: 7
Teal: 8
White: 9

Note that the input and output grids are not always the same size--we must infer the proper output sizes from trends in the examples.

## Puzzle A

### Example A

**Input**
{".puzzle.train[0].input","grid",""}
{".annotation.examples[0].inputDescription","none",""}

**Output**
{".puzzle.train[0].output","grid",""}
{".annotation.examples[0].outputDescription","none",""}

**Analysis**
{".annotation.examples[0].innerMonologueAnalysis","none",""}

### Example B

**Input**
{".puzzle.train[1].input","grid",""}
{".annotation.examples[1].inputDescription","none",""}

**Output**
{".puzzle.train[1].output","grid",""}
{".annotation.examples[1].outputDescription","none",""}

**Analysis**
{".annotation.examples[1].innerMonologueAnalysis","none",""}

### Example C

**Input**
{".puzzle.train[2].input","grid",""}
{".annotation.examples[2].inputDescription","none",""}

**Output**
{".puzzle.train[2].output","grid",""}
{".annotation.examples[2].outputDescription","none",""}

**Analysis**
{".annotation.examples[2].innerMonologueAnalysis","none",""}

### Example D

**Input**
{".puzzle.test[0].input","grid",""}
{".annotation.problems[0].inputDescription","none",""}

`

// const SYMBOL_MAP = ['⬛️', '🟦', '🟥', '🟩', '🟨', '⬜️', '🟪', '🟧', '□', '🟫'];
// function formatGrid(grid: number[][]) {
//   return `${grid.map((row) => `${row.map((col) => SYMBOL_MAP[col]).join('')}`).join('\n')}\n`
// }

// const SYMBOL_MAP = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒']
// function formatGrid(grid: number[][]) {
//   return `\`\`\`\n${grid.map((row) => `[${row.map((col) => SYMBOL_MAP[col]).join(', ')}]`).join(',\n')}\n\`\`\``
// }

function formatGrid(grid: number[][]) {
  return `\`\`\`\n[${grid.map((row) => `[${row.map((col) => col.toString()).join(', ')}]`).join(',\n')}]\n\`\`\``
}

const openai = new OpenAI({
  baseURL: "http://localhost:3000/api/",
  apiKey: "",
  dangerouslyAllowBrowser: true,
});

export function CompletionsWidget({ activePuzzle, activeAnnotation }: { activePuzzle?: Puzzle, activeAnnotation?: Annotation }) {
  const [promptTemplate, setPromptTemplate] = useState("");
  const [completionsPage, setCompletionsPage] = useState(1);
  const [isThinking, setIsThinking] = useState(false);
  const [completions, setCompletions] = useState(new Map<number, string>());

  const prompt = useDebouncedMemo(() => {
    let newPrompt = promptTemplate;
    if (!activePuzzle || !activeAnnotation) return newPrompt;

    const regex = /\{.*?\}/g;
    const matches = Array.from(newPrompt.matchAll(regex));

    for (const match of matches) {
      const args = match[0].slice(1, -1);
      const filenameIndex = args.lastIndexOf(",");
      const postprocessingIndex = args.slice(0, filenameIndex).lastIndexOf(",");

      if (filenameIndex === -1 || postprocessingIndex === -1) {
        console.warn(`Expected 3 args in expression: ${match}`);
        continue;
      }
      const filename = args.slice(filenameIndex + 1).trim().slice(1, -1);
      const postprocessing = args.slice(postprocessingIndex + 1, filenameIndex).trim().slice(1, -1);
      const magicJqStr = args.slice(0, postprocessingIndex).trim().slice(1, -1);

      if (filename !== '') {
        console.warn(`Filenames not yet supported, got: ${filename}`);
        continue;
      }
      if (!['none', 'grid'].includes(postprocessing)) {
        console.warn(`Postprocessing step must be one of 'none','grid' but got: ${postprocessing}`);
        continue;
      }

      try {
        const magicJqResult = jq.json({ puzzle: activePuzzle, annotation: activeAnnotation }, magicJqStr);
        switch (typeof magicJqResult) {
          case 'string':
            newPrompt = newPrompt.replaceAll(match[0], magicJqResult);
            break;
          case 'object':
            let replacement = JSON.stringify(magicJqResult, undefined, 2);
            if (Array.isArray(magicJqResult) && postprocessing === 'grid') {
              try {
                replacement = formatGrid(magicJqResult);
              } catch {
                console.error(`Failed to format grid for: ${magicJqResult}`)
              }
            }
            newPrompt = newPrompt.replaceAll(match[0], replacement);
            break;
        }
      } catch {
        console.warn("jq failed for prompt template")
      }
    }

    return newPrompt;
  }, [promptTemplate, activePuzzle, activeAnnotation], 250);

  const encodedPrompt = useMemo(() => {
    const tokens = llama3Tokenizer.encode(prompt, { bos: true, eos: false });
    return tokens.filter((x) => !([12175].includes(x)))
  }, [prompt]);

  const decodedPrompt = useMemo(() => llama3Tokenizer.decode(encodedPrompt), [encodedPrompt]);

  const generateCompletions = useCallback(async () => {
    setIsThinking(true);
    setCompletions(new Map());

    // @ts-ignore
    const stream = await openai.completions.create({
      model: "corruption-lora",//"meta-llama/Meta-Llama-3-8B",
      prompt: encodedPrompt,
      temperature: 0.1,
      top_k: 40,
      top_p: 0.95,
      min_p: 0.05,
      max_tokens: 10,
      stream: true,
      echo: false,
      // best_of: 100,
      n: NUM_COMPLETIONS,
    });
    for await (const chunk of stream) {
      setCompletions((oldCompletions) => {
        const newCompletions = new Map(oldCompletions);

        chunk.choices.forEach((choice) =>
          newCompletions.set(
            choice.index,
            (newCompletions.get(choice.index) ?? "") + choice.text
          )
        );

        return newCompletions;
      });
    }

    setIsThinking(false);
  }, [encodedPrompt]);

  return (
    <>
      <div className="flex flex-col gap-4 mb-4 justify-center items-center">
        <Textarea
          variant="bordered"
          value={promptTemplate}
          onValueChange={setPromptTemplate}
          maxRows={20}
        />
        {/* <Divider className="my-4" /> */}
        <div className="flex flex-row items-center">
          <Pagination
            total={NUM_COMPLETIONS}
            variant="light"
            color="success"
            showControls={true}
            loop={true}
            page={completionsPage}
            onChange={setCompletionsPage}
          />
          <Button onPress={generateCompletions} isLoading={isThinking}>Generate</Button>
        </div>
        <Divider />
      </div>
      <div className={"overflow-scroll"}>
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1(props) {
              const { node, ...rest } = props;
              return (
                <span className="mb-2 flex gap-1 text-small text-primary-700">
                  {"#"}
                  <h1 {...rest} />
                </span>
              );
            },
            h2(props) {
              const { node, ...rest } = props;
              return (
                <span className="mb-2 flex gap-1 text-small text-secondary-700">
                  {"##"}
                  <h2 {...rest} />
                </span>
              );
            },
            h3(props) {
              const { node, ...rest } = props;
              return (
                <span className="mb-2 flex gap-1 text-small text-emerald-200">
                  {"###"}
                  <h3 {...rest} />
                </span>
              );
            },
            em(props) {
              const { node, ...rest } = props;
              return (
                <i className="text-danger-700">
                  *<i {...rest} />*
                </i>
              );
            },
            code(props) {
              const { node, ...rest } = props;
              return <code className="text-small text-warning-700" {...rest} />;
            },
            br(props) {
              const { node, ...rest } = props;
              return <br className="mb-2" {...rest} />;
            },
            p(props) {
              const { node, ...rest } = props;
              return <p className="mb-2 text-small" {...rest} />;
            },
          }}
        >
          {/* {decodedPrompt + (completions.get(completionsPage - 1) ?? "")} */}
          {completions.get(completionsPage - 1) ?? ""}
        </Markdown>
      </div>
    </>
  );
}
