import React, { useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "store";
import useInterval from "utils/useInterval";

interface Props {
  onClickKeyboard: (letter: string) => void;
  onClickEner: () => void;
  onClickBack: () => void;
}

const GameKeyboardInput = (props: Props) => {
  // 모달이 열려있으면 포커스를 가로채지 않는다. (드롭다운/입력 동작 방해 방지)
  const isAnyModalOpen = useSelector(
    (state: RootState) =>
      state.modal.showAddSolutionModal ||
      state.modal.showSettingModal ||
      state.modal.showHelpModal ||
      state.modal.showStatisticsModal
  );

  const divRef = useRef<HTMLDivElement>(null);

  const letterCount = useSelector((state: RootState) => state.game.letterCount);
  const curRow = useSelector((state: RootState) => state.game.curRow);
  const guessList = useSelector((state: RootState) => state.game.guessList);

  const curGuess = useMemo(() => {
    return guessList[curRow] ?? "";
  }, [curRow, guessList]);

  useInterval(() => {
    if (divRef.current) {
      if (!isAnyModalOpen) {
        divRef.current.focus();
      }
    }
  }, 100);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.code === "Enter") {
      if (curGuess.length === letterCount) {
        props.onClickEner();
      }
    } else if (e.code === "Backspace") {
      if (0 < curGuess.length) {
        props.onClickBack();
      }
    } else {
      const code: { [key: string]: string } = {
        KeyQ: "ㅂ",
        KeyW: "ㅈ",
        KeyE: "ㄷ",
        KeyR: "ㄱ",
        KeyT: "ㅅ",
        KeyY: "ㅛ",
        KeyU: "ㅕ",
        KeyI: "ㅑ",
        KeyO: "ㅐ",
        KeyP: "ㅔ",
        KeyA: "ㅁ",
        KeyS: "ㄴ",
        KeyD: "ㅇ",
        KeyF: "ㄹ",
        KeyG: "ㅎ",
        KeyH: "ㅗ",
        KeyJ: "ㅓ",
        KeyK: "ㅏ",
        KeyL: "ㅣ",
        KeyZ: "ㅋ",
        KeyX: "ㅌ",
        KeyC: "ㅊ",
        KeyV: "ㅍ",
        KeyB: "ㅠ",
        KeyN: "ㅜ",
        KeyM: "ㅡ"
      };

      if (code[e.code]) {
        props.onClickKeyboard(code[e.code]);
      }
    }
  };

  return (
    <div
      className="position-absolute"
      ref={divRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    ></div>
  );
};

export { GameKeyboardInput };
