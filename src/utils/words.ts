import Hangul from "hangul-js";

// 키보드로 입력 가능한 자모 (shift 가 필요한 쌍자음/이중모음 제외)
export const VALID_LETTERS = [
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

const VALID_LETTER_SET = new Set(VALID_LETTERS);

// 정답 후보 단어 목록 (실제 한국어 명사).
// 자모 길이는 런타임에 hangul-js 로 계산해 길이별 버킷에 담는다.
const RAW_WORDS: string[] = [
  // 2 자모 (받침 없는 한 글자)
  "소", "수", "코", "차", "초", "키", "피", "새", "개", "배",
  "비", "파", "도", "두", "기", "가", "고", "오", "우", "이",
  "해", "게", "메", "베", "시", "지", "리", "미", "니", "디",
  "티", "채", "표",
  // 3 자모 (받침 있는 한 글자)
  "강", "산", "물", "불", "별", "달", "말", "발", "손", "밤",
  "봄", "춤", "공", "곰", "콩", "방", "밥", "옷", "입", "집",
  "잠", "줄", "길", "글", "곳", "문", "눈", "님", "남", "힘",
  "감", "검", "돈", "동", "등", "정", "총", "층", "통", "탑",
  "팔", "벌", "범", "벽", "병", "복", "분", "빛", "책", "컵",
  "색", "빗", "칼", "종", "상", "창", "청", "풀", "숲", "섬",
  "침", "짐", "답", "톱", "봉", "향",
  // 4 자모 (받침 없는 두 글자)
  "나무", "바다", "하루", "다리", "허리", "머리", "보리", "노래", "기차", "사자",
  "가구", "가수", "도시", "두부", "고기", "고래", "거리", "오리", "우비", "지구",
  "지도", "유리", "이마", "치마", "포도", "비누", "마차", "차표", "버스", "휴지",
  "휴가", "수도", "수리", "부모", "주소", "모자", "구두", "가시", "고추", "부추",
  "우유", "두유", "하마", "노루", "여우", "매미", "거미", "나비", "개미", "메기",
  "가지", "호두", "대추", "가루", "가래", "미소", "미래", "노트", "카드", "머루",
  "다래", "가마", "보배", "모래", "보라", "자유", "거지", "누나", "마디", "마루",
  "모기", "바보", "바지", "보호", "시소", "자두", "주가", "표지", "두루",
  // 5 자모 (받침 있는 두 글자 — 기본 길이)
  "사람", "마음", "가방", "수박", "우산", "시간", "사진", "라면", "바람", "구슬",
  "가을", "거품", "다음", "가족", "모습", "무릎", "바닥", "자석", "지갑", "거실",
  "도장", "시골", "자랑", "보석", "수염", "미술", "기름", "두통", "그늘", "그림",
  "구름", "이불", "사슴", "그물", "거울", "가위", "바위", "다발", "가슴", "무덤",
  "사탕", "노을", "구멍", "시집", "보름", "미역", "바늘", "거북", "고집", "마술",
  "비밀", "소금", "수첩", "자갈", "거짓", "노름", "부엌",
  // 6 자모 (세 글자)
  "다리미", "사다리", "고구마", "가로수", "바구니", "주머니", "이야기", "아버지", "어머니", "기러기",
  "무지개", "도라지", "두루미", "고사리", "미나리", "오소리", "다시마", "가오리", "도토리", "지우개",
  "소나기", "너구리", "두더지", "바가지", "보조개", "소쿠리", "지하수", "가마니", "거머리", "너스레",
  // 7 자모
  "자동차", "고무줄", "비행기", "할머니", "주전자", "무더위", "아우성", "어린이", "고무신", "자전거",
  "호랑이", "도마뱀", "오두막", "강아지", "병아리", "송아지", "잠자리", "감나무", "지렁이", "거북이",
  "고드름", "물고기", "불고기", "별자리", "갈매기",
  // 8 자모
  "보름달", "민들레", "진달래", "달팽이", "손가락", "발가락", "눈사람", "밤하늘", "도서관", "다람쥐",
  "어묵국", "자물쇠", "무화과", "코스모스", "아카시아", "도시가스"
];

export interface WordBuckets {
  [length: number]: string[];
}

const isTypeable = (word: string): boolean => {
  if (!Hangul.isCompleteAll(word)) {
    return false;
  }
  return Hangul.disassemble(word).every(letter => VALID_LETTER_SET.has(letter));
};

let cachedBuckets: WordBuckets | null = null;

/** 입력 가능한 단어만 골라 자모 길이별 버킷에 담아 반환 */
export const getWordBuckets = (): WordBuckets => {
  if (cachedBuckets) {
    return cachedBuckets;
  }

  const buckets: WordBuckets = {};
  const seen = new Set<string>();

  RAW_WORDS.forEach(word => {
    if (seen.has(word) || !isTypeable(word)) {
      return;
    }
    seen.add(word);
    const len = Hangul.disassemble(word).length;
    (buckets[len] = buckets[len] ?? []).push(word);
  });

  cachedBuckets = buckets;
  return buckets;
};

/** 정답으로 쓸 수 있을 만큼(=min 개 이상) 단어가 있는 자모 길이 목록 */
export const getAvailableLengths = (min: number = 10): number[] => {
  const buckets = getWordBuckets();
  return Object.keys(buckets)
    .map(Number)
    .filter(len => buckets[len].length >= min)
    .sort((a, b) => a - b);
};

/** 주어진 자모 길이의 무작위 정답 (무한 모드) */
export const getRandomWord = (letterCount: number): string => {
  const list = getWordBuckets()[letterCount] ?? [];
  if (list.length === 0) {
    return "";
  }
  return list[Math.floor(Math.random() * list.length)];
};

/** seed(보통 날짜) 로 결정되는 정답 (노말/오늘의 워들) */
export const getDailyWord = (letterCount: number, seed: number): string => {
  const list = getWordBuckets()[letterCount] ?? [];
  if (list.length === 0) {
    return "";
  }
  const idx = ((seed % list.length) + list.length) % list.length;
  return list[idx];
};
