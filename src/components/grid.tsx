import { Card, CardHeader } from "@nextui-org/react";
import { useState } from "react";

const COLOR_MAP = [
  "bg-slate-700",
  "bg-blue-600",
  "bg-red-600",
  "bg-green-600",
  "bg-yellow-400",
  "bg-gray-400",
  "bg-pink-500",
  "bg-red-400",
  "bg-teal-400",
  "bg-slate-200",
];

const COLOR_LABEL_MAP = [
  "black",
  "blue",
  "red",
  "green",
  "yellow",
  "grey",
  "pink",
  "orange",
  "teal",
  "white",
];

export function Grid({ label, grid }: { label?: string; grid: number[][] }) {
  const [hoveredCoordinate, setHoveredCoordinate] = useState<string | null>(
    null
  );

  return (
    <Card radius="sm" className="border-none w-fit h-fit">
      <CardHeader className="pt-2 pb-2 px-2 flex flex-col gap-[0.5px] items-start">
        {label && <p className="text-tiny uppercase font-bold">{label}</p>}
        <small className="text-default-500">{`${grid.length} × ${grid[0].length}`}</small>
        <small className="text-default-500 text-nowrap">{hoveredCoordinate ?? "-"}</small>
      </CardHeader>
      <div className="pb-2 px-2 flex flex-col gap-0.5">
        {grid.map((row, i) => {
          return (
            <div className="flex gap-0.5" key={i}>
              {row.map((cell, j) => {
                const coordinate = `(${i}, ${j})`;
                return (
                  <div
                    className={`w-[16px] h-[16px] ${COLOR_MAP[cell]} rounded-full hover:outline hover:outline-white`}
                    key={j}
                    onMouseDown={() =>
                      setHoveredCoordinate(
                        coordinate + "-" + COLOR_LABEL_MAP[cell]
                      )
                    }
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
