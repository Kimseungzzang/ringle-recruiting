import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
  // 전역 `localStorage`는 Node 22+의 실험적 내장 구현과 충돌할 수 있어
  // jsdom의 window.localStorage를 명시적으로 사용.
  window.localStorage.clear();
});
