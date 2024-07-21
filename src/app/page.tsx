"use client";

import {
  Button,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@nextui-org/react";
import { useCallback, useState } from "react";
import { Puzzle } from "./api/read_puzzle/route";
import { Annotation } from "./api/write_annotation/route";
import { PuzzleSelectionTable } from "@/components/puzzle-selection-table";
import { Grid } from "@/components/grid";
import { AnnotationAccordion } from "@/components/annotation-accordion";
import { CompletionsWidget } from "@/components/completions";

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
  const [isSaving, setIsSaving] = useState(false);

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

  const saveAnnotation = useCallback((annotation: Annotation | null) => {
    if (!annotation) return;

    (async () => {
      setIsSaving(true);
      const body = JSON.stringify(annotation);
      await fetch("/api/write_annotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      setIsSaving(false);
    })();
  }, []);

  return (
    <>
      <div className="flex justify-center items-center">
        <div className="mt-20 w-5/6 max-5/6">
          <div className="flex justify-between items-end">
            <h1>Puzzle {data?.puzzle.name}</h1>
            <div className="flex justify-evenly items-end gap-2">
              <Button onPress={onOpenSelectPuzzleModal}>Open</Button>
              <Button onPress={() => saveAnnotation(updatedAnnotation)} isLoading={isSaving}>
                Save
              </Button>
              <Button>Options</Button>
            </div>
          </div>
          <div className="my-4 grid grid-cols-2 gap-4">
            {data ? (
              <div>
                <div className="flex overflow-scroll gap-8 border-small border-foreground-300 rounded-lg p-2">
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
            ) : (
              <div></div>
            )}
            <div className="bg-foreground-100 rounded-lg p-4 h-fit">
              <CompletionsWidget
                activePuzzle={data?.puzzle}
                activeAnnotation={updatedAnnotation ?? data?.annotation}
              />
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
