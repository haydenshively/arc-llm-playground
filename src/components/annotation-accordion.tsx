import { Annotation } from "@/app/api/write_annotation/route";
import { Accordion, AccordionItem, Textarea } from "@nextui-org/react";
import { useEffect, useState } from "react";

const ANNOTATION_ORDER: { [k in keyof Annotation]: number } = {
  examples: 0,
  problems: 1,
  rulesetHypothesis: 2,
  potentiallyUsefulFunctions: 3,
  pythonSolution: 4,
  name: 100,
};

const ANNOTATION_TITLES: { [k in keyof Annotation]: string } = {
  examples: "Example",
  problems: "Problem",
  rulesetHypothesis: "Ruleset",
  potentiallyUsefulFunctions: "Potentially useful functions",
  pythonSolution: "Python",
  name: "Name",
};

export function AnnotationAccordion({
  savedAnnotation,
  setUpdatedAnnotation,
}: {
  savedAnnotation: Annotation;
  setUpdatedAnnotation: (annotation: Annotation) => void;
}) {
  const [textAreaTexts, setTextAreaTexts] = useState(new Map<string, string>());

  useEffect(() => {
    setUpdatedAnnotation({
      name: savedAnnotation.name,
      // @ts-ignore
      examples: savedAnnotation.examples.map((example, i) =>
        Object.fromEntries(
          Object.entries(example).map(([k, v]) => [
            k,
            textAreaTexts.get(`${savedAnnotation.name}.examples.[${i}].${k}`) ??
              v,
          ])
        )
      ),
      // @ts-ignore
      problems: savedAnnotation.problems.map((problem, i) =>
        Object.fromEntries(
          Object.entries(problem).map(([k, v]) => [
            k,
            textAreaTexts.get(`${savedAnnotation.name}.problems.[${i}].${k}`) ??
              v,
          ])
        )
      ),
      rulesetHypothesis:
        textAreaTexts.get(`${savedAnnotation.name}.rulesetHypothesis`) ??
        savedAnnotation.rulesetHypothesis,
      potentiallyUsefulFunctions:
        textAreaTexts.get(
          `${savedAnnotation.name}.potentiallyUsefulFunctions`
        ) ?? savedAnnotation.potentiallyUsefulFunctions,
      pythonSolution:
        textAreaTexts.get(`${savedAnnotation.name}.pythonSolution`) ??
        savedAnnotation.pythonSolution,
    });
  }, [savedAnnotation, textAreaTexts, setUpdatedAnnotation]);

  return (
    <Accordion
      isCompact={true}
      selectionMode="multiple"
      keepContentMounted={true}
    >
      {Object.entries(savedAnnotation)
        .filter(([key]) => key !== "name")
        .sort(([a], [b]) => {
          return (
            ANNOTATION_ORDER[a as keyof Annotation] -
            ANNOTATION_ORDER[b as keyof Annotation]
          );
        })
        .map(([outerKey, outerValue]) => {
          let outerTitle = ANNOTATION_TITLES[outerKey as keyof Annotation];
          let outerPath = `${savedAnnotation.name}.${outerKey}`;

          if (!Array.isArray(outerValue)) {
            const title = outerTitle;
            const path = outerPath;

            return (
              <AccordionItem key={path} aria-label={title} title={title}>
                <div className="flex flex-col gap-2">
                  <Textarea
                    value={textAreaTexts.get(path)}
                    onValueChange={(text) => {
                      const updated = new Map(textAreaTexts);
                      updated.set(path, text);
                      setTextAreaTexts(updated);
                    }}
                    label={outerKey}
                    placeholder="Enter ground truth"
                  />
                </div>
              </AccordionItem>
            );
          }

          return outerValue.map((arrayItem, i) => {
            const arrayItemTitle = outerTitle.concat(` ${i + 1}`);
            const arrayItemPath = outerPath.concat(`.[${i}]`);

            return (
              <AccordionItem
                key={arrayItemPath}
                aria-label={arrayItemTitle}
                title={arrayItemTitle}
              >
                <div className="flex flex-col gap-2">
                  {Object.keys(arrayItem).map((innerKey) => {
                    const path = arrayItemPath.concat(".", innerKey);
                    return (
                      <Textarea
                        key={path}
                        value={textAreaTexts.get(path)}
                        onValueChange={(text) => {
                          const updated = new Map(textAreaTexts);
                          updated.set(path, text);
                          setTextAreaTexts(updated);
                        }}
                        label={innerKey}
                        placeholder="Enter ground truth"
                      />
                    );
                  })}
                </div>
              </AccordionItem>
            );
          });
        })
        .flat()}
    </Accordion>
  );
}
