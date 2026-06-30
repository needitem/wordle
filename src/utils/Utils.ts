import Hangul from "hangul-js";
import _ from "lodash";
import moment from "moment";
import { GameType } from "store/game";
import { ROW_COUNT } from "utils/const";
import { GameData } from "utils/GameData";

export const Utils = {
  /** 평가 문자열이 전부 스트라이크(=정답)인지 확인 */
  isAllStrike: (evaluation: string): boolean => {
    return evaluation.length > 0 && evaluation.split("").every(c => c === "s");
  },
  /**
   *
   * @param guess 'ㅊㅜㅊㅡㄱ'
   * @param solution '정답'
   * @returns
   */
  getEvaluation: (guess: string, solution: string) => {
    const letterCount = guess.length;
    let evaluation = Array(letterCount).fill("o");
    const solution_ = Hangul.disassemble(solution);

    // 스트라이크 체크
    for (let i = 0; i < letterCount; ++i) {
      if (guess[i] === solution_[i]) {
        evaluation[i] = "s";
      }
    }

    // 볼 체크
    for (let i = 0; i < letterCount; ++i) {
      if (evaluation[i] === "o") {
        let countLetterInSolution = solution_.filter(
          l => l === guess[i]
        ).length;
        let countSB = 0;
        for (let j = 0; j < letterCount; ++j) {
          if (guess[i] === guess[j] && evaluation[j] !== "o") {
            ++countSB;
          }
        }

        if (countSB < countLetterInSolution) {
          evaluation[i] = "b";
        }
      }
    }

    return evaluation.join("");
  },
  checkHardmode: (
    curRow: number,
    guessList: string[],
    evaluationList: string[]
  ): string => {
    const letterCount = guessList[curRow].length;

    // 스트라이크 체크
    for (let i = 0; i < curRow; ++i) {
      for (let j = 0; j < letterCount; ++j) {
        if (evaluationList[i].split("")[j] === "s") {
          if (guessList[curRow].split("")[j] !== guessList[i].split("")[j]) {
            return `${j + 1}번째 글자는 '${
              guessList[i].split("")[j]
            }' 이어야 합니다.`;
          }
        }
      }
    }

    // 볼 체크
    for (let i = 0; i < curRow; ++i) {
      for (let j = 0; j < letterCount; ++j) {
        if (evaluationList[i].split("")[j] === "b") {
          if (!guessList[curRow].includes(guessList[i].split("")[j])) {
            return `'${guessList[i].split("")[j]}' 글자가 포함되어야 합니다.`;
          }
        }
      }
    }

    return "";
  },
  getCopyText: (
    gameType: GameType,
    isHardmode: boolean,
    isContrastmode: boolean,
    isDarkmode: boolean,
    gameData: GameData,
    key?: string
  ) => {
    const title =
      gameType === "NORMAL"
        ? "워들"
        : gameType === "INFINITE"
        ? "무한워들"
        : gameType === "CUSTOM"
        ? "워들커스텀"
        : "워들vsAI";

    const id = gameType === "CUSTOM" ? "" : `${gameData.id} `;

    const site =
      gameType === "NORMAL"
        ? "https://needitem.github.io/wordle\n\n"
        : gameType === "INFINITE"
        ? "https://needitem.github.io/wordle/#/infinite\n\n"
        : gameType === "CUSTOM"
        ? `https://needitem.github.io/wordle/#/c/${key}\n\n`
        : "https://needitem.github.io/wordle/#/battle\n\n";

    const state = `${
      gameData.evaluationList.some(evaluation => Utils.isAllStrike(evaluation))
        ? gameData.evaluationList
            .filter(evaluation => evaluation)
            .length.toString()
        : "X"
    }/${ROW_COUNT}`;

    const flag = moment().month() === 2 && moment().date() === 1 ? "🇰🇷 " : "";
    let copyText = `${flag}${title} ${id}${state}${isHardmode ? "*" : ""}\n`;

    copyText += site;
    copyText += gameData.evaluationList
      .filter(evaluation => evaluation !== "")
      .map(evaluation =>
        evaluation
          .split("")
          .reduce(
            (p, c) =>
              (p +=
                c === "s"
                  ? isContrastmode
                    ? "🟧"
                    : "🟩"
                  : c === "b"
                  ? isContrastmode
                    ? "🟦"
                    : "🟨"
                  : isDarkmode
                  ? "⬛"
                  : "⬜"),
            ""
          )
      )
      .join("\n");

    return copyText;
  },
  getNewKeyMap: (
    guess: string,
    evaluation: string,
    keyMap: { [key: string]: string }
  ) => {
    const newkeyMap = _.cloneDeep(keyMap);
    guess.split("").forEach((letter, i) => {
      if (evaluation[i] === "s") {
        newkeyMap[letter] = "s";
      } else if (evaluation[i] === "b") {
        if (newkeyMap[letter] !== "s") {
          newkeyMap[letter] = "b";
        }
      } else {
        if (newkeyMap[letter] === undefined) {
          newkeyMap[letter] = "o";
        }
      }
    });

    return newkeyMap;
  },
  /** 커스텀 게임 URL 용으로 정답 단어를 URL-safe base64 로 인코딩 */
  encodeSolution: (word: string): string => {
    const b64 = btoa(unescape(encodeURIComponent(word)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  /** 커스텀 게임 URL 의 key 를 정답 단어로 디코딩 */
  decodeSolution: (key: string): string => {
    try {
      const b64 = key.replace(/-/g, "+").replace(/_/g, "/");
      return decodeURIComponent(escape(atob(b64)));
    } catch {
      return "";
    }
  }
};
