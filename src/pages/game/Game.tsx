import { HelpModal } from "components/modals/HelpModal";
import { StatisticsModal } from "components/modals/StatisticsModal";
import Hangul from "hangul-js";
import _ from "lodash";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";
import AdSense from "react-adsense";
import { isBrowser, isMobile } from "react-device-detect";
import ReactGA from "react-ga4";
import { useDispatch, useSelector } from "react-redux";
import { RouteComponentProps } from "react-router-dom";
import { RootState } from "store";
import { addToast, addToast2, setLoading } from "store/common";
import {
  setCurRow,
  setEvaluationList,
  setGameType,
  setGuessList,
  setId,
  setKeyMap,
  setSolution,
  syncFromGameData
} from "store/game";
import { setShowHelpModal, setShowStatisticsModal } from "store/modal";
import { MAX_LETTER_COUNT, MIN_LETTER_COUNT, ROW_COUNT } from "utils/const";
import {
  GameData,
  getGameDataFromLS,
  initGameData,
  saveGameData
} from "utils/GameData";
import { getStatisticsData, saveStatisticsData } from "utils/StatisticsData";
import { Utils } from "utils/Utils";
import { getDailyWord, getRandomWord, getWordBuckets } from "utils/words";
import "./Game.scss";
import { GameBody } from "./GameBody";
import { GameHeader } from "./GameHeader";
import { GameKeyboard } from "./GameKeyboard";
import { GameKeyboardInput } from "./GameKeyboardInput";
ReactGA.initialize("G-L07VJN65FL");

