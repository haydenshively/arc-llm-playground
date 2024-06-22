import { Annotation } from "@/app/api/write_annotation/route";
import {
  Chip,
  Pagination,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/react";
import { useCallback, useEffect, useMemo, useState } from "react";

const ROWS_PER_PAGE = 10;

export const PuzzleSelectionTable = ({
  selectedPuzzle,
  setSelectedPuzzle,
}: {
  selectedPuzzle: Set<string>;
  setSelectedPuzzle: (x: Set<string>) => void;
}) => {
  const [page, setPage] = useState(1);
  const [datasetInfo, setDatasetInfo] = useState<
    {
      name: string;
      annotation: Annotation | null;
    }[]
  >([]);

  // MARK: Fetch `datasetInfo for use in "Open" modal
  useEffect(() => {
    setDatasetInfo([]);
    (async () => {
      const res = await fetch("/api/inspect_dataset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      setDatasetInfo((await res.json()).datasetInfo);
    })();
  }, []);

  const columns = useMemo(
    () => [
      { key: "name", label: "Puzzle" },
      { key: "examples", label: "Examples" },
      { key: "problems", label: "Problems" },
      { key: "ruleset", label: "Ruleset" },
    ],
    []
  );
  const rows = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;

    return datasetInfo.slice(start, end).map(({ name, annotation }) => {
      let examples = null;
      if (annotation) {
        examples = {
          complete: annotation.examples.reduce(
            (prev, example) =>
              prev + Number(Object.keys(example).every((x) => x.length > 0)),
            0
          ),
          total: annotation.examples.length,
        };
      }

      let problems = null;
      if (annotation) {
        problems = {
          complete: annotation.problems.reduce(
            (prev, problem) =>
              prev + Number(Object.keys(problem).every((x) => x.length > 0)),
            0
          ),
          total: annotation.problems.length,
        };
      }

      return {
        key: name,
        name: name,
        examples,
        problems,
        ruleset: annotation?.rulesetHypothesis !== undefined,
      };
    });
  }, [datasetInfo, page]);

  const renderCell = useCallback(
    (row: (typeof rows)[number], columnKey: keyof (typeof rows)[number]) => {
      const cellValue = row[columnKey];

      switch (columnKey) {
        case "name":
          return cellValue as string;
        case "examples":
        case "problems":
          if (!cellValue)
            return (
              <Chip color="danger" size="sm" variant="flat">
                0
              </Chip>
            );
          const { complete, total } = cellValue as {
            complete: number;
            total: number;
          };
          let color: "danger" | "warning" | "success" = "danger";
          if (complete > 0 && complete < total) color = "warning";
          else color = "success";
          return (
            <Chip color={color} size="sm" variant="flat">
              {`${complete} / ${total}`}
            </Chip>
          );
        case "ruleset":
          return cellValue ? (
            <Chip
              className="capitalize"
              color="success"
              size="sm"
              variant="flat"
            >
              Complete
            </Chip>
          ) : (
            <Chip
              className="capitalize"
              color="danger"
              size="sm"
              variant="flat"
            >
              Empty
            </Chip>
          );
        default:
          return null;
      }
    },
    []
  );

  return (
    <Table
      selectionMode="single"
      selectedKeys={selectedPuzzle}
      onSelectionChange={(x) => {
        // @ts-ignore
        setSelectedPuzzle(x);
      }}
      color="primary"
      isCompact={true}
      removeWrapper={true}
      aria-label="Table showing all available puzzles in the dataset"
      bottomContent={
        <div className="flex w-full justify-center">
          <Pagination
            isCompact
            showControls
            showShadow
            color="primary"
            page={page}
            total={Math.ceil(datasetInfo.length / ROWS_PER_PAGE)}
            onChange={(page) => setPage(page)}
          />
        </div>
      }
    >
      <TableHeader columns={columns}>
        {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
      </TableHeader>
      <TableBody
        items={rows}
        loadingContent={<Spinner />}
        loadingState={rows.length === 0 ? "loading" : "idle"}
      >
        {(item) => (
          <TableRow key={item.key}>
            {(columnKey) => (
              // @ts-ignore
              <TableCell>{renderCell(item, columnKey)}</TableCell>
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
