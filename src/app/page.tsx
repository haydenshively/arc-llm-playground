"use client";

import {
  Button,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  useDisclosure,
} from "@nextui-org/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Puzzle } from "./api/read_puzzle/route";
import { Annotation } from "./api/write_annotation/route";
import { PuzzleSelectionTable } from "@/components/puzzle-selection-table";
import { Grid } from "@/components/grid";
import { AnnotationAccordion } from "@/components/annotation-accordion";
import OpenAI from "openai";

const NUM_COMPLETIONS = 10;

export default function Chat() {
  const [newlySelectedPuzzle, setNewlySelectedPuzzle] = useState<Set<string>>(
    new Set([])
  );
  const [data, setData] = useState<{
    puzzle: Puzzle;
    annotation: Annotation;
  } | null>(null);
  const [updatedAnnotation, setUpdatedAnnotation] = useState<Annotation | null>(
    null
  );
  const [completionsPage, setCompletionsPage] = useState(1);
  const [completions, setCompletions] = useState(new Map<number, string>());

  const {
    isOpen: isSelectPuzzleModalOpen,
    onOpen: onOpenSelectPuzzleModal,
    onOpenChange: onOpenSelectPuzzleModalChange,
  } = useDisclosure();

  const fetchSelectedPuzzle = useCallback(() => {
    if (newlySelectedPuzzle.size === 0) {
      console.warn("Called `fetchSelectedPuzzle` before selecting a puzzle");
      return;
    }
    let name = Array.from(newlySelectedPuzzle.values())[0];

    setData(null);
    (async () => {
      const body = JSON.stringify({ name });
      const res = await fetch("/api/read_puzzle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      setData(await res.json());
    })();
  }, [newlySelectedPuzzle]);

  console.log(completions);

  // const content = useMarkdownProcessor(completions.get(0) ?? "");

  useEffect(() => {
    setCompletions(new Map());

    (async () => {
      const openai = new OpenAI({
        baseURL: "http://localhost:3000/api/",
        apiKey: "",
        dangerouslyAllowBrowser: true,
      });

      // @ts-ignore
      const stream = await openai.completions.create({
        model: "meta-llama/Meta-Llama-3-8B",
        prompt:
          "Hello world, my name is Hayden and I'm a software engineer. Here's a summary of my day today:",
        temperature: 1.2,
        top_k: 40,
        top_p: 0.95,
        min_p: 0.05,
        max_tokens: 128,
        stream: true,
        echo: false,
        n: NUM_COMPLETIONS,
      });
      for await (const chunk of stream) {
        // console.log(chunk);
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
    })();
  }, [updatedAnnotation]);

  return (
    <>
      <div className="flex justify-center items-center">
        <div className="mt-20 w-5/6">
          <div className="flex justify-between items-end">
            <h1>Puzzle {data?.puzzle.name}</h1>
            <div className="flex justify-evenly items-end gap-2">
              <Button onPress={onOpenSelectPuzzleModal}>Open</Button>
              <Button>Save</Button>
              <Button>Options</Button>
            </div>
          </div>
          <div className="my-4 flex gap-4">
            {data && (
              <div className="w-3/5">
                <div className="w-full flex overflow-auto gap-8 border-small border-foreground-300 rounded-lg p-2">
                  {data.puzzle.train.map((example, i) => (
                    <div key={`examples.${i}`} className="flex flex-col gap-2">
                      <p className="text-tiny uppercase font-bold">{`Example ${
                        i + 1
                      }`}</p>
                      <div className="flex gap-2">
                        <Grid grid={example.input} />
                        <Grid grid={example.output} />
                      </div>
                    </div>
                  ))}
                  {data.puzzle.test.map((problem, i) => (
                    <div key={`problems.${i}`} className="flex flex-col gap-2">
                      <p className="text-tiny uppercase font-bold text-danger-500">{`Problem ${
                        i + 1
                      }`}</p>
                      <div className="flex gap-2">
                        <Grid grid={problem.input} />
                        <Grid grid={problem.output} />
                      </div>
                    </div>
                  ))}
                </div>
                <AnnotationAccordion
                  savedAnnotation={data.annotation}
                  setUpdatedAnnotation={setUpdatedAnnotation}
                />
              </div>
            )}
            <div className="w-2/5 bg-slate-500 rounded-lg p-2">
              <Pagination
                total={NUM_COMPLETIONS}
                color="secondary"
                page={completionsPage}
                onChange={setCompletionsPage}
              />
              {completions.get(completionsPage - 1) ?? ""}
            </div>
          </div>
        </div>
      </div>
      <Modal
        hideCloseButton={true}
        isOpen={isSelectPuzzleModalOpen}
        onOpenChange={onOpenSelectPuzzleModalChange}
        size="3xl"
        backdrop="blur"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Select a puzzle
              </ModalHeader>
              <ModalBody>
                <PuzzleSelectionTable
                  selectedPuzzle={newlySelectedPuzzle}
                  setSelectedPuzzle={setNewlySelectedPuzzle}
                />
              </ModalBody>
              <Divider className="mt-2" />
              <ModalFooter>
                <Button
                  color="danger"
                  variant="light"
                  onPress={() => {
                    setNewlySelectedPuzzle(new Set(data?.puzzle.name));
                    onClose();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={() => {
                    fetchSelectedPuzzle();
                    onClose();
                  }}
                  isDisabled={newlySelectedPuzzle.size === 0}
                >
                  Open
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