export interface ResultSummaryRes {
  id: number;
  solution: string;
  "-1": number;
  0: number;
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

/** 오늘의 워들 번호 (기준일로부터 며칠 지났는지) */
const getTodayId = (): number => {
  return moment().startOf("day").diff(moment("2022-02-01"), "days");
};

const Game = ({ match }: RouteComponentProps) => {
  const dispatch = useDispatch();

  const gameType = useSelector((state: RootState) => state.game.gameType);

  const solution = useSelector((state: RootState) => state.game.solution);
  const letterCount = useSelector((state: RootState) => state.game.letterCount);
  const curRow = useSelector((state: RootState) => state.game.curRow);
  const guessList = useSelector((state: RootState) => state.game.guessList);
  const evaluationList = useSelector(
    (state: RootState) => state.game.evaluationList
  );
  const keyMap = useSelector((state: RootState) => state.game.keyMap);

  // 사용자가 설정한 선호 글자 수 (새 게임 생성 시 사용)
  const preferredLetterCount = useSelector(
    (state: RootState) => state.common.letterCount
  );

  const [shake, setShake] = useState<boolean>(false);
  const [isEnabledInput, setIsEnabledInput] = useState<boolean>(true);

  const isDarkmode = useSelector((state: RootState) => state.common.isDarkmode);
  const isHardmode = useSelector((state: RootState) => state.common.isHardmode);
  const isContrastmode = useSelector(
    (state: RootState) => state.common.isContrastMode
  );

  const curGuess = useMemo(() => {
    return guessList[curRow] ?? "";
  }, [curRow, guessList]);

  // mounted
  useEffect(() => {
    if (match.path.startsWith("/c/")) {
      dispatch(setGameType("custom"));
    } else {
      const gameType: string = match.path.substring(1);
      dispatch(setGameType(gameType));
    }
  }, [match]);

  // init - 설정한 글자 수가 바뀌어도 다시 초기화
  useEffect(() => {
    if (gameType !== "NONE") {
      init();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameType, preferredLetterCount]);

  const init = async () => {
    dispatch(setLoading(true));

    if (gameType === "NORMAL" && match.path === "/") {
      const todayId = getTodayId();
      const gameData = getGameDataFromLS(gameType);

      // 최초 접속 시 헬프 모달
      if (gameData.id === 0) {
        dispatch(setShowHelpModal(true));
      }

      const isSameGame =
        gameData.id === todayId &&
        gameData.letterCount === preferredLetterCount &&
        !!gameData.solution;

      if (isSameGame) {
        syncGameData(gameData);

        if (gameData.state === "FINISH") {
          setIsEnabledInput(false);
          setTimeout(() => {
            dispatch(setShowStatisticsModal(true));
          }, 1000);
        } else {
          setIsEnabledInput(true);
        }
      } else {
        const dailySolution = getDailyWord(preferredLetterCount, todayId);
        startNewGame(todayId, dailySolution, preferredLetterCount);
      }
    } else if (gameType === "INFINITE" && match.path === "/infinite") {
      const gameData = getGameDataFromLS(gameType);
      const canResume =
        gameData.id !== 0 &&
        gameData.state === "PLAYING" &&
        gameData.letterCount === preferredLetterCount &&
        !!gameData.solution;

      if (canResume) {
        syncGameData(gameData);
        setIsEnabledInput(true);
      } else {
        startNewInfiniteGame();
      }
    } else if (gameType === "CUSTOM" && match.path.startsWith("/c/")) {
      startCustomGame();
    }

    dispatch(setLoading(false));
  };

  const startCustomGame = () => {
    const key = (match.params as any).key;
    const customSolution = Utils.decodeSolution(key);
    const disassembled = Hangul.disassemble(customSolution);

    const isValid =
      customSolution.length > 0 &&
      Hangul.isCompleteAll(customSolution) &&
      disassembled.length >= MIN_LETTER_COUNT &&
      disassembled.length <= MAX_LETTER_COUNT;

    if (!isValid) {
      dispatch(addToast({ text: "잘못된 게임 주소입니다." }));
      return;
    }

    const lc = disassembled.length;
    const gameData = getGameDataFromLS(gameType);

    const canResume =
      gameData.id === -1 &&
      gameData.solution === customSolution &&
      gameData.state === "PLAYING";

    dispatch(setId(-1));
    dispatch(setSolution(customSolution));

    if (canResume) {
      syncGameData(gameData);
      setIsEnabledInput(true);
    } else {
      startNewGame(-1, customSolution, lc);
    }
  };

  const startNewInfiniteGame = () => {
    const newSolution = getRandomWord(preferredLetterCount);
    if (!newSolution) {
      dispatch(addToast({ text: "해당 글자 수의 단어가 없습니다." }));
      return;
    }
    // 무한 모드는 id 가 통계 분포 용도 외에 의미 없으므로 증가만 시킨다.
    const prevId = getGameDataFromLS(gameType).id;
    const id = (prevId > 0 ? prevId : 0) + 1;
    startNewGame(id, newSolution, preferredLetterCount);
  };

  const startNewGame = (
    id: number,
    newSolution: string,
    newLetterCount: number
  ) => {
    const gameData: GameData = _.cloneDeep(initGameData);
    gameData.id = id;
    gameData.curRow = 0;
    gameData.solution = newSolution;
    gameData.letterCount = newLetterCount;
    saveGameData(gameType, gameData);
    syncGameData(gameData);
    setIsEnabledInput(true);
  };

  /** 게임데이터를 스토어에 싱크 */
  const syncGameData = (gameData: GameData) => {
    dispatch(syncFromGameData(gameData));
  };

  const onClickKeyboard = (letter: string) => {
    if (!isEnabledInput) {
      return;
    }

    if (curGuess.length < letterCount) {
      const guessList_ = [...guessList];
      guessList_[curRow] += letter;
      dispatch(setGuessList(guessList_));
    }
  };

  const shakeTiles = () => {
    setShake(true);
    setTimeout(() => {
      setShake(false);
    }, 200);
  };

  const onClickEnter = async () => {
    if (!isEnabledInput) {
      return;
    }

    if (curGuess.length !== letterCount) {
      return;
    }

    const guessWord = Hangul.assemble(curGuess.split(""));

    // 완성된 한글인지 체크
    const isCompleteWord =
      guessWord.split("").every(letter => Hangul.isComplete(letter)) &&
      Hangul.disassemble(guessWord).length === letterCount;

    if (!isCompleteWord) {
      dispatch(addToast({ text: "완성된 단어를 입력하세요." }));
      shakeTiles();
      return;
    }

    // 하드 모드 체크
    if (isHardmode) {
      const error = Utils.checkHardmode(curRow, guessList, evaluationList);
      if (error) {
        dispatch(addToast({ text: error }));
        shakeTiles();
        return;
      }
    }

    setIsEnabledInput(false);

    // 평가
    const evaluation = Utils.getEvaluation(curGuess, solution);
    const isWin = Utils.isAllStrike(evaluation);

    // 게임 기록 업데이트
    const gameData: GameData = getGameDataFromLS(gameType);
    gameData.curRow = curRow + 1;
    gameData.guessList[curRow] = curGuess;
    gameData.evaluationList[curRow] = evaluation;
    gameData.keyMap = _.cloneDeep(
      Utils.getNewKeyMap(curGuess, evaluation, keyMap)
    );
    gameData.solution = solution;
    gameData.letterCount = letterCount;
    saveGameData(gameType, gameData);

    // 통계 업데이트
    if (isWin) {
      const statisticsData = getStatisticsData(gameType);
      statisticsData.currentStreak += 1;
      statisticsData.maxStreak = Math.max(
        statisticsData.maxStreak,
        statisticsData.currentStreak
      );
      statisticsData.success[curRow] =
        (statisticsData.success[curRow] ?? 0) + 1;
      saveStatisticsData(gameType, statisticsData);

      gameData.curRow = curRow;
      gameData.state = "FINISH";
      saveGameData(gameType, gameData);
    } else if (curRow === ROW_COUNT - 1) {
      const statisticsData = getStatisticsData(gameType);
      statisticsData.currentStreak = 0;
      statisticsData.fail += 1;
      saveStatisticsData(gameType, statisticsData);

      gameData.curRow = curRow;
      gameData.state = "FINISH";
      saveGameData(gameType, gameData);
    }

    // 애니메이션 주면서 타일 오픈
    for (let i = 0; i < letterCount; ++i) {
      setTimeout(() => {
        const evaluationList_ = [...evaluationList];
        evaluationList_[curRow] = evaluation.slice(0, i + 1);
        dispatch(setEvaluationList(evaluationList_));
      }, i * 320);
    }

    setTimeout(() => {
      const newKeyMap = Utils.getNewKeyMap(curGuess, evaluation, keyMap);
      dispatch(setKeyMap(newKeyMap));

      // 종료 처리
      if (isWin) {
        const answerString = [
          "천재!!!",
          "굉장해요!!!",
          "정말 잘했어요!!",
          "멋져요!",
          "잘했어요!!",
          "휴~ 겨우 맞췄네요!"
        ];

        dispatch(
          addToast({
            text: answerString[curRow] ?? "정답입니다!",
            delay: 2000
          })
        );

        setTimeout(() => {
          dispatch(setShowStatisticsModal(true));
        }, 2000);

        ReactGA.event({
          category: gameType,
          action: "gameplay",
          value: curRow
        });
      } else if (curRow === ROW_COUNT - 1) {
        dispatch(
          addToast({
            text: "다음에 다시 도전해보세요.",
            delay: 2000
          })
        );

        dispatch(
          addToast({
            text: `정답은 '${solution}' 입니다`,
            delay: 4000
          })
        );

        setTimeout(() => {
          dispatch(setShowStatisticsModal(true));
        }, 2000);

        ReactGA.event({
          category: gameType,
          action: "gameplay",
          label: "게임",
          value: -1
        });
      } else {
        dispatch(setCurRow(curRow + 1));
        setIsEnabledInput(true);
      }
    }, letterCount * 320 + 100);
  };

  const onClickBack = () => {
    if (!isEnabledInput) {
      return;
    }

    if (0 < curGuess.length) {
      const guessList_ = [...guessList];
      guessList_[curRow] = guessList_[curRow].slice(0, -1);
      dispatch(setGuessList(guessList_));
    }
  };

  const onClickShare = () => {
    const gameData = getGameDataFromLS(gameType);
    let copyText = Utils.getCopyText(
      gameType,
      isHardmode,
      isContrastmode,
      isDarkmode,
      gameData,
      (match.params as any).key
    );

    if (isMobile && navigator.share) {
      navigator.share({
        text: copyText
      });
    } else if (navigator.clipboard.writeText) {
      navigator.clipboard.writeText(copyText);
      dispatch(
        addToast2({
          text: "게임 결과를 클립보드에 복사했습니다.",
          delay: 2000
        })
      );
    } else {
      dispatch(
        addToast2({
          text: "클립보드 복사에 실패하였습니다. (크롬에서 시도해 보세요)",
          delay: 2000
        })
      );
    }

    ReactGA.event({
      category: "share",
      action: "click"
    });
  };

  // 사용 가능한 단어가 있는지 (방어용)
  const hasWords = useMemo(() => {
    return (getWordBuckets()[letterCount]?.length ?? 0) > 0;
  }, [letterCount]);

  return (
    <div className="game">
      <div>
        {isBrowser && (
          <GameKeyboardInput
            onClickKeyboard={onClickKeyboard}
            onClickEner={onClickEnter}
            onClickBack={onClickBack}
          />
        )}

        <StatisticsModal
          onClickShare={onClickShare}
          onClickNewInfiniteGame={startNewInfiniteGame}
          onClickNewBattleGame={startNewInfiniteGame}
        />
        <HelpModal />
      </div>

      <GameHeader />
      {!hasWords && (
        <div className="text-center py-4">
          해당 글자 수의 단어가 준비되어 있지 않습니다.
        </div>
      )}
      <GameBody shake={shake} />
      <GameKeyboard
        onClickKeyboard={onClickKeyboard}
        onClickEner={onClickEnter}
        onClickBack={onClickBack}
      />
      <AdSense.Google
        className="mt-4 mb-2"
        style={{ display: "inline-block", width: "100%", height: 90 }}
        client="ca-pub-7150456660061561"
        slot="3236246273"
        format=""
      />
    </div>
  );
};

export { Game };
