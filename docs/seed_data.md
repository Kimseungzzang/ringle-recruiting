# 시드 데이터

`bin/rails db:seed`(`db/seeds.rb`)로 생성되는 카탈로그 데이터입니다. 데모 계정은
[README 1.4 데모 계정](../README.md#14-데모-계정)에 별도로 정리되어 있습니다.

## 권한(permissions)

| name | 설명 |
|---|---|
| `study` | 학습 자료를 따라 AI와 학습 |
| `converse` | AI와 자유 대화 |
| `analyze` | AI와 나눈 대화 기반 레벨 분석 |

## 언어(locales)

| name | 설명 |
|---|---|
| `ko` | 한국어 |
| `eng` | 영어 |

## 멤버십(memberships)

| name | 권한 | 기간 | 가격 |
|---|---|---|---|
| 베이직 | 학습 | 30일 | 129,000원 |
| 프리미엄 | 학습 + 대화 + 분석 | 60일 | 219,000원 |

## 학습 주제(topics)

| id 순서 | 제목 | title_en |
|---|---|---|
| 1 | 자기소개하기 | Introducing One's Name and Role at Work |
| 2 | 이메일로 일정 조율하기 | Scheduling a Meeting by Email |
| 3 | 회의에서 의견 제시하기 | Sharing Your Opinion in a Meeting |
| 4 | 프레젠테이션으로 성과 공유하기 | Presenting Results to Your Team |
| 5 | 네트워킹 행사에서 스몰토크하기 | Small Talk at a Networking Event |

각 주제는 문단(topic_paragraphs) 2개씩을 가지며, 문단마다 한국어/영어 번역
(topic_paragraph_translations)이 매핑되어 있습니다.