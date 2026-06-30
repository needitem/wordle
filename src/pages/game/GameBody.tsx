import classNames from "classnames";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "store";
import { ROW_COUNT } from "utils/const";
import { Utils } from "utils/Utils";
import "./GameBody.scss";
import { GameTile } from "./GameTile";

interface Props {
  shake: boolean;
}

const GameBody = (props: Props) => {
  const [jump, setJump] = useState<number>(0);

  const letterCount = useSelector((state: RootState) => state.game.letterCount);
  const curRow = useSelector((state: RootState) => state.game.curRow);
  const guessList = useSelector((state: RootState) => state.game.guessList);
  const evaluationList = useSelector(
    (state: RootState) => state.game.evaluationList
  );

  useEffect(() => {
    // 마지막 추측이 다 맞는지 확인
    if (Utils.isAllStrike(evaluationList[curRow] ?? "")) {
      for (let i = 0; i < letterCount; ++i) {
        setTimeout(() => setJump(i + 1), i * 200);
      }
    } else {
      setJump(0);
    }
  }, [evaluationList, curRow, letterCount]);

  return (
    <div className="game-body my-3">
      {Array(ROW_COUNT)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            className={classNames("game-body-row", {
              shake: i === curRow && props.shake
            })}
            style={{ "--letter-count": letterCount } as React.CSSProperties}
          >
            {Array(letterCount)
              .fill(0)
              .map((_, j) => (
                <GameTile
                  key={`${i}_${j}`}
                  letter={guessList[i][j]}
                  evaluation={evaluationList[i][j]}
                  jump={i === curRow && 0 < jump && j < jump}
                />
              ))}
          </div>
        ))}
    </div>
  );
};

export { GameBody };
