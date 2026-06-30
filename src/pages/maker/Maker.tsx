import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import classNames from "classnames";
import Hangul from "hangul-js";
import { GameHeader } from "pages/game/GameHeader";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Form } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import { RootState } from "store";
import { addToast } from "store/common";
import { setGameType } from "store/game";
import { Utils } from "utils/Utils";
import "./Maker.scss";

export const Maker = () => {
  const dispatch = useDispatch();
  const history = useHistory();

  // 설정된 글자 수에 맞춰 문제를 만든다.
  const letterCount = useSelector(
    (state: RootState) => state.common.letterCount
  );

  const [word, setWord] = useState<string>("a");
  const [key, setKey] = useState<string>("");

  const tilesRef = useRef<HTMLDivElement>(null);

  const validLetterList = [
    "ㅂ",
    "ㅈ",
    "ㄷ",
    "ㄱ",
    "ㅅ",
    "ㅛ",
    "ㅕ",
    "ㅑ",
    "ㅐ",
    "ㅔ",
    "ㅁ",
    "ㄴ",
    "ㅇ",
    "ㄹ",
    "ㅎ",
    "ㅗ",
    "ㅓ",
    "ㅏ",
    "ㅣ",
    "ㅋ",
    "ㅌ",
    "ㅊ",
    "ㅍ",
    "ㅠ",
    "ㅜ",
    "ㅡ"
  ];

  useEffect(() => {
    dispatch(setGameType("maker"));
    setWord("");
    setKey("");
  }, []);

  const isValid = useMemo(() => {
    if (word.length === 0) {
      return false;
    }

    if (!Hangul.isCompleteAll(word)) {
      return false;
    }

    const letters = Hangul.disassemble(word);
    if (letters.length !== letterCount) {
      return false;
    }

    if (letters.some(letter => !validLetterList.includes(letter))) {
      return false;
    }

    return true;
  }, [word, letterCount]);

  const createWordle = () => {
    if (isValid) {
      setKey(Utils.encodeSolution(word));
    } else {
      dispatch(
        addToast({
          text: `${letterCount}자(자모) 단어를 입력하세요.`
        })
      );

      // 흔들기
      tilesRef.current?.classList.add("shake");
      setTimeout(() => {
        tilesRef.current?.classList.remove("shake");
      }, 200);
    }
  };

  // 설정된 글자 수만큼 타일을 보여준다. (입력한 자모 + 빈칸)
  const letters: string[] = useMemo<string[]>(() => {
    const disassembled = Hangul.disassemble(word);
    const slots = Math.max(letterCount, disassembled.length);
    return Array(slots)
      .fill("")
      .map((_, i) => disassembled[i] ?? "");
  }, [word, letterCount]);

  const wordleUrl = useMemo(() => {
    return `${window.location.origin}${window.location.pathname}#/c/${key}`;
  }, [window.location, key]);

  const onClickCopy = () => {
    if (navigator.clipboard.writeText) {
      navigator.clipboard.writeText(wordleUrl);
      dispatch(
        addToast({
          text: "게임 주소를 클립보드에 복사했습니다.",
          delay: 2000
        })
      );
    } else {
      dispatch(
        addToast({
          text: "클립보드 복사에 실패하였습니다. (크롬에서 시도해 보세요)",
          delay: 2000
        })
      );
    }
  };

  const onClickPlayGame = () => {
    history.push(`/c/${key}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.code === "Enter" && isValid) {
      createWordle();
    }
  };

  return (
    <div className="maker">
      <GameHeader />

      <div className="p-4 pt-5">
        <p className="mb-5">
          직접 워들 문제를 만들어 친구들과 공유하고 즐겨보세요!
        </p>

        <div
          ref={tilesRef}
          className="tiles mb-4"
          style={{ "--letter-count": letterCount } as React.CSSProperties}
        >
          {letters.map((letter, i) => (
            <div
              key={`add-solution-tile-${i}`}
              className={classNames("tile", {
                invalid:
                  (letter && !validLetterList.includes(letter)) ||
                  i >= letterCount
              })}
            >
              {letter}
            </div>
          ))}
        </div>

        <Form.Control
          type="text"
          value={word}
          onChange={e => setWord(e.target.value)}
          maxLength={letterCount}
          placeholder="단어를 입력하세요."
          onKeyDown={onKeyDown}
        />
        <p className="text-left">
          <small>
            * 현재 설정된 글자 수: <b>{letterCount}자</b> (설정에서 변경 가능)
            <br />* shift 가 필요한 글자는 제외됩니다.
          </small>
        </p>

        <Button variant="primary" disabled={!isValid} onClick={createWordle}>
          워들 생성
        </Button>

        {key && (
          <div className="py-5">
            <div className="url p-2">{wordleUrl}</div>
            <div className="pt-2">
              <Button variant="primary" className="me-2" onClick={onClickCopy}>
                클립보드 복사 <ContentCopyIcon fontSize="small" />
              </Button>
              <Button variant="primary" onClick={onClickPlayGame}>
                게임하러가기 <PlayArrowIcon fontSize="small" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
