export const ROW_COUNT = 6;

// 한 단어의 자모(글자) 개수. 사용자가 설정으로 바꿀 수 있다.
export const DEFAULT_LETTER_COUNT = 5;
export const MIN_LETTER_COUNT = 2;
export const MAX_LETTER_COUNT = 8;

const LETTER_COUNT_KEY = "wordle-letter-count";

/** 설정에 저장된 글자 수를 읽어온다. (범위를 벗어나면 기본값) */
export const getLetterCountLS = (): number => {
  const v = parseInt(localStorage.getItem(LETTER_COUNT_KEY) ?? "", 10);
  if (Number.isNaN(v) || v < MIN_LETTER_COUNT || v > MAX_LETTER_COUNT) {
    return DEFAULT_LETTER_COUNT;
  }
  return v;
};

export const setLetterCountLS = (n: number): void => {
  localStorage.setItem(LETTER_COUNT_KEY, String(n));
};
